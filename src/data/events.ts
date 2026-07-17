export type EventEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'damage'; amount: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'card'; cardId: string };

export interface EventChoiceDefinition {
  id: string;
  effects: EventEffect[];
}

export interface EventDefinition {
  id: string;
  choices: EventChoiceDefinition[];
}

export const EVENTS: Record<string, EventDefinition> = {
  novaShrine: {
    id: 'novaShrine',
    choices: [
      { id: 'offer', effects: [{ kind: 'damage', amount: 8 }, { kind: 'card', cardId: 'perfectedStrike+' }] },
      { id: 'pray', effects: [{ kind: 'heal', amount: 10 }] },
    ],
  },
  derelictVault: {
    id: 'derelictVault',
    choices: [
      { id: 'force', effects: [{ kind: 'damage', amount: 5 }, { kind: 'gold', amount: 55 }] },
      { id: 'leave', effects: [] },
    ],
  },
  voidSpring: {
    id: 'voidSpring',
    choices: [
      { id: 'drink', effects: [{ kind: 'heal', amount: 16 }] },
      { id: 'trade', effects: [{ kind: 'damage', amount: 6 }, { kind: 'card', cardId: 'reaper' }] },
    ],
  },
};

export const EVENT_POOL = Object.keys(EVENTS);
