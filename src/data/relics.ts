import type { RelicDefinition } from '@/types';

// Relic data table. Relics are pure DATA — an event trigger plus authoring-layer
// effects. The RelicEngine subscribes to the combat EventBus and, when a
// relic's trigger fires (and its optional condition holds), routes the relic's
// effects through CombatEngine.applyEffects. No relic logic lives in the engine.
//
// New relic = add an entry here. The engine still greps clean of relic ids.

export const RELICS: Record<string, RelicDefinition> = {
  // Combat-start: gain block every fight.
  bronzeScales: {
    id: 'bronzeScales', name: '青铜鳞甲',
    description: '每场战斗开始时获得 4 格护甲。',
    trigger: 'onCombatStart',
    effects: [{ kind: 'gainBlock', target: 'self', value: 4 }],
  },
  // Combat-start: start each fight already strengthened.
  vajra: {
    id: 'vajra', name: '金刚杵',
    description: '每场战斗开始时获得 1 点力量。',
    trigger: 'onCombatStart',
    effects: [{ kind: 'applyStatus', target: 'self', status: 'strength', amount: 1 }],
  },
  // Combat-start: extra opening card draw.
  ancientTome: {
    id: 'ancientTome', name: '远古典籍',
    description: '每场战斗开始时抽 1 张牌。',
    trigger: 'onCombatStart',
    effects: [{ kind: 'drawCards', value: 1 }],
  },
  // Every 3rd card played, draw a card (card-cycling engine).
  inkPhial: {
    id: 'inkPhial', name: '墨水瓶',
    description: '每打出 3 张牌，抽 1 张牌。',
    trigger: 'onCardPlayed',
    effects: [{ kind: 'drawCards', value: 1 }],
    condition: { kind: 'everyNthTrigger', value: 3 },
  },
  // Every turn start, gain a little block (self-targeted on player turns).
  lantern: {
    id: 'lantern', name: '战地提灯',
    description: '每回合开始时获得 2 格护甲。',
    trigger: 'onTurnStart',
    effects: [{ kind: 'gainBlock', target: 'self', value: 2 }],
  },
  // When an enemy dies, heal a bit (sustain over a run).
  bloodVial: {
    id: 'bloodVial', name: '血瓶',
    description: '每击败一个敌人，回复 3 点生命。',
    trigger: 'onEnemyDeath',
    effects: [{ kind: 'heal', target: 'self', value: 3 }],
  },
};

// Relics that can drop as rewards (all of them, for MVP).
export const RELIC_POOL: string[] = Object.keys(RELICS);
