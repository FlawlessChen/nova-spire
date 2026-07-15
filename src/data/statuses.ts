import type { StatusDefinition, StatusId } from '@/types';

// Status definitions. Adding a new status = add an entry here + one case in the
// EffectResolver. All cards/enemies can then use it immediately.

export const STATUSES: Record<StatusId, StatusDefinition> = {
  weak: {
    id: 'weak',
    name: 'Weak',
    behavior: 'modifyDamageDealt', // -25% damage dealt while active
    decay: 'decrement',
  },
  vulnerable: {
    id: 'vulnerable',
    name: 'Vulnerable',
    behavior: 'modifyDamageTaken', // +50% damage taken while active
    decay: 'decrement',
  },
  poison: {
    id: 'poison',
    name: 'Poison',
    behavior: 'onTurnStart', // deals stacks damage at turn start, then -1
    decay: 'decrement',
  },
  strength: {
    id: 'strength',
    name: 'Strength',
    behavior: 'modifyDamageDealt', // +stacks flat damage on attacks
    decay: 'persist',
  },
};

export const WEAK_MULTIPLIER = 0.75;
export const VULNERABLE_MULTIPLIER = 1.5;
