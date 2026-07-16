import type { RunState, MapNode, NodeType, ShopInventory } from '@/types/run';
import type { CombatConfig } from '@/game/combatEngine';
import { SeededRNG } from '@/core/rng';
import { generateMap, type MapGenConfig } from '@/game/mapGenerator';
import { ENCOUNTERS } from '@/data/encounters';
import { STARTING_DECK, REWARD_POOL, CARDS } from '@/data/cards';
import { RELIC_POOL } from '@/data/relics';
import { PATHS, DEFAULT_PATH_ID } from '@/data/paths';
import { canUpgrade, upgradedId } from '@/data/cardUpgrade';

// RunManager: the journey FSM that sits above CombatEngine. It owns RunState
// transitions — generate map, enter a node, hand out a combat config, apply the
// battle result, offer card rewards, rest at campfires, advance to the boss.
//
// It is pure logic (no PixiJS) and deliberately does NOT run combat itself:
// the UI creates a CombatEngine from combatConfigForCurrentNode(), drives it,
// then calls resolveCombat(win) when the outcome lands. Persistence is injected
// via an onChange callback so this class never touches localStorage directly.

// Player run constants.
const PLAYER_MAX_HP = 70;
const MAX_ENERGY = 3;
const HAND_SIZE = 5;
const CAMPFIRE_HEAL_FRACTION = 0.3;
const REWARD_CHOICES = 3;

// Shop economics. Priced so a couple of good fights afford a card and a strong
// run can splurge on a relic. Removal is cheap enough to be a real option.
const SHOP_CARD_COUNT = 4;
const SHOP_RELIC_COUNT = 1;
const SHOP_CARD_PRICE = { common: 30, uncommon: 48, rare: 72 } as const;
const SHOP_RELIC_PRICE = 100;
const SHOP_REMOVAL_PRICE = 50;

// Re-export the reward pool (defined in the data layer) for convenience.
export { REWARD_POOL };

export type RunChangeListener = (state: RunState) => void;

export class RunManager {
  state: RunState;
  private rng: SeededRNG;
  private listeners: RunChangeListener[] = [];

  private constructor(state: RunState, rng: SeededRNG) {
    this.state = state;
    this.rng = rng;
  }

  // ── construction ──
  static newRun(seed: number, pathId: string = DEFAULT_PATH_ID, mapConfig?: MapGenConfig): RunManager {
    const rng = new SeededRNG(seed);
    const map = generateMap(rng, mapConfig);
    const path = PATHS[pathId];
    const state: RunState = {
      seed,
      rngState: rng.getState(),
      phase: 'map',
      pathId: path ? pathId : DEFAULT_PATH_ID,
      map,
      currentNodeId: null,
      visitedNodeIds: [],
      playerHp: PLAYER_MAX_HP,
      playerMaxHp: PLAYER_MAX_HP,
      deck: (path?.deck ?? STARTING_DECK).slice(),
      relics: (path?.relics ?? []).slice(),
      gold: 0,
      nodesCleared: 0,
      pendingReward: null,
      pendingRelic: null,
      shop: null,
      combatSeed: null,
    };
    const mgr = new RunManager(state, rng);
    mgr.sync();
    return mgr;
  }

  // Restore a run from a persisted RunState (RNG resumes at the saved state).
  static fromState(state: RunState): RunManager {
    const rng = new SeededRNG(state.seed);
    rng.setState(state.rngState);
    return new RunManager(state, rng);
  }

  onChange(fn: RunChangeListener): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  // Persist the live RNG state into the snapshot, then notify listeners. Called
  // after every mutation so a save taken at any moment resumes deterministically.
  private sync(): void {
    this.state.rngState = this.rng.getState();
    for (const fn of this.listeners.slice()) fn(this.state);
  }

  // ── map navigation ──
  /** Nodes the player may enter right now (reachable from the current node). */
  availableNodes(): MapNode[] {
    const { map, currentNodeId } = this.state;
    if (currentNodeId === null) return map.entryNodeIds.map((id) => map.nodes[id]);
    return map.nodes[currentNodeId].next.map((id) => map.nodes[id]);
  }

