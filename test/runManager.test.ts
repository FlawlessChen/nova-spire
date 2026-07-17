import { describe, it, expect } from 'vitest';
import { RunManager } from '@/game/runManager';
import { CombatEngine } from '@/game/combatEngine';
import { RELIC_POOL } from '@/data/relics';
import type { RunState } from '@/types/run';
import { EVENTS } from '@/data/events';

// RunManager: the journey FSM. The headline test drives a WHOLE run to a boss
// kill using the real CombatEngine for every battle — proving the run layer and
// combat layer compose into a completable game.

// Play out one combat to its outcome with a dead-simple auto-pilot: play the
// highest-impact affordable card each step, else end the turn. Returns the
// engine so the caller can read final HP / outcome.
function autoPlayCombat(engine: CombatEngine): CombatEngine {
  engine.start();
  let guard = 0;
  while (engine.state.outcome === 'ongoing' && guard++ < 2000) {
    const hand = engine.state.hand;
    // find any playable card
    const playable = hand.find((c) => engine.canPlay(c));
    if (!playable) {
      engine.endTurn();
      continue;
    }
    // target the first living enemy for enemy-targeted cards
    const enemy = engine.state.enemies[0];
    engine.playCard(playable.instanceId, enemy?.entityId);
  }
  return engine;
}

// Advance the run from 'map' by always taking the first available node.
function stepThroughRun(mgr: RunManager, maxSteps = 200): void {
  let steps = 0;
  while (!mgr.isOver() && steps++ < maxSteps) {
    switch (mgr.state.phase) {
      case 'map': {
        const options = mgr.availableNodes();
        if (options.length === 0) return; // dead end (shouldn't happen)
        mgr.enterNode(options[0].id);
        break;
      }
      case 'combat': {
        const engine = new CombatEngine(mgr.combatConfigForCurrentNode());
        autoPlayCombat(engine);
        const won = engine.state.outcome === 'victory';
        mgr.resolveCombat(won, engine.state.player.hp);
        if (!won) return;
        break;
      }
      case 'reward':
        // always take the first offered card
        mgr.chooseReward(mgr.state.pendingReward?.[0] ?? null);
        break;
      case 'campfire':
        mgr.restAtCampfire();
        break;
      case 'shop':
        mgr.leaveShop();
        break;
      case 'event': {
        const eventId = mgr.state.pendingEventId!;
        mgr.chooseEvent(EVENTS[eventId].choices[0].id);
        break;
      }
    }
  }
}

