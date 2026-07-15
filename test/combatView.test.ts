import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Render-layer logic tests. PixiJS needs WebGL, which isn't available in the
// test env, so we mock its display objects with chainable stubs. This does NOT
// test pixel output — it tests CombatView's INTERACTION control flow: that
// clicking a card/enemy/end-turn drives the engine correctly and never throws
// during a full re-render. The engine itself is covered in combatEngine.test.ts.

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
    removeChildren(): void {
      this.children = [];
    }
    on(event: string, fn: () => void): this {
      (this.handlers[event] ??= []).push(fn);
      return this;
    }
    // test helper: fire a registered handler
    emit(event: string): void {
      (this.handlers[event] ?? []).forEach((fn) => fn());
    }
  }
  class Container extends Node {}
  class Graphics extends Node {
    roundRect(): this { return this; }
    rect(): this { return this; }
    circle(): this { return this; }
    fill(): this { return this; }
    stroke(): this { return this; }
  }
  class Text extends Node {
    text: string;
    constructor(opts: { text?: string }) {
      super();
      this.text = opts?.text ?? '';
      this.width = this.text.length * 8;
    }
  }
  return { Container, Graphics, Text };
});

import { CombatEngine, type CombatConfig } from '@/game/combatEngine';
import { CombatView } from '@/render/combatView';
import { updateLayout } from '@/render/layout';

function makeEngine(overrides: Partial<CombatConfig> = {}): CombatEngine {
  const config: CombatConfig = {
    playerMaxHp: 70,
    playerHp: 70,
    maxEnergy: 3,
    handSize: 5,
    deck: ['strike', 'strike', 'strike', 'defend', 'defend'],
    enemies: ['slime'],
    seed: 42,
    ...overrides,
  };
  const engine = new CombatEngine(config);
  engine.start();
  return engine;
}

// Recursively find the deepest node whose registered 'pointertap' handler,
// when the container carries a card/enemy, drives the engine. We instead reach
// interactions through the view's private click methods for determinism.
type ClickableView = {
  render(): void;
  root: unknown;
  ['clickCard'](id: string): void;
  ['clickEnemy'](id: string): void;
  ['clickEndTurn'](): void;
};

describe('CombatView interaction', () => {
  let engine: CombatEngine;
  let view: CombatView;

  beforeEach(() => {
    engine = makeEngine();
    view = new CombatView(engine, () => {});
    view.render();
  });

  it('renders without throwing and builds a scene graph', () => {
    expect((view.root as { children: unknown[] }).children.length).toBeGreaterThan(0);
  });

  it('plays a single-target attack immediately against the lone enemy', () => {
    const enemy = engine.state.enemies[0];
    const hpBefore = enemy.hp;
    const strike = engine.state.hand.find((c) => c.definitionId === 'strike')!;
    (view as unknown as ClickableView).clickCard(strike.instanceId);
    // strike deals 6; slime has no block at combat start
    expect(engine.state.enemies[0].hp).toBe(hpBefore - 6);
    expect(engine.state.player.energy).toBe(2);
  });

  it('plays a self-target skill immediately', () => {
    const defend = engine.state.hand.find((c) => c.definitionId === 'defend')!;
    (view as unknown as ClickableView).clickCard(defend.instanceId);
    expect(engine.state.player.block).toBe(5);
  });

  it('does not play a card when energy is insufficient', () => {
    // drain energy to 0 by playing three strikes (cost 1 each) — but maxEnergy is 3
    const hand = () => engine.state.hand.filter((c) => c.definitionId === 'strike');
    for (let i = 0; i < 3; i++) {
      const s = hand()[0];
      if (s) (view as unknown as ClickableView).clickCard(s.instanceId);
    }
    expect(engine.state.player.energy).toBe(0);
    const leftover = engine.state.hand.find((c) => c.definitionId === 'defend');
    if (leftover) {
      const blockBefore = engine.state.player.block;
      (view as unknown as ClickableView).clickCard(leftover.instanceId);
      // defend costs 1, no energy left -> unchanged
      expect(engine.state.player.block).toBe(blockBefore);
    }
  });

  it('advances the turn on end-turn', () => {
    const turnBefore = engine.state.turn;
    (view as unknown as ClickableView).clickEndTurn();
    expect(engine.state.turn).toBe(turnBefore + 1);
  });

  it('enters target-selection mode with multiple enemies, then resolves on enemy click', () => {
    const multi = makeEngine({ enemies: ['slime', 'cultist'], deck: ['strike', 'strike', 'strike', 'strike', 'strike'] });
    const v = new CombatView(multi, () => {});
    v.render();
    const strike = multi.state.hand.find((c) => c.definitionId === 'strike')!;
    const targetEnemy = multi.state.enemies[1];
    const hpBefore = targetEnemy.hp;
    // first click selects the card (no target chosen yet) — no damage
    (v as unknown as ClickableView).clickCard(strike.instanceId);
    expect(multi.state.enemies.every((e, i) => e.hp === (i === 1 ? hpBefore : multi.state.enemies[i].hp))).toBe(true);
    // now click the specific enemy
    (v as unknown as ClickableView).clickEnemy(targetEnemy.entityId);
    const after = multi.state.enemies.find((e) => e.entityId === targetEnemy.entityId);
    expect(after!.hp).toBe(hpBefore - 6);
  });

  it('re-renders after playing to reflect the new hand size', () => {
    const before = engine.state.hand.length;
    const strike = engine.state.hand.find((c) => c.definitionId === 'strike')!;
    (view as unknown as ClickableView).clickCard(strike.instanceId);
    expect(engine.state.hand.length).toBe(before - 1);
    // render() already ran inside clickCard without throwing
    expect((view.root as { children: unknown[] }).children.length).toBeGreaterThan(0);
  });
});

describe('CombatView portrait mode', () => {
  // layout is a module singleton — flip to portrait for these tests, then
  // restore landscape so other suites are unaffected.
  beforeEach(() => {
    updateLayout(390, 844);
  });
  afterEach(() => {
    updateLayout(1280, 720);
  });

  it('renders in portrait without throwing (incl. 3-enemy row and outcome overlay)', () => {
    const engine = makeEngine({ enemies: ['sentry', 'sentry', 'sentry'] });
    const view = new CombatView(engine, () => {});
    expect(() => view.render()).not.toThrow();
    expect((view.root as { children: unknown[] }).children.length).toBeGreaterThan(0);
  });

  it('interactions still drive the engine in portrait', () => {
    const engine = makeEngine();
    const view = new CombatView(engine, () => {});
    view.render();
    const enemy = engine.state.enemies[0];
    const hpBefore = enemy.hp;
    const strike = engine.state.hand.find((c) => c.definitionId === 'strike')!;
    (view as unknown as ClickableView).clickCard(strike.instanceId);
    expect(engine.state.enemies[0].hp).toBe(hpBefore - 6);
    (view as unknown as ClickableView).clickEndTurn();
    expect(engine.state.turn).toBe(2);
  });

  it('renders a large hand with overlap without throwing', () => {
    const engine = makeEngine({
      handSize: 9,
      deck: Array(12).fill('defend'),
      maxEnergy: 99,
    });
    const view = new CombatView(engine, () => {});
    expect(() => view.render()).not.toThrow();
  });
});
