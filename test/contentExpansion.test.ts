import { describe, expect, it } from 'vitest';
import { ENEMIES } from '@/data/enemies';
import { BATTLE_ENCOUNTERS, BOSS_ENCOUNTERS, ENCOUNTERS, ELITE_ENCOUNTERS } from '@/data/encounters';
import { SeededRNG } from '@/core/rng';
import { generateMap } from '@/game/mapGenerator';

describe('M12 content expansion', () => {
  it('keeps every encounter enemy backed by a complete data definition', () => {
    for (const encounter of [...BATTLE_ENCOUNTERS, ...ELITE_ENCOUNTERS, ...BOSS_ENCOUNTERS]) {
      expect(ENCOUNTERS[encounter.id]).toBe(encounter);
      for (const enemyId of encounter.enemies) {
        const enemy = ENEMIES[enemyId];
        expect(enemy, `${encounter.id} references ${enemyId}`).toBeDefined();
        expect(enemy.moves.length).toBeGreaterThan(0);
        expect(enemy.moves.every((move) => move.intents.length > 0)).toBe(true);
      }
    }
  });

  it('selects both bosses deterministically across seeds', () => {
    const selected = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const map = generateMap(new SeededRNG(seed));
      selected.add(map.nodes[map.bossNodeId].encounterId ?? '');
    }
    expect(selected).toEqual(new Set(BOSS_ENCOUNTERS.map((encounter) => encounter.id)));
  });
});