describe('RunManager', () => {
  it('enters and resolves a seeded event choice', () => {
    const mgr = RunManager.newRun(41);
    const node = Object.values(mgr.state.map.nodes).find((n) => n.type === 'event');
    expect(node).toBeTruthy();
    if (!node) return;
    mgr.state.map.entryNodeIds = [node.id];
    mgr.state.currentNodeId = null;
    mgr.state.phase = 'map';
    const hp = mgr.state.playerHp;
    expect(mgr.enterNode(node.id)).toBe(true);
    expect(mgr.state.phase).toBe('event');
    const event = EVENTS[mgr.state.pendingEventId!];
    expect(event).toBeTruthy();
    expect(mgr.chooseEvent(event.choices[0].id)).toBe(true);
    expect(mgr.state.phase).toBe('map');
    expect(mgr.state.pendingEventId).toBeNull();
    expect(mgr.state.nodesCleared).toBe(1);
    expect(mgr.state.playerHp).toBeLessThanOrEqual(hp);
  });

  it('rejects an unknown event choice without mutating progress', () => {
    const mgr = RunManager.newRun(1);
    mgr.state.phase = 'event';
    mgr.state.pendingEventId = 'novaShrine';
    expect(mgr.chooseEvent('missing')).toBe(false);
    expect(mgr.state.phase).toBe('event');
    expect(mgr.state.nodesCleared).toBe(0);
  });

  it('starts on the map with entry nodes available', () => {
    const mgr = RunManager.newRun(1);
    expect(mgr.state.phase).toBe('map');
    expect(mgr.availableNodes().length).toBeGreaterThan(0);
    expect(mgr.state.deck.length).toBe(10); // starting deck
  });

  it('applies the chosen hero path: starting deck + signature relic', () => {
    const tox = RunManager.newRun(1, 'toxicologist');
    expect(tox.state.pathId).toBe('toxicologist');
    expect(tox.state.deck.length).toBe(10);
    expect(tox.state.deck).toContain('poisonStab');
    expect(tox.state.relics).toContain('catalyst');

    const bul = RunManager.newRun(1, 'bulwark');
    expect(bul.state.relics).toContain('bronzeScales');
    expect(bul.state.deck).toContain('ironclad');
  });

  it('falls back to the default path for an unknown path id', () => {
    const mgr = RunManager.newRun(1, 'nonsense');
    expect(mgr.state.pathId).toBe('berserker'); // DEFAULT_PATH_ID
    expect(mgr.state.deck.length).toBe(10);
  });

  it('biases rewards toward the chosen path (statistical)', () => {
    // Toxicologist weights poisonStab/toxicShiv heavily; over many rolls they
    // should appear far more often than the ~10% baseline of an off-path card.
    let toxinHits = 0;
    let samples = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const mgr = RunManager.newRun(seed, 'toxicologist');
      const node = mgr.availableNodes().find((n) => n.type === 'battle') ?? mgr.availableNodes()[0];
      mgr.enterNode(node.id);
      mgr.resolveCombat(true, 60);
      const reward = mgr.state.pendingReward ?? [];
      samples += reward.length;
      toxinHits += reward.filter((id) => id === 'poisonStab' || id === 'toxicShiv').length;
    }
    expect(toxinHits / samples).toBeGreaterThan(0.2);
  });

  it('only lets you enter reachable nodes', () => {
    const mgr = RunManager.newRun(1);
    // a boss node is never reachable from the start
    expect(mgr.enterNode('n-boss')).toBe(false);
    const first = mgr.availableNodes()[0];
    expect(mgr.enterNode(first.id)).toBe(true);
  });

  it('enters combat and hands out a valid combat config', () => {
    const mgr = RunManager.newRun(1);
    const node = mgr.availableNodes().find((n) => n.type !== 'campfire')!;
    mgr.enterNode(node.id);
    expect(mgr.state.phase).toBe('combat');
    const config = mgr.combatConfigForCurrentNode();
    expect(config.enemies.length).toBeGreaterThan(0);
    expect(config.deck.length).toBe(10);
    expect(config.playerHp).toBe(70);
  });

  it('offers a card reward after winning a normal battle and grows the deck', () => {
    const mgr = RunManager.newRun(1);
    const node = mgr.availableNodes().find((n) => n.type === 'battle')!;
    mgr.enterNode(node.id);
    mgr.resolveCombat(true, 55); // pretend we won with 55 hp
    expect(mgr.state.phase).toBe('reward');
    expect(mgr.state.pendingReward!.length).toBeGreaterThan(0);
    const before = mgr.state.deck.length;
    mgr.chooseReward(mgr.state.pendingReward![0]);
    expect(mgr.state.deck.length).toBe(before + 1);
    expect(mgr.state.phase).toBe('map');
    expect(mgr.state.playerHp).toBe(55); // hp carried over
  });

  it('lets you skip a reward without growing the deck', () => {
    const mgr = RunManager.newRun(1);
    const node = mgr.availableNodes().find((n) => n.type === 'battle')!;
    mgr.enterNode(node.id);
    mgr.resolveCombat(true, 60);
    const before = mgr.state.deck.length;
    mgr.chooseReward(null);
    expect(mgr.state.deck.length).toBe(before);
    expect(mgr.state.phase).toBe('map');
  });

  it('heals at a campfire but never above max hp', () => {
    const mgr = RunManager.newRun(1);
    mgr.state.playerHp = 40;
    // fabricate a campfire entry: find one somewhere and walk to it isn't
    // guaranteed, so test the transition directly by forcing phase
    mgr.state.phase = 'campfire';
    mgr.restAtCampfire();
    expect(mgr.state.playerHp).toBeGreaterThan(40);
    expect(mgr.state.playerHp).toBeLessThanOrEqual(mgr.state.playerMaxHp);
    expect(mgr.state.phase).toBe('map');
  });

  it('ends the run on a combat loss', () => {
    const mgr = RunManager.newRun(1);
    const node = mgr.availableNodes()[0];
    mgr.enterNode(node.id);
    mgr.resolveCombat(false, 0);
    expect(mgr.state.phase).toBe('lost');
    expect(mgr.isOver()).toBe(true);
  });

  it('drives a full run to a boss victory with the real combat engine', () => {
    // A strong deck so the auto-pilot reliably clears every fight; the point of
    // this test is the RUN composing end-to-end, not combat difficulty.
    const mgr = RunManager.newRun(4242);
    mgr.state.deck = Array(12).fill('heavyBlow').concat(Array(6).fill('defend'));
    mgr.state.playerMaxHp = 500;
    mgr.state.playerHp = 500;

    stepThroughRun(mgr);

    expect(mgr.state.phase).toBe('won');
    expect(mgr.isOver()).toBe(true);
    // the boss node was the last one visited
    expect(mgr.state.map.nodes[mgr.state.visitedNodeIds.at(-1)!].type).toBe('boss');
  });

  it('notifies change listeners on every transition', () => {
    const mgr = RunManager.newRun(1);
    let count = 0;
    let last: RunState | null = null;
    mgr.onChange((s) => {
      count++;
      last = s;
    });
    const node = mgr.availableNodes()[0];
    mgr.enterNode(node.id);
    expect(count).toBeGreaterThan(0);
    expect(last).not.toBeNull();
  });

  it('upgrades a card at a campfire (appends "+" to that deck slot)', () => {
    const mgr = RunManager.newRun(1, 'berserker');
    mgr.state.phase = 'campfire';
    const idx = mgr.state.deck.findIndex((e) => e === 'strike');
    expect(idx).toBeGreaterThanOrEqual(0);
    mgr.upgradeCardAtCampfire(idx);
    expect(mgr.state.deck[idx]).toBe('strike+');
    expect(mgr.state.phase).toBe('map');
    // an upgraded card can't be upgraded again
    expect(mgr.upgradeableCards()).not.toContain('strike+');
  });

  it('campfire rest and upgrade are mutually exclusive per visit', () => {
    const mgr = RunManager.newRun(1, 'berserker');
    mgr.state.phase = 'campfire';
    mgr.state.playerHp = 40;
    mgr.restAtCampfire();
    expect(mgr.state.phase).toBe('map');
    // upgrade after resting is a no-op (no longer at a campfire)
    const before = mgr.state.deck.slice();
    mgr.upgradeCardAtCampfire(0);
    expect(mgr.state.deck).toEqual(before);
  });

  it('rolls a shop inventory when entering a shop node', () => {
    // find a seed whose first-layer choice can reach a shop quickly, else just
    // force the transition by locating a shop node and driving into it.
    const mgr = RunManager.newRun(5, 'berserker');
    const shopNode = Object.values(mgr.state.map.nodes).find((n) => n.type === 'shop');
    if (!shopNode) return; // generator presence is covered elsewhere
    // Make the shop node an entry so we can enter it directly this test.
    mgr.state.map.entryNodeIds = [shopNode.id];
    mgr.state.currentNodeId = null;
    mgr.state.phase = 'map';
    mgr.state.map.nodes[shopNode.id].layer = 0;
    expect(mgr.enterNode(shopNode.id)).toBe(true);
    expect(mgr.state.phase).toBe('shop');
    expect(mgr.state.shop).not.toBeNull();
    expect(mgr.state.shop!.cards.length).toBeGreaterThan(0);
  });

  it('buys a card, spends gold, and grows the deck', () => {
    const mgr = RunManager.newRun(3, 'berserker');
    mgr.state.phase = 'shop';
    mgr.state.gold = 500;
    mgr.state.shop = {
      cards: [{ id: 'heavyBlow', price: 65, sold: false }],
      relics: [],
      removalPrice: 60,
      removalUsed: false,
    };
    const deckBefore = mgr.state.deck.length;
    expect(mgr.buyCard(0)).toBe(true);
    expect(mgr.state.gold).toBe(435);
    expect(mgr.state.deck.length).toBe(deckBefore + 1);
    expect(mgr.state.deck).toContain('heavyBlow');
    // can't buy again (sold)
    expect(mgr.buyCard(0)).toBe(false);
  });

  it('refuses a purchase without enough gold', () => {
    const mgr = RunManager.newRun(3, 'berserker');
    mgr.state.phase = 'shop';
    mgr.state.gold = 10;
    mgr.state.shop = { cards: [{ id: 'heavyBlow', price: 65, sold: false }], relics: [], removalPrice: 60, removalUsed: false };
    expect(mgr.buyCard(0)).toBe(false);
    expect(mgr.state.gold).toBe(10);
  });

  it('buys a relic and grants it', () => {
    const mgr = RunManager.newRun(3, 'toxicologist');
    mgr.state.phase = 'shop';
    mgr.state.gold = 500;
    mgr.state.shop = { cards: [], relics: [{ id: 'lantern', price: 130, sold: false }], removalPrice: 60, removalUsed: false };
    expect(mgr.buyRelic(0)).toBe(true);
    expect(mgr.state.relics).toContain('lantern');
    expect(mgr.state.gold).toBe(370);
  });

  it('removes a card once per shop, never emptying the deck', () => {
    const mgr = RunManager.newRun(3, 'berserker');
    mgr.state.phase = 'shop';
    mgr.state.gold = 500;
    mgr.state.shop = { cards: [], relics: [], removalPrice: 60, removalUsed: false };
    const len = mgr.state.deck.length;
    expect(mgr.removeCard(0)).toBe(true);
    expect(mgr.state.deck.length).toBe(len - 1);
    expect(mgr.state.gold).toBe(440);
    // removal is one-time per shop
    expect(mgr.removeCard(0)).toBe(false);
  });

  it('leaving a shop returns to the map and clears stock', () => {
    const mgr = RunManager.newRun(3, 'berserker');
    mgr.state.phase = 'shop';
    mgr.state.shop = { cards: [], relics: [], removalPrice: 60, removalUsed: false };
    mgr.leaveShop();
    expect(mgr.state.phase).toBe('map');
    expect(mgr.state.shop).toBeNull();
  });

  it('drops a relic when an elite is defeated', () => {
    const mgr = RunManager.newRun(1);
    const relicsBefore = mgr.state.relics.length; // path may grant a starting relic
    // force an elite context: enter any battle node, then pretend it's an elite
    const node = mgr.availableNodes()[0];
    mgr.enterNode(node.id);
    mgr.state.map.nodes[node.id].type = 'elite';
    mgr.resolveCombat(true, 50);
    expect(mgr.state.relics.length).toBe(relicsBefore + 1);
    expect(mgr.state.pendingRelic).toBe(mgr.state.relics[mgr.state.relics.length - 1]);
  });

  it('never drops a duplicate relic', () => {
    const mgr = RunManager.newRun(2);
    const node = mgr.availableNodes()[0];
    mgr.enterNode(node.id);
    mgr.state.map.nodes[node.id].type = 'elite';
    // pre-own every relic except one
    mgr.state.relics = RELIC_POOL.slice(0, -1);
    mgr.resolveCombat(true, 50);
    const last = RELIC_POOL[RELIC_POOL.length - 1];
    expect(mgr.state.relics.filter((r) => r === last).length).toBe(1);
    // owning ALL relics -> no drop, no crash
    const mgr2 = RunManager.newRun(3);
    const node2 = mgr2.availableNodes()[0];
    mgr2.enterNode(node2.id);
    mgr2.state.map.nodes[node2.id].type = 'elite';
    mgr2.state.relics = RELIC_POOL.slice();
    mgr2.resolveCombat(true, 50);
    expect(mgr2.state.relics.length).toBe(RELIC_POOL.length);
    expect(mgr2.state.pendingRelic).toBeNull();
  });
});
