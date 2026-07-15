import type { RelicDefinition } from '@/types';

// Relic data table. Relics are pure DATA — an event trigger plus authoring-layer
// effects. The RelicEngine subscribes to the combat EventBus and, when a
// relic's trigger fires (and its condition holds), routes the relic's effects
// through CombatEngine.applyEffects. No relic logic lives in the engine.
//
// Names/descriptions here are canonical English; player-facing text comes from
// the active locale in src/i18n (falls back to these if a translation is
// missing). New relic = add an entry here + a locale entry.

export const RELICS: Record<string, RelicDefinition> = {
  // Combat-start: gain block every fight.
  bronzeScales: {
    id: 'bronzeScales', name: 'Bronze Scales',
    description: 'Gain 4 Block at the start of each combat.',
    trigger: 'onCombatStart',
    effects: [{ kind: 'gainBlock', target: 'self', value: 4 }],
  },
  // Combat-start: start each fight already strengthened.
  vajra: {
    id: 'vajra', name: 'Vajra',
    description: 'Gain 1 Strength at the start of each combat.',
    trigger: 'onCombatStart',
    effects: [{ kind: 'applyStatus', target: 'self', status: 'strength', amount: 1 }],
  },
  // Combat-start: extra opening card draw.
  ancientTome: {
    id: 'ancientTome', name: 'Ancient Tome',
    description: 'Draw 1 card at the start of each combat.',
    trigger: 'onCombatStart',
    effects: [{ kind: 'drawCards', value: 1 }],
  },
  // Every 3rd card played, draw a card (card-cycling engine).
  inkPhial: {
    id: 'inkPhial', name: 'Ink Phial',
    description: 'Every 3 cards played, draw 1 card.',
    trigger: 'onCardPlayed',
    effects: [{ kind: 'drawCards', value: 1 }],
    condition: { kind: 'everyNthTrigger', value: 3 },
  },
  // Every turn start, gain a little block (self-targeted on player turns).
  lantern: {
    id: 'lantern', name: 'Battle Lantern',
    description: 'Gain 2 Block at the start of each turn.',
    trigger: 'onTurnStart',
    effects: [{ kind: 'gainBlock', target: 'self', value: 2 }],
  },
  // When an enemy dies, heal a bit (sustain over a run).
  bloodVial: {
    id: 'bloodVial', name: 'Blood Vial',
    description: 'Heal 3 HP whenever an enemy dies.',
    trigger: 'onEnemyDeath',
    effects: [{ kind: 'heal', target: 'self', value: 3 }],
  },
};

// Relics that can drop as rewards (all of them, for MVP).
export const RELIC_POOL: string[] = Object.keys(RELICS);
