import type { CombatState, ResolvedIntent } from '@/types';
import type { EventBus } from '@/core/eventBus';
import {
  addStatus,
  getCombatant,
  getStatusStacks,
} from './entities';
import { STATUSES, VULNERABLE_MULTIPLIER, WEAK_MULTIPLIER } from '@/data/statuses';

// The EffectResolver: the SINGLE point where intent execution logic lives.
// Adding a new EffectKind or status behavior means adding a case HERE and
// nowhere else. Mutates the passed CombatState and publishes GameEvents.

export function applyIntent(state: CombatState, intent: ResolvedIntent, bus: EventBus): void {
  switch (intent.kind) {
    case 'dealDamage':
      applyDamage(state, intent, bus);
      break;
    case 'gainBlock': {
      const c = getCombatant(state, intent.targetId);
      if (c) c.block += intent.value ?? 0;
      break;
    }
    case 'applyStatus': {
      const c = getCombatant(state, intent.targetId);
      if (c && intent.status) addStatus(c, intent.status, intent.amount ?? 0);
      break;
    }
    case 'heal': {
      const c = getCombatant(state, intent.targetId);
      if (c) c.hp = Math.min(c.maxHp, c.hp + (intent.value ?? 0));
      break;
    }
    case 'gainEnergy':
      state.player.energy += intent.value ?? 0;
      break;
    case 'drawCards':
      // Deck operations need pile access, so the engine dispatches draws
      // directly (see CombatEngine.executeIntents); nothing to do here.
      break;
  }
}

function applyDamage(state: CombatState, intent: ResolvedIntent, bus: EventBus): void {
  const source = getCombatant(state, intent.sourceId);
  const target = getCombatant(state, intent.targetId);
  if (!target) return;

  let dmg = intent.value ?? 0;

  // Strength: flat bonus from the attacker.
  if (source) dmg += getStatusStacks(source, 'strength');

  // Weak: attacker deals reduced damage.
  if (source && getStatusStacks(source, 'weak') > 0) {
    dmg = Math.floor(dmg * WEAK_MULTIPLIER);
  }

  // Vulnerable: target takes increased damage.
  if (getStatusStacks(target, 'vulnerable') > 0) {
    dmg = Math.floor(dmg * VULNERABLE_MULTIPLIER);
  }

  dmg = Math.max(0, dmg);

  // Block absorbs first.
  const blocked = Math.min(target.block, dmg);
  target.block -= blocked;
  const hpLoss = dmg - blocked;
  target.hp = Math.max(0, target.hp - hpLoss);

  bus.publish({
    type: 'onDamageDealt',
    sourceId: intent.sourceId,
    targetId: intent.targetId,
    amount: hpLoss,
  });
  bus.publish({
    type: 'onDamageTaken',
    targetId: intent.targetId,
    amount: hpLoss,
    blocked,
  });
}

// Turn-start status ticks (poison damage, etc.) for one combatant.
export function tickStatuses(
  state: CombatState,
  entityId: string,
  bus: EventBus,
): void {
  const c = getCombatant(state, entityId);
  if (!c) return;

  for (const status of c.statuses) {
    const def = STATUSES[status.id];
    if (def.behavior === 'onTurnStart' && status.id === 'poison') {
      const dmg = status.stacks;
      const blocked = Math.min(c.block, dmg);
      c.block -= blocked;
      c.hp = Math.max(0, c.hp - (dmg - blocked));
      bus.publish({
        type: 'onDamageTaken',
        targetId: entityId,
        amount: dmg - blocked,
        blocked,
      });
    }
  }

  // Apply decay.
  for (const status of c.statuses) {
    const def = STATUSES[status.id];
    if (def.decay === 'decrement') status.stacks -= 1;
    else if (def.decay === 'reset') status.stacks = 0;
  }
  c.statuses = c.statuses.filter((s) => s.stacks > 0);
}
