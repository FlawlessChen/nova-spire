import type { NodeType } from '@/types/run';

// Encounter data pool: an encounter is a named group of enemy definition ids
// that a node spawns. Data-driven — new encounter = add an entry, the map
// generator and RunManager reference these ids, never concrete enemies.

export interface EncounterDefinition {
  id: string;
  enemies: string[]; // enemy definition ids (see src/data/enemies.ts)
}

// Normal battles — drawn randomly for 'battle' nodes.
export const BATTLE_ENCOUNTERS: EncounterDefinition[] = [
  { id: 'lone-slime', enemies: ['slime'] },
  { id: 'lone-cultist', enemies: ['cultist'] },
  { id: 'lone-jawworm', enemies: ['jawWorm'] },
  { id: 'slime-pair', enemies: ['slime', 'slime'] },
  { id: 'slime-and-cultist', enemies: ['slime', 'cultist'] },
  { id: 'lone-void-leech', enemies: ['voidLeech'] },
  { id: 'lone-spire-drone', enemies: ['spireDrone'] },
  { id: 'drone-and-leech', enemies: ['spireDrone', 'voidLeech'] },
];

// Elites — tougher groups for 'elite' nodes.
export const ELITE_ENCOUNTERS: EncounterDefinition[] = [
  { id: 'gremlin-nob', enemies: ['gremlinNob'] },
  { id: 'sentry-pair', enemies: ['sentry', 'sentry'] },
  { id: 'nob-and-cultist', enemies: ['gremlinNob', 'cultist'] },
  { id: 'jawworm-duo', enemies: ['jawWorm', 'jawWorm'] },
  { id: 'sentry-trio', enemies: ['sentry', 'sentry', 'sentry'] },
];

// The boss — fixed for MVP.
export const BOSS_ENCOUNTERS: EncounterDefinition[] = [
  { id: 'boss-guardian', enemies: ['guardian'] },
  { id: 'boss-astral-titan', enemies: ['astralTitan'] },
];

// Flat lookup by id (all pools + boss), so RunManager can resolve any
// encounterId a node carries.
export const ENCOUNTERS: Record<string, EncounterDefinition> = Object.fromEntries(
  [...BATTLE_ENCOUNTERS, ...ELITE_ENCOUNTERS, ...BOSS_ENCOUNTERS].map((e) => [e.id, e]),
);

// Which pool a node type draws from (campfire has no encounter).
export function encounterPoolFor(type: NodeType): EncounterDefinition[] {
  switch (type) {
    case 'battle':
      return BATTLE_ENCOUNTERS;
    case 'elite':
      return ELITE_ENCOUNTERS;
    case 'boss':
      return BOSS_ENCOUNTERS;
    case 'campfire':
    case 'shop':
      return [];
  }
}
