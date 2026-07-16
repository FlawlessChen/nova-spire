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

// Reach into the App's private internals to drive flows without a real UI.
type AppInternals = {
  mgr: import('@/game/runManager').RunManager | null;
  syncView(): void;
  start(): void;
  newRun(pathId: string): void;
  showPathSelect(): void;
  continueRun(): void;
  root: { children: unknown[] };
};

// Start an app past the title + path-select gates so `mgr` exists.
function begin(save: SaveManager): AppInternals {
  const app = new App(save) as unknown as AppInternals;
  app.start();          // title screen
  app.newRun('berserker'); // pick a path → run begins
  return app;
}

describe('App FSM', () => {
  let save: SaveManager;
  let backend: FakeStorage;

  beforeEach(() => {
    backend = new FakeStorage();
    save = new SaveManager(backend);
  });

  it('opens on the title screen with no run yet', () => {
    const app = new App(save) as unknown as AppInternals;
    app.start();
    expect(app.mgr).toBeNull(); // title gate — run not created
    expect(app.root.children.length).toBeGreaterThan(0);
    // choosing a path begins the run on the map
    app.newRun('berserker');
    expect(app.mgr!.state.phase).toBe('map');
    expect(app.mgr!.state.pathId).toBe('berserker');
  });

  it('swaps to a combat view when entering a battle node', () => {
    const app = begin(save);
    const battle = app.mgr!.availableNodes().find((n) => n.type !== 'campfire')!;
    app.mgr!.enterNode(battle.id);
    app.syncView();
    expect(app.mgr!.state.phase).toBe('combat');
    // a CombatView was mounted
    expect(app.root.children.length).toBeGreaterThan(0);
  });

  it('drives combat → reward → map and grows the deck', () => {
    const app = begin(save);
    const battle = app.mgr!.availableNodes().find((n) => n.type === 'battle')!;
    app.mgr!.enterNode(battle.id);
    app.syncView();

    // simulate winning the combat via the run manager directly
    const deckBefore = app.mgr!.state.deck.length;
    app.mgr!.resolveCombat(true, 50);
    app.syncView();
    expect(app.mgr!.state.phase).toBe('reward');

    // pick the first reward
    app.mgr!.chooseReward(app.mgr!.state.pendingReward![0]);
    app.syncView();
    expect(app.mgr!.state.phase).toBe('map');
    expect(app.mgr!.state.deck.length).toBe(deckBefore + 1);
  });

  it('persists progress and resumes a saved run from the title', () => {
    const app1 = begin(save);
    const battle = app1.mgr!.availableNodes().find((n) => n.type === 'battle')!;
    app1.mgr!.enterNode(battle.id);
    app1.mgr!.resolveCombat(true, 44);
    app1.mgr!.chooseReward(null);
    const deckLen = app1.mgr!.state.deck.length;
    const visited = app1.mgr!.state.visitedNodeIds.slice();
    const pathId = app1.mgr!.state.pathId;

    // a new App with the SAME backend: title shows, then Continue resumes it
    const app2 = new App(new SaveManager(backend)) as unknown as AppInternals;
    app2.start();
    expect(app2.mgr).toBeNull(); // title gate first
    app2.continueRun();
    expect(app2.mgr).not.toBeNull();
    expect(app2.mgr!.state.visitedNodeIds).toEqual(visited);
    expect(app2.mgr!.state.deck.length).toBe(deckLen);
    expect(app2.mgr!.state.playerHp).toBe(44);
    expect(app2.mgr!.state.pathId).toBe(pathId);
  });

  it('does not resume a finished run (continue falls through to path select)', () => {
    const app1 = begin(save);
    const node = app1.mgr!.availableNodes()[0];
    app1.mgr!.enterNode(node.id);
    app1.mgr!.resolveCombat(false, 0); // lose
    expect(app1.mgr!.state.phase).toBe('lost');

    // a lost run isn't resumable: continue lands on path-select, not a run
    const app2 = new App(new SaveManager(backend)) as unknown as AppInternals;
    app2.start();
    expect(app2.mgr).toBeNull();
    app2.continueRun();
    expect(app2.mgr).toBeNull(); // no resumable run → path-select gate
  });
});
