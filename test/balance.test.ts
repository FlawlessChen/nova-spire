import { describe, it, expect } from 'vitest';
import { RunManager } from '@/game/runManager';
import { CombatEngine } from '@/game/combatEngine';
import { RelicEngine } from '@/game/relicEngine';
import { CARDS } from '@/data/cards';

// Balance regression: auto-play full runs with a simple heuristic pilot and
// assert the winrate stays inside the design band. This catches accidental
// difficulty swings from data edits (enemy hp/damage, card values, heals).
//
// The pilot: block when lethal damage is telegraphed, otherwise attack; prefer
// campfires when hurt; prefer attack-card rewards. A human plays better, so
// the human winrate sits above this floor.

function autoCombat(mgr: RunManager): { won: boolean; hp: number } {
  const engine = new CombatEngine(mgr.combatConfigForCurrentNode());
  const relics = new RelicEngine(engine, mgr.state.relics);
  relics.attach(engine.bus);
  engine.start();
  let guard = 0;
  while (engine.state.outcome === 'ongoing' && guard++ < 3000) {
    const s = engine.state;
    const incoming = s.enemies.reduce((sum, e) => {
      const dmg = (e.nextMove?.intents ?? []).reduce(
        (a, i) => a + (i.kind === 'dealDamage' ? (i.value ?? 0) : 0),
        0,
      );
      return sum + dmg;
    }, 0);
    const playable = s.hand.filter((c) => engine.canPlay(c));
    if (playable.length === 0) {
      engine.endTurn();
      continue;
    }
    const needBlock = incoming > s.player.block;
    const pick =
      (needBlock &&
        playable.find((c) => CARDS[c.definitionId].effects.some((e) => e.kind === 'gainBlock'))) ||
      playable.find((c) => CARDS[c.definitionId].effects.some((e) => e.kind === 'dealDamage')) ||
      playable[0];
    engine.playCard(pick.instanceId, s.enemies[0]?.entityId);
  }
  relics.detach();
  return { won: engine.state.outcome === 'victory', hp: engine.state.player.hp };
}

function autoRun(seed: number): 'won' | 'lost' {
  const mgr = RunManager.newRun(seed);
  let steps = 0;
  while (!mgr.isOver() && steps++ < 300) {
    const phase = mgr.state.phase;
    if (phase === 'map') {
      const opts = mgr.availableNodes();
      const hurt = mgr.state.playerHp < mgr.state.playerMaxHp * 0.5;
      const pick =
        (hurt && opts.find((n) => n.type === 'campfire')) ||
        opts.find((n) => n.type === 'battle') ||
        opts[0];
      mgr.enterNode(pick.id);
    } else if (phase === 'combat') {
      const r = autoCombat(mgr);
      mgr.resolveCombat(r.won, r.hp);
    } else if (phase === 'reward') {
      const choices = mgr.state.pendingReward ?? [];
      const atk = choices.find((id) => CARDS[id].type === 'attack');
      mgr.chooseReward(atk ?? choices[0] ?? null);
    } else if (phase === 'campfire') {
      mgr.restAtCampfire();
    }
  }
  return mgr.state.phase === 'won' ? 'won' : 'lost';
}

describe('balance regression', () => {
  it('keeps the heuristic-pilot winrate inside the design band (30%–80%)', () => {
    // 60 seeds keeps the test fast (~2s) while the band is wide enough to be
    // stable; the tuning reference is 200 seeds ≈ 57%.
    const N = 60;
    let wins = 0;
    for (let seed = 1; seed <= N; seed++) {
      if (autoRun(seed * 7919) === 'won') wins++;
    }
    const winrate = wins / N;
    expect(winrate).toBeGreaterThanOrEqual(0.3);
    expect(winrate).toBeLessThanOrEqual(0.8);
  });
});
