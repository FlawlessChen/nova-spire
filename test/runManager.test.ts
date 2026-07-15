import { describe, it, expect } from 'vitest';
import { RunManager } from '@/game/runManager';
import { CombatEngine } from '@/game/combatEngine';
import { RELIC_POOL } from '@/data/relics';
import type { RunState } from '@/types/run';

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
    }
  }
}

describe('RunManager', () => {
  it('starts on the map with entry nodes available', () => {
    const mgr = RunManager.newRun(1);
    expect(mgr.state.phase).toBe('map');
    expect(mgr.availableNodes().length).toBeGreaterThan(0);
    expect(mgr.state.deck.length).toBe(10); // starting deck
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

  it('drops a relic when an elite is defeated', () => {
    const mgr = RunManager.newRun(1);
    // force an elite context: enter any battle node, then pretend it's an elite
    const node = mgr.availableNodes()[0];
    mgr.enterNode(node.id);
    mgr.state.map.nodes[node.id].type = 'elite';
    mgr.resolveCombat(true, 50);
    expect(mgr.state.relics.length).toBe(1);
    expect(mgr.state.pendingRelic).toBe(mgr.state.relics[0]);
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
