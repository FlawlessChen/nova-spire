import type {
  CombatState,
  EffectDefinition,
  PlayContext,
  ResolvedIntent,
  TargetSelector,
} from '@/types';
import { PLAYER_ID } from '@/types';
import { SeededRNG } from '@/core/rng';

// Resolve a relative TargetSelector into concrete entity ids, given who is
// casting and (for player cards) which enemy was clicked. This is the bridge
// from the authoring layer (relative) to the runtime layer (absolute).

export function resolveTargets(
  selector: TargetSelector,
  ctx: PlayContext,
  state: CombatState,
  rng: SeededRNG,
): string[] {
  const casterIsPlayer = ctx.sourceId === PLAYER_ID;
  const aliveEnemyIds = state.enemies.filter((e) => e.hp > 0).map((e) => e.entityId);

  switch (selector) {
    case 'self':
      return [ctx.sourceId];
    case 'opponent':
      // enemy -> player; player -> the chosen enemy (falls back to first alive)
      return casterIsPlayer
        ? ctx.chosenTargetId
          ? [ctx.chosenTargetId]
          : aliveEnemyIds.slice(0, 1)
        : [PLAYER_ID];
    case 'chosenEnemy':
      return ctx.chosenTargetId ? [ctx.chosenTargetId] : aliveEnemyIds.slice(0, 1);
    case 'allEnemies':
      return casterIsPlayer ? aliveEnemyIds : [PLAYER_ID];
    case 'randomEnemy':
      return casterIsPlayer
        ? aliveEnemyIds.length
          ? [rng.pick(aliveEnemyIds)]
          : []
        : [PLAYER_ID];
    default:
      return [];
  }
}

// Expand a list of authoring-layer EffectDefinitions into concrete
// ResolvedIntents (one per target).
export function resolveEffects(
  effects: EffectDefinition[],
  ctx: PlayContext,
  state: CombatState,
  rng: SeededRNG,
): ResolvedIntent[] {
  const intents: ResolvedIntent[] = [];

  for (const effect of effects) {
    // draw/energy always act on the caster (self), no target selector
    if (effect.kind === 'drawCards' || effect.kind === 'gainEnergy') {
      intents.push({ kind: effect.kind, sourceId: ctx.sourceId, targetId: ctx.sourceId, value: effect.value });
      continue;
    }

    const targets = resolveTargets(effect.target, ctx, state, rng);
    for (const targetId of targets) {
      switch (effect.kind) {
        case 'dealDamage':
        case 'gainBlock':
        case 'heal':
          intents.push({ kind: effect.kind, sourceId: ctx.sourceId, targetId, value: effect.value });
          break;
        case 'applyStatus':
          intents.push({
            kind: 'applyStatus',
            sourceId: ctx.sourceId,
            targetId,
            status: effect.status,
            amount: effect.amount,
          });
          break;
      }
    }
  }

  return intents;
}
