import type { Locale } from './locale';
import { zhCN } from './zh-CN';
import { CARDS } from '@/data/cards';
import { ENEMIES } from '@/data/enemies';
import { RELICS } from '@/data/relics';
import { baseId, isUpgraded } from '@/data/cardUpgrade';

// Active locale. zh-CN is the default (and currently only) language; shipping
// another language = add a Locale file and switch here. Helpers fall back to
// the canonical English in the data tables so a missing translation degrades
// gracefully instead of crashing.
//
// Card helpers accept a deck ENTRY (which may carry a "+" upgrade suffix) and
// render the upgraded name/description accordingly.

export const L: Locale = zhCN;

export function cardName(entry: string): string {
  const id = baseId(entry);
  const name = L.cards[id]?.name ?? CARDS[id]?.name ?? id;
  return isUpgraded(entry) ? `${name}+` : name;
}

export function cardDesc(entry: string): string {
  const id = baseId(entry);
  if (isUpgraded(entry)) {
    const up = L.cards[id]?.descUpgraded ?? CARDS[id]?.upgrade?.description;
    if (up) return up;
  }
  return L.cards[id]?.desc ?? CARDS[id]?.description ?? '';
}

export function enemyName(id: string): string {
  return L.enemies[id] ?? ENEMIES[id]?.name ?? id;
}

export function relicName(id: string): string {
  return L.relics[id]?.name ?? RELICS[id]?.name ?? id;
}

export function relicDesc(id: string): string {
  return L.relics[id]?.desc ?? RELICS[id]?.description ?? '';
}

export function statusShort(id: string): string {
  return L.statuses[id]?.short ?? id;
}

export function cardTypeLabel(type: 'attack' | 'skill' | 'power'): string {
  switch (type) {
    case 'attack':
      return L.ui.cardTypeAttack;
    case 'skill':
      return L.ui.cardTypeSkill;
    case 'power':
      return L.ui.cardTypePower;
  }
}

export function pathName(id: string): string {
  return L.paths[id]?.name ?? id;
}

export function pathTagline(id: string): string {
  return L.paths[id]?.tagline ?? '';
}

export function pathDesc(id: string): string {
  return L.paths[id]?.desc ?? '';
}
