import type {
  CombatState,
  EnemyState,
  PlayerState,
  StatusId,
  StatusInstance,
} from '@/types';
import { PLAYER_ID } from '@/types';

// Small helpers for reaching entities inside a CombatState by id. Keeps the
// resolver readable and avoids scattering find() calls everywhere.

export type Combatant = PlayerState | EnemyState;

export function isPlayerId(id: string): boolean {
  return id === PLAYER_ID;
}

export function getCombatant(state: CombatState, id: string): Combatant | undefined {
  if (id === PLAYER_ID) return state.player;
  return state.enemies.find((e) => e.entityId === id);
}

export function getStatusStacks(c: Combatant, id: StatusId): number {
  return c.statuses.find((s) => s.id === id)?.stacks ?? 0;
}

export function addStatus(c: Combatant, id: StatusId, amount: number): void {
  const existing = c.statuses.find((s) => s.id === id);
  if (existing) existing.stacks += amount;
  else c.statuses.push({ id, stacks: amount });
}

export function removeZeroStatuses(c: Combatant): void {
  c.statuses = c.statuses.filter((s: StatusInstance) => s.stacks > 0);
}
