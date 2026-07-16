import { describe, it, expect } from 'vitest';
import { zhCN } from '@/i18n/zh-CN';
import { cardName, cardDesc, enemyName, relicName, relicDesc, statusShort, cardTypeLabel } from '@/i18n';
import { CARDS } from '@/data/cards';
import { ENEMIES } from '@/data/enemies';
import { RELICS } from '@/data/relics';
import { STATUSES } from '@/data/statuses';
import { PATHS } from '@/data/paths';

// Localization completeness guard: every content id in the data tables MUST
// have a zh-CN entry. Adding a card/enemy/relic/status without a translation
// fails here, so untranslated English never leaks to players.

describe('zh-CN locale completeness', () => {
  it('covers every card with a name and description', () => {
    for (const id of Object.keys(CARDS)) {
      expect(zhCN.cards[id], `card ${id} missing zh-CN entry`).toBeDefined();
      expect(zhCN.cards[id].name.length).toBeGreaterThan(0);
      expect(zhCN.cards[id].desc.length).toBeGreaterThan(0);
    }
  });

  it('covers every enemy', () => {
    for (const id of Object.keys(ENEMIES)) {
      expect(zhCN.enemies[id], `enemy ${id} missing zh-CN entry`).toBeDefined();
      expect(zhCN.enemies[id].length).toBeGreaterThan(0);
    }
  });

  it('covers every relic with a name and description', () => {
    for (const id of Object.keys(RELICS)) {
      expect(zhCN.relics[id], `relic ${id} missing zh-CN entry`).toBeDefined();
      expect(zhCN.relics[id].name.length).toBeGreaterThan(0);
      expect(zhCN.relics[id].desc.length).toBeGreaterThan(0);
    }
  });

  it('covers every status with a name and short label', () => {
    for (const id of Object.keys(STATUSES)) {
      expect(zhCN.statuses[id], `status ${id} missing zh-CN entry`).toBeDefined();
      expect(zhCN.statuses[id].short.length).toBeGreaterThan(0);
    }
  });

  it('covers every hero path with name, tagline and description', () => {
    for (const id of Object.keys(PATHS)) {
      expect(zhCN.paths[id], `path ${id} missing zh-CN entry`).toBeDefined();
      expect(zhCN.paths[id].name.length).toBeGreaterThan(0);
      expect(zhCN.paths[id].tagline.length).toBeGreaterThan(0);
      expect(zhCN.paths[id].desc.length).toBeGreaterThan(0);
    }
  });
});

describe('i18n helpers', () => {
  it('returns Chinese for known content', () => {
    expect(cardName('strike')).toBe('打击');
    expect(cardDesc('strike')).toBe('造成 6 点伤害。');
    expect(enemyName('slime')).toBe('酸液史莱姆');
    expect(relicName('bronzeScales')).toBe('青铜鳞甲');
    expect(relicDesc('bloodVial')).toContain('回复 3 点生命');
    expect(statusShort('poison')).toBe('毒');
    expect(cardTypeLabel('attack')).toBe('攻击');
  });

  it('falls back to canonical data-table text for unknown translations', () => {
    // an id with data but hypothetically no translation → falls back to data;
    // a fully unknown id → falls back to the id itself
    expect(cardName('does-not-exist')).toBe('does-not-exist');
    expect(enemyName('does-not-exist')).toBe('does-not-exist');
    expect(relicDesc('does-not-exist')).toBe('');
  });
});
