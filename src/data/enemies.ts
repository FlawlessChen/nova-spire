import type { EnemyDefinition } from '@/types';

// Enemy data table. Enemy moves use 'opponent' to target the player.
// New enemy = add an entry; reuse the 'random' AI strategy.

export const ENEMIES: Record<string, EnemyDefinition> = {
  slime: {
    id: 'slime', name: 'Acid Slime', ai: 'random',
    maxHp: [28, 32],
    moves: [
      {
        id: 'tackle', weight: 60,
        intents: [{ kind: 'dealDamage', target: 'opponent', value: 8 }],
      },
      {
        id: 'spit', weight: 40,
        intents: [
          { kind: 'dealDamage', target: 'opponent', value: 5 },
          { kind: 'applyStatus', target: 'opponent', status: 'weak', amount: 1 },
        ],
      },
    ],
  },
  cultist: {
    id: 'cultist', name: 'Cultist', ai: 'random',
    maxHp: [22, 26],
    moves: [
      {
        id: 'darkStrike', weight: 70,
        intents: [{ kind: 'dealDamage', target: 'opponent', value: 6 }],
      },
      {
        id: 'ritual', weight: 30,
        intents: [{ kind: 'applyStatus', target: 'self', status: 'strength', amount: 2 }],
      },
    ],
  },
  jawWorm: {
    id: 'jawWorm', name: 'Jaw Worm', ai: 'random',
    maxHp: [34, 40],
    moves: [
      {
        id: 'chomp', weight: 50,
        intents: [{ kind: 'dealDamage', target: 'opponent', value: 11 }],
      },
      {
        id: 'thrash', weight: 30,
        intents: [
          { kind: 'dealDamage', target: 'opponent', value: 7 },
          { kind: 'gainBlock', target: 'self', value: 5 },
        ],
      },
      {
        id: 'bellow', weight: 20,
        intents: [
          { kind: 'applyStatus', target: 'self', status: 'strength', amount: 3 },
          { kind: 'gainBlock', target: 'self', value: 6 },
        ],
      },
    ],
  },
  // ── M4 elites: tougher, with threatening intent combos ──
  gremlinNob: {
    id: 'gremlinNob', name: 'Gremlin Nob', ai: 'random',
    maxHp: [58, 64],
    moves: [
      {
        id: 'rush', weight: 45,
        intents: [{ kind: 'dealDamage', target: 'opponent', value: 14 }],
      },
      {
        id: 'skullBash', weight: 30,
        intents: [
          { kind: 'dealDamage', target: 'opponent', value: 8 },
          { kind: 'applyStatus', target: 'opponent', status: 'vulnerable', amount: 2 },
        ],
      },
      {
        id: 'bellow', weight: 25,
        intents: [{ kind: 'applyStatus', target: 'self', status: 'strength', amount: 3 }],
      },
    ],
  },
  sentry: {
    id: 'sentry', name: 'Sentry', ai: 'random',
    maxHp: [40, 44],
    moves: [
      {
        id: 'beam', weight: 55,
        intents: [{ kind: 'dealDamage', target: 'opponent', value: 9 }],
      },
      {
        id: 'bolt', weight: 25,
        intents: [
          { kind: 'dealDamage', target: 'opponent', value: 5 },
          { kind: 'applyStatus', target: 'opponent', status: 'weak', amount: 2 },
        ],
      },
      {
        id: 'harden', weight: 20,
        intents: [
          { kind: 'gainBlock', target: 'self', value: 12 },
          { kind: 'dealDamage', target: 'opponent', value: 4 },
        ],
      },
    ],
  },
  // Boss
  guardian: {
    id: 'guardian', name: 'The Guardian', ai: 'random',
    maxHp: [90, 90],
    moves: [
      {
        id: 'slam', weight: 45,
        intents: [{ kind: 'dealDamage', target: 'opponent', value: 15 }],
      },
      {
        id: 'fierceBash', weight: 30,
        intents: [
          { kind: 'dealDamage', target: 'opponent', value: 10 },
          { kind: 'applyStatus', target: 'opponent', status: 'vulnerable', amount: 2 },
        ],
      },
      {
        id: 'defensiveMode', weight: 25,
        intents: [
          { kind: 'gainBlock', target: 'self', value: 20 },
          { kind: 'applyStatus', target: 'self', status: 'strength', amount: 2 },
        ],
      },
    ],
  },
};
