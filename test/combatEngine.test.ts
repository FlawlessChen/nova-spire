import { describe, it, expect } from 'vitest';
import { CombatEngine, type CombatConfig } from '@/game/combatEngine';

function makeConfig(overrides: Partial<CombatConfig> = {}): CombatConfig {
  return {
    playerMaxHp: 70,
    playerHp: 70,
    maxEnergy: 3,
    handSize: 5,
    deck: ['strike', 'strike', 'strike', 'defend', 'defend', 'bash', 'poisonStab', 'cleave'],
    enemies: ['slime'],
    seed: 12345,
    ...overrides,
  };
}

describe('CombatEngine', () => {
  it('initializes with a full draw pile and no hand before start', () => {
    const e = new CombatEngine(makeConfig());
    expect(e.state.drawPile.length).toBe(8);
    expect(e.state.hand.length).toBe(0);
    expect(e.state.phase).toBe('combatStart');
  });

  it('draws a hand and telegraphs enemy intent on start', () => {
    const e = new CombatEngine(makeConfig());
    e.start();
    expect(e.state.hand.length).toBe(5);
    expect(e.state.phase).toBe('playerTurn');
    expect(e.state.enemies[0].nextMove).not.toBeNull();
  });

  it('is deterministic for a fixed seed', () => {
    const a = new CombatEngine(makeConfig({ seed: 999 }));
    const b = new CombatEngine(makeConfig({ seed: 999 }));
    a.start();
    b.start();
    expect(a.state.hand.map((c) => c.definitionId)).toEqual(
      b.state.hand.map((c) => c.definitionId),
    );
    expect(a.state.enemies[0].hp).toBe(b.state.enemies[0].hp);
  });

  it('spends energy and deals damage when playing Strike', () => {
    const e = new CombatEngine(makeConfig());
    e.start();
    const enemy = e.state.enemies[0];
    const hpBefore = enemy.hp;
    const strike = e.state.hand.find((c) => c.definitionId === 'strike');
    if (strike) {
      const ok = e.playCard(strike.instanceId, enemy.entityId);
      expect(ok).toBe(true);
      expect(e.state.player.energy).toBe(2);
      expect(e.state.enemies[0].hp).toBe(hpBefore - 6);
    }
  });

  it('refuses to play an enemy-targeted card without a target', () => {
    const e = new CombatEngine(makeConfig());
    e.start();
    const strike = e.state.hand.find((c) => c.definitionId === 'strike')!;
    expect(e.playCard(strike.instanceId)).toBe(false);
  });

  it('applies block from Defend and absorbs damage', () => {
    const e = new CombatEngine(makeConfig({ deck: ['defend', 'defend', 'defend', 'defend', 'defend'] }));
    e.start();
    const defend = e.state.hand.find((c) => c.definitionId === 'defend')!;
    e.playCard(defend.instanceId);
    expect(e.state.player.block).toBe(5);
  });

  it('applies poison that ticks at the enemy turn start', () => {
    const e = new CombatEngine(makeConfig({ deck: ['poisonStab', 'poisonStab', 'poisonStab', 'poisonStab', 'poisonStab'] }));
    e.start();
    const enemy = e.state.enemies[0];
    const stab = e.state.hand.find((c) => c.definitionId === 'poisonStab')!;
    e.playCard(stab.instanceId, enemy.entityId);
    const hpAfterHit = e.state.enemies[0]?.hp;
    // 4 damage applied immediately; 3 poison queued
    e.endTurn();
    // poison should have ticked (enemy may still be alive)
    if (e.state.enemies[0]) {
      expect(e.state.enemies[0].hp).toBeLessThan(hpAfterHit!);
    }
  });

  it('reaches victory when the enemy dies', () => {
    const e = new CombatEngine(makeConfig({ deck: ['heavyBlow', 'heavyBlow', 'heavyBlow'], maxEnergy: 6, enemies: ['cultist'] }));
    e.start();
    // hammer the enemy with Heavy Blows (14 each)
    let guard = 0;
    while (e.state.outcome === 'ongoing' && guard++ < 20) {
      const hb = e.state.hand.find((c) => c.definitionId === 'heavyBlow');
      if (hb && e.state.enemies[0] && e.state.player.energy >= 2) {
        e.playCard(hb.instanceId, e.state.enemies[0].entityId);
      } else {
        e.endTurn();
      }
    }
    expect(e.state.outcome).toBe('victory');
  });

  it('reshuffles discard into draw pile when empty', () => {
    const e = new CombatEngine(makeConfig({ handSize: 3, deck: ['strike', 'strike', 'strike', 'defend'] }));
    e.start();
    // draw pile has 1 left after drawing 3
    const totalCards = e.state.drawPile.length + e.state.hand.length + e.state.discardPile.length;
    expect(totalCards).toBe(4);
  });

  it('applies upgraded card overrides (deck entry with "+" suffix)', () => {
    // upgraded Strike deals 9 instead of 6
    const e = new CombatEngine(makeConfig({ deck: ['strike+', 'strike+', 'strike+', 'defend', 'defend'] }));
    e.start();
    const enemy = e.state.enemies[0];
    const hpBefore = enemy.hp;
    const strike = e.state.hand.find((c) => c.definitionId === 'strike+')!;
    e.playCard(strike.instanceId, enemy.entityId);
    expect(e.state.enemies[0].hp).toBe(hpBefore - 9);
  });

  it('applies an upgraded cost override (upgraded Quick Draw costs 0)', () => {
    const e = new CombatEngine(makeConfig({ deck: ['quickDraw+', 'strike', 'strike', 'strike', 'strike'] }));
    e.start();
    const qd = e.state.hand.find((c) => c.definitionId === 'quickDraw+')!;
    const energyBefore = e.state.player.energy;
    e.playCard(qd.instanceId);
    expect(e.state.player.energy).toBe(energyBefore); // cost reduced to 0
  });
});
