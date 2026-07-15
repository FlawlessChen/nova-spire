import type { GameEvent, RelicDefinition } from '@/types';
import type { EventBus } from '@/core/eventBus';
import type { CombatEngine } from '@/game/combatEngine';
import { RELICS } from '@/data/relics';

// RelicEngine: the canonical example of the locked "relics are event-bus
// subscribers" architecture. It owns NO combat logic. It listens on the combat
// EventBus; when a relic's trigger event fires (and its condition holds), it
// routes the relic's authoring-layer effects back through
// CombatEngine.applyEffects — the same single execution path cards use.
//
// One RelicEngine is created per combat, wrapping that combat's engine and the
// player's owned relic ids. Call attach() once after construction.

export class RelicEngine {
  private relics: RelicDefinition[];
  private triggerCounts = new Map<string, number>();
  private unsub: (() => void) | null = null;
  // Re-entrancy guard: a relic effect (gainBlock, drawCards, heal…) publishes
  // events that could re-trigger relics — including itself. We process relics
  // only for events NOT originating from within a relic effect.
  private applying = false;

  constructor(
    private engine: CombatEngine,
    relicIds: string[],
  ) {
    this.relics = relicIds.map((id) => RELICS[id]).filter(Boolean);
  }

  /** Subscribe to the combat bus. Returns an unsubscribe function. */
  attach(bus: EventBus): () => void {
    this.unsub = bus.subscribe((e) => this.onEvent(e));
    return () => this.detach();
  }

  detach(): void {
    this.unsub?.();
    this.unsub = null;
  }

  private onEvent(event: GameEvent): void {
    if (this.applying) return; // ignore events caused by relic effects
    for (const relic of this.relics) {
      if (relic.trigger !== event.type) continue;
      if (!this.passesEventGuard(relic, event)) continue;
      if (!this.passesCondition(relic)) continue;
      this.fire(relic);
    }
  }

  // Some triggers need payload-level filtering so a player's relic doesn't fire
  // on the enemy's behalf (e.g. onTurnStart fires for both sides).
  private passesEventGuard(relic: RelicDefinition, event: GameEvent): boolean {
    if (relic.trigger === 'onTurnStart' && event.type === 'onTurnStart') {
      return event.side === 'player';
    }
    return true;
  }

  // everyNthTrigger: only fire on every Nth matching event. hpBelowPercent:
  // only fire when the player is at/below the given HP fraction.
  private passesCondition(relic: RelicDefinition): boolean {
    const cond = relic.condition;
    if (!cond) return true;

    if (cond.kind === 'everyNthTrigger') {
      const n = Math.max(1, cond.value);
      const count = (this.triggerCounts.get(relic.id) ?? 0) + 1;
      this.triggerCounts.set(relic.id, count);
      return count % n === 0;
    }

    if (cond.kind === 'hpBelowPercent') {
      const p = this.engine.state.player;
      return p.maxHp > 0 && (p.hp / p.maxHp) * 100 <= cond.value;
    }

    return true;
  }

  private fire(relic: RelicDefinition): void {
    this.applying = true;
    try {
      this.engine.applyEffects(relic.effects);
    } finally {
      this.applying = false;
    }
  }
}
