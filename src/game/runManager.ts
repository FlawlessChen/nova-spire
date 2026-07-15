import type { RunState, MapNode, NodeType } from '@/types/run';
import type { CombatConfig } from '@/game/combatEngine';
import { SeededRNG } from '@/core/rng';
import { generateMap, type MapGenConfig } from '@/game/mapGenerator';
import { ENCOUNTERS } from '@/data/encounters';
import { STARTING_DECK } from '@/data/cards';

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

// Cards that can appear as battle rewards (everything except the basic
// starting cards — the deck grows with more interesting options).
export const REWARD_POOL: string[] = [
  'poisonStab', 'cleave', 'ironWave', 'flex', 'quickDraw',
  'intimidate', 'secondWind', 'heavyBlow', 'shrugItOff',
];

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
  static newRun(seed: number, mapConfig?: MapGenConfig): RunManager {
    const rng = new SeededRNG(seed);
    const map = generateMap(rng, mapConfig);
    const state: RunState = {
      seed,
      rngState: rng.getState(),
      phase: 'map',
      map,
      currentNodeId: null,
      visitedNodeIds: [],
      playerHp: PLAYER_MAX_HP,
      playerMaxHp: PLAYER_MAX_HP,
      deck: STARTING_DECK.slice(),
      gold: 0,
      nodesCleared: 0,
      pendingReward: null,
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
    this.state.gold += this.currentNode()?.type === 'elite' ? 25 : 15;

    if (this.currentNode()?.type === 'boss') {
      this.state.phase = 'won';
      this.sync();
      return;
    }

    // offer a card reward
    this.state.pendingReward = this.rollReward();
    this.state.phase = 'reward';
    this.sync();
  }

  // ── rewards ──
  private rollReward(): string[] {
    const pool = this.rng.shuffle(REWARD_POOL);
    return pool.slice(0, Math.min(REWARD_CHOICES, pool.length));
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
