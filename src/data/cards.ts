import type { CardDefinition } from '@/types';

// Card data table. New card (reusing existing effect kinds) = add one entry.
// The engine never references these ids.

export const CARDS: Record<string, CardDefinition> = {
  strike: {
    id: 'strike', name: 'Strike', cost: 1,
    type: 'attack', rarity: 'common', targetMode: 'enemy',
    description: 'Deal 6 damage.',
    effects: [{ kind: 'dealDamage', target: 'chosenEnemy', value: 6 }],
  },
  defend: {
    id: 'defend', name: 'Defend', cost: 1,
    type: 'skill', rarity: 'common', targetMode: 'self',
    description: 'Gain 5 Block.',
    effects: [{ kind: 'gainBlock', target: 'self', value: 5 }],
  },
  poisonStab: {
    id: 'poisonStab', name: 'Poison Stab', cost: 1,
    type: 'attack', rarity: 'uncommon', targetMode: 'enemy',
    description: 'Deal 4 damage. Apply 3 Poison.',
    effects: [
      { kind: 'dealDamage', target: 'chosenEnemy', value: 4 },
      { kind: 'applyStatus', target: 'chosenEnemy', status: 'poison', amount: 3 },
    ],
  },
  bash: {
    id: 'bash', name: 'Bash', cost: 2,
    type: 'attack', rarity: 'common', targetMode: 'enemy',
    description: 'Deal 8 damage. Apply 2 Vulnerable.',
    effects: [
      { kind: 'dealDamage', target: 'chosenEnemy', value: 8 },
      { kind: 'applyStatus', target: 'chosenEnemy', status: 'vulnerable', amount: 2 },
    ],
  },
  cleave: {
    id: 'cleave', name: 'Cleave', cost: 1,
    type: 'attack', rarity: 'common', targetMode: 'none',
    description: 'Deal 5 damage to ALL enemies.',
    effects: [{ kind: 'dealDamage', target: 'allEnemies', value: 5 }],
  },
  ironWave: {
    id: 'ironWave', name: 'Iron Wave', cost: 1,
    type: 'attack', rarity: 'common', targetMode: 'enemy',
    description: 'Deal 4 damage. Gain 4 Block.',
    effects: [
      { kind: 'dealDamage', target: 'chosenEnemy', value: 4 },
      { kind: 'gainBlock', target: 'self', value: 4 },
    ],
  },
  flex: {
    id: 'flex', name: 'Flex', cost: 0,
    type: 'skill', rarity: 'common', targetMode: 'self',
    description: 'Gain 2 Strength.',
    effects: [{ kind: 'applyStatus', target: 'self', status: 'strength', amount: 2 }],
  },
  quickDraw: {
    id: 'quickDraw', name: 'Quick Draw', cost: 1,
    type: 'skill', rarity: 'common', targetMode: 'self',
    description: 'Draw 2 cards.',
    effects: [{ kind: 'drawCards', value: 2 }],
  },
  intimidate: {
    id: 'intimidate', name: 'Intimidate', cost: 0,
    type: 'skill', rarity: 'uncommon', targetMode: 'none',
    description: 'Apply 1 Weak to ALL enemies.',
    effects: [{ kind: 'applyStatus', target: 'allEnemies', status: 'weak', amount: 1 }],
  },
  secondWind: {
    id: 'secondWind', name: 'Second Wind', cost: 1,
    type: 'skill', rarity: 'uncommon', targetMode: 'self',
    description: 'Heal 6. Gain 1 Energy.',
    effects: [
      { kind: 'heal', target: 'self', value: 6 },
      { kind: 'gainEnergy', value: 1 },
    ],
  },
  heavyBlow: {
    id: 'heavyBlow', name: 'Heavy Blow', cost: 2,
    type: 'attack', rarity: 'uncommon', targetMode: 'enemy',
    description: 'Deal 14 damage.',
    effects: [{ kind: 'dealDamage', target: 'chosenEnemy', value: 14 }],
  },
  shrugItOff: {
    id: 'shrugItOff', name: 'Shrug It Off', cost: 1,
    type: 'skill', rarity: 'common', targetMode: 'self',
    description: 'Gain 8 Block. Draw 1 card.',
    effects: [
      { kind: 'gainBlock', target: 'self', value: 8 },
      { kind: 'drawCards', value: 1 },
    ],
  },
};

// The starting deck: 5 Strike, 4 Defend, 1 Bash — classic deckbuilder opener.
export const STARTING_DECK: string[] = [
  'strike', 'strike', 'strike', 'strike', 'strike',
  'defend', 'defend', 'defend', 'defend',
  'bash',
];
