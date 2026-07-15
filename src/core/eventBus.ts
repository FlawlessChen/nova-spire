import type { GameEvent } from '@/types';

// Minimal typed publish/subscribe bus. The engine publishes GameEvents; relics,
// UI animations and future achievement systems subscribe. The engine never
// knows who is listening.

type Listener = (event: GameEvent) => void;

export class EventBus {
  private listeners: Listener[] = [];

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      const idx = this.listeners.indexOf(fn);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  publish(event: GameEvent): void {
    // iterate a copy so subscribers may unsubscribe during dispatch
    for (const fn of this.listeners.slice()) fn(event);
  }

  clear(): void {
    this.listeners = [];
  }
}