  /** Enter a node by id. Returns false if it isn't currently reachable. */
  enterNode(nodeId: string): boolean {
    if (this.state.phase !== 'map') return false;
    if (!this.availableNodes().some((n) => n.id === nodeId)) return false;

    const node = this.state.map.nodes[nodeId];
    this.state.currentNodeId = nodeId;
    this.state.visitedNodeIds.push(nodeId);

    if (node.type === 'campfire') {
      this.state.phase = 'campfire';
    } else if (node.type === 'shop') {
      this.state.phase = 'shop';
      this.state.shop = this.rollShop();
    } else {
      // battle / elite / boss → start combat
      this.state.phase = 'combat';
      this.state.combatSeed = this.rng.int(1, 0x7fffffff);
    }
    this.sync();
    return true;
  }

  // ── combat handoff ──
  /** Build the CombatConfig for the node the player is currently in. */
  combatConfigForCurrentNode(): CombatConfig {
    const node = this.currentNode();
    if (!node || node.encounterId === undefined) {
      throw new Error('combatConfigForCurrentNode called outside a combat node');
    }
    const encounter = ENCOUNTERS[node.encounterId];
    return {
      playerMaxHp: this.state.playerMaxHp,
      playerHp: this.state.playerHp,
      maxEnergy: MAX_ENERGY,
      handSize: HAND_SIZE,
      deck: this.state.deck.slice(),
      enemies: encounter.enemies.slice(),
      seed: this.state.combatSeed ?? this.state.seed,
    };
  }

  /**
   * Apply a finished combat. `won` = player survived; `playerHpAfter` carries
   * HP over between battles. On a win at a normal/elite node we offer card
   * rewards; the boss win clears the run; a loss ends it.
   */
  resolveCombat(won: boolean, playerHpAfter: number): void {
    if (this.state.phase !== 'combat') return;
    this.state.playerHp = Math.max(0, playerHpAfter);
    this.state.combatSeed = null;

    if (!won || this.state.playerHp <= 0) {
      this.state.phase = 'lost';
      this.sync();
      return;
    }

    this.state.nodesCleared += 1;
    const nodeType = this.currentNode()?.type;
    this.state.gold += nodeType === 'elite' ? 25 : 15;

    if (nodeType === 'boss') {
      this.state.phase = 'won';
      this.sync();
      return;
    }

    // elites drop a relic (auto-granted; pendingRelic lets the UI announce it)
    this.state.pendingRelic = null;
    if (nodeType === 'elite') {
      const relic = this.rollRelic();
      if (relic) {
        this.state.relics.push(relic);
        this.state.pendingRelic = relic;
      }
    }

    // offer a card reward
    this.state.pendingReward = this.rollReward();
    this.state.phase = 'reward';
    this.sync();
  }

  // ── rewards ──
  // Weighted sampling without replacement: cards favored by the current path
  // appear more often, but off-path cards (weight 1) can still show up.
  private rollReward(): string[] {
    const weights = PATHS[this.state.pathId]?.rewardWeights ?? {};
    const remaining = REWARD_POOL.map((id) => ({ id, weight: weights[id] ?? 1 }));
    const picks: string[] = [];
    const n = Math.min(REWARD_CHOICES, remaining.length);
    for (let i = 0; i < n; i++) {
      const chosen = this.rng.weightedPick(remaining.map((r) => ({ value: r.id, weight: r.weight })));
      picks.push(chosen);
      const idx = remaining.findIndex((r) => r.id === chosen);
      if (idx >= 0) remaining.splice(idx, 1); // no duplicates within one reward
    }
    return picks;
  }

  // Pick a relic the player doesn't already own, or null if they own them all.
  private rollRelic(): string | null {
    const owned = new Set(this.state.relics);
    const available = RELIC_POOL.filter((id) => !owned.has(id));
    if (available.length === 0) return null;
    return this.rng.pick(this.rng.shuffle(available));
  }

  /** Take a card from the pending reward (or skip with null). Advances to map. */
  chooseReward(cardId: string | null): void {
    if (this.state.phase !== 'reward') return;
    if (cardId !== null && this.state.pendingReward?.includes(cardId)) {
      this.state.deck.push(cardId);
    }
    this.state.pendingReward = null;
    this.state.phase = 'map';
    this.sync();
  }

