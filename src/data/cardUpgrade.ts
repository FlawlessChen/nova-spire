import type { CardDefinition } from '@/types';
import { CARDS } from '@/data/cards';

// Upgraded cards are represented in a deck as the base id plus a "+" suffix,
// e.g. "strike+". This module is the SINGLE place that knows that convention —
// the engine and every view resolve a deck entry through here, so upgrade logic
// never scatters. A deck stays a string[]; upgrading a card just appends "+".
//
// Pure data layer: NO i18n, NO PixiJS, so the combat engine can use it while
// staying pure logic. Localized display strings live in src/i18n.

export const UPGRADE_SUFFIX = '+';

export function isUpgraded(entry: string): boolean {
  return entry.endsWith(UPGRADE_SUFFIX);
}

/** Strip the "+" to get the base definition id. */
export function baseId(entry: string): string {
  return isUpgraded(entry) ? entry.slice(0, -1) : entry;
}

/** A card can be upgraded if it isn't already and its definition defines one. */
export function canUpgrade(entry: string): boolean {
  if (isUpgraded(entry)) return false;
  return CARDS[baseId(entry)]?.upgrade !== undefined;
}

/** Append "+" (idempotent). Returns null if the card can't be upgraded. */
export function upgradedId(entry: string): string | null {
  if (!canUpgrade(entry)) return null;
  return baseId(entry) + UPGRADE_SUFFIX;
}

/**
 * Resolve a deck entry ("strike" or "strike+") into the effective definition,
 * merging the upgrade override when present. The base id/type/rarity/targetMode
 * are preserved; only cost/description/effects change.
 */
export function resolveCard(entry: string): CardDefinition {
  const base = CARDS[baseId(entry)];
  if (!base) {
    return { id: entry, name: entry, cost: 0, type: 'skill', rarity: 'common', targetMode: 'none', description: '', effects: [] };
  }
  if (!isUpgraded(entry) || !base.upgrade) return base;
  return {
    ...base,
    cost: base.upgrade.cost ?? base.cost,
    description: base.upgrade.description ?? base.description,
    effects: base.upgrade.effects ?? base.effects,
  };
}
