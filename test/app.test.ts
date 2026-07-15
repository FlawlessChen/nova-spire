import { describe, it, expect, vi, beforeEach } from 'vitest';

// App FSM integration tests. PixiJS is mocked (no WebGL in the test env) so we
// exercise the CONTROL FLOW: the App swaps views as the run phase changes, and
// drives map → combat → reward → map end to end. Pixel output isn't tested.

vi.mock('pixi.js', () => {
  class Node {
    children: unknown[] = [];
    x = 0;
    y = 0;
    alpha = 1;
    width = 40;
    height = 20;
    eventMode = 'none';
    cursor = 'default';
    scale = { set: () => {} };
    anchor = { set: () => {} };
    private handlers: Record<string, (() => void)[]> = {};
    addChild(child: unknown): unknown {
      this.children.push(child);
      return child;
    }
    addChildAt(child: unknown): unknown {
      this.children.unshift(child);
      return child;
    }
    removeChildren(): void {
      this.children = [];
    }
    on(event: string, fn: () => void): this {
      (this.handlers[event] ??= []).push(fn);
      return this;
    }
    emit(event: string): void {
      (this.handlers[event] ?? []).forEach((fn) => fn());
    }
  }
  class Container extends Node {}
  class Graphics extends Node {
    roundRect(): this { return this; }
    rect(): this { return this; }
    circle(): this { return this; }
    ellipse(): this { return this; }
    poly(): this { return this; }
    moveTo(): this { return this; }
    lineTo(): this { return this; }
    fill(): this { return this; }
    stroke(): this { return this; }
  }
  class Text extends Node {
    text: string;
    constructor(opts: { text?: string }) {
      super();
      this.text = opts?.text ?? '';
    }
  }
  return { Container, Graphics, Text };
});

import { App } from '@/render/app';
import { SaveManager, type StorageBackend } from '@/game/saveManager';

class FakeStorage implements StorageBackend {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
}

// Reach into the App's private RunManager to drive the run without a real UI.
type AppInternals = {
  mgr: import('@/game/runManager').RunManager;
  syncView(): void;
  start(): void;
  root: { children: unknown[] };
};

describe('App FSM', () => {
  let save: SaveManager;
  let backend: FakeStorage;

  beforeEach(() => {
    backend = new FakeStorage();
    save = new SaveManager(backend);
  });

  it('starts a fresh run on the map', () => {
    const app = new App(save) as unknown as AppInternals;
    app.start();
    expect(app.mgr.state.phase).toBe('map');
    expect(app.root.children.length).toBeGreaterThan(0);
  });

  it('swaps to a combat view when entering a battle node', () => {
    const app = new App(save) as unknown as AppInternals;
    app.start();
    const battle = app.mgr.availableNodes().find((n) => n.type !== 'campfire')!;
    app.mgr.enterNode(battle.id);
    app.syncView();
    expect(app.mgr.state.phase).toBe('combat');
    // a CombatView was mounted
    expect(app.root.children.length).toBeGreaterThan(0);
  });

  it('drives combat → reward → map and grows the deck', () => {
    const app = new App(save) as unknown as AppInternals;
    app.start();
    const battle = app.mgr.availableNodes().find((n) => n.type === 'battle')!;
    app.mgr.enterNode(battle.id);
    app.syncView();

    // simulate winning the combat via the run manager directly
    const deckBefore = app.mgr.state.deck.length;
    app.mgr.resolveCombat(true, 50);
    app.syncView();
    expect(app.mgr.state.phase).toBe('reward');

    // pick the first reward
    app.mgr.chooseReward(app.mgr.state.pendingReward![0]);
    app.syncView();
    expect(app.mgr.state.phase).toBe('map');
    expect(app.mgr.state.deck.length).toBe(deckBefore + 1);
  });

  it('persists progress and resumes a saved run on restart', () => {
    const app1 = new App(save) as unknown as AppInternals;
    app1.start();
    const battle = app1.mgr.availableNodes().find((n) => n.type === 'battle')!;
    app1.mgr.enterNode(battle.id);
    app1.mgr.resolveCombat(true, 44);
    app1.mgr.chooseReward(null);
    const deckLen = app1.mgr.state.deck.length;
    const visited = app1.mgr.state.visitedNodeIds.slice();

    // a new App with the SAME backend should resume, not start fresh
    const app2 = new App(new SaveManager(backend)) as unknown as AppInternals;
    app2.start();
    expect(app2.mgr.state.visitedNodeIds).toEqual(visited);
    expect(app2.mgr.state.deck.length).toBe(deckLen);
    expect(app2.mgr.state.playerHp).toBe(44);
  });

  it('does not resume a finished run', () => {
    const app1 = new App(save) as unknown as AppInternals;
    app1.start();
    const node = app1.mgr.availableNodes()[0];
    app1.mgr.enterNode(node.id);
    app1.mgr.resolveCombat(false, 0); // lose
    expect(app1.mgr.state.phase).toBe('lost');

    // new App should start fresh (a lost run isn't resumed)
    const app2 = new App(new SaveManager(backend)) as unknown as AppInternals;
    app2.start();
    expect(app2.mgr.state.phase).toBe('map');
    expect(app2.mgr.state.visitedNodeIds.length).toBe(0);
  });
});