  // ── campfire ──
  /** Rest: heal a fraction of max HP, then return to the map. */
  restAtCampfire(): void {
    if (this.state.phase !== 'campfire') return;
    const heal = Math.floor(this.state.playerMaxHp * CAMPFIRE_HEAL_FRACTION);
    this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + heal);
    this.state.nodesCleared += 1;
    this.state.phase = 'map';
    this.sync();
  }

  /** Deck entries (with duplicates) that can still be upgraded. */
  upgradeableCards(): string[] {
    return this.state.deck.filter((entry) => canUpgrade(entry));
  }

  /**
   * Upgrade one deck card at a campfire (alternative to resting). `deckIndex`
   * points into state.deck. No-ops if the card can't be upgraded. Advances to
   * the map like resting does.
   */
  upgradeCardAtCampfire(deckIndex: number): void {
    if (this.state.phase !== 'campfire') return;
    const entry = this.state.deck[deckIndex];
    const up = entry ? upgradedId(entry) : null;
    if (!up) return;
    this.state.deck[deckIndex] = up;
    this.state.nodesCleared += 1;
    this.state.phase = 'map';
    this.sync();
  }

  // ── shop ──
  // Roll a seeded inventory: a few cards from the reward pool (deduped) priced
  // by rarity, one relic the player doesn't own, plus a card-removal service.
  private rollShop(): ShopInventory {
    const cardPool = this.rng.shuffle(REWARD_POOL).slice(0, SHOP_CARD_COUNT);
    const cards = cardPool.map((id) => ({
      id,
      price: SHOP_CARD_PRICE[CARDS[id]?.rarity ?? 'common'],
      sold: false,
    }));

    const owned = new Set(this.state.relics);
    const relicChoices = this.rng.shuffle(RELIC_POOL.filter((id) => !owned.has(id))).slice(0, SHOP_RELIC_COUNT);
    const relics = relicChoices.map((id) => ({ id, price: SHOP_RELIC_PRICE, sold: false }));

    return { cards, relics, removalPrice: SHOP_REMOVAL_PRICE, removalUsed: false };
  }

  /** Buy card at shop index. No-op if not enough gold / already sold. */
  buyCard(index: number): boolean {
    const shop = this.state.shop;
    if (this.state.phase !== 'shop' || !shop) return false;
    const item = shop.cards[index];
    if (!item || item.sold || this.state.gold < item.price) return false;
    this.state.gold -= item.price;
    this.state.deck.push(item.id);
    item.sold = true;
    this.sync();
    return true;
  }

  /** Buy relic at shop index. Grants the relic immediately. */
  buyRelic(index: number): boolean {
    const shop = this.state.shop;
    if (this.state.phase !== 'shop' || !shop) return false;
    const item = shop.relics[index];
    if (!item || item.sold || this.state.gold < item.price) return false;
    if (this.state.relics.includes(item.id)) return false;
    this.state.gold -= item.price;
    this.state.relics.push(item.id);
    item.sold = true;
    this.sync();
    return true;
  }

  /** Pay to remove a deck card (one-time per shop). */
  removeCard(deckIndex: number): boolean {
    const shop = this.state.shop;
    if (this.state.phase !== 'shop' || !shop) return false;
    if (shop.removalUsed || this.state.gold < shop.removalPrice) return false;
    if (deckIndex < 0 || deckIndex >= this.state.deck.length) return false;
    if (this.state.deck.length <= 1) return false; // never empty the deck
    this.state.gold -= shop.removalPrice;
    this.state.deck.splice(deckIndex, 1);
    shop.removalUsed = true;
    this.sync();
    return true;
  }

  /** Leave the shop and return to the map. */
  leaveShop(): void {
    if (this.state.phase !== 'shop') return;
    this.state.shop = null;
    this.state.nodesCleared += 1;
    this.state.phase = 'map';
    this.sync();
  }

  // ── helpers ──
  currentNode(): MapNode | null {
    return this.state.currentNodeId ? this.state.map.nodes[this.state.currentNodeId] : null;
  }

  isOver(): boolean {
    return this.state.phase === 'won' || this.state.phase === 'lost';
  }

  nodeType(): NodeType | null {
    return this.currentNode()?.type ?? null;
  }
}
