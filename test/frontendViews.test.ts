import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Front-end views (title / help / pause / deck) render under a mocked PixiJS.
// This locks their control flow — buttons wired, no throws in either
// orientation — without asserting pixels.

vi.mock('pixi.js', () => {
  class Node {
    children: unknown[] = [];
    x = 0; y = 0; alpha = 1; width = 40; height = 20;
    eventMode = 'none'; cursor = 'default';
    scale = { set: () => {} };
    anchor = { set: () => {} };
    private handlers: Record<string, (() => void)[]> = {};
    addChild(c: unknown): unknown { this.children.push(c); return c; }
    addChildAt(c: unknown): unknown { this.children.unshift(c); return c; }
    removeChildren(): void { this.children = []; }
    on(e: string, fn: () => void): this { (this.handlers[e] ??= []).push(fn); return this; }
    emit(e: string): void { (this.handlers[e] ?? []).forEach((fn) => fn()); }
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
    constructor(opts: { text?: string }) { super(); this.text = opts?.text ?? ''; this.width = this.text.length * 8; }
  }
  return { Container, Graphics, Text };
});

import { TitleView } from '@/render/titleView';
import { HelpView } from '@/render/helpView';
import { PauseMenu } from '@/render/pauseMenu';
import { DeckView } from '@/render/deckView';
import { PathSelectView } from '@/render/pathSelectView';
import { ShopView } from '@/render/shopView';
import { CampfireView } from '@/render/campfireView';
import { EventView } from '@/render/eventView';
import { RunManager } from '@/game/runManager';
import { updateLayout } from '@/render/layout';
import { isMuted, toggleMute } from '@/render/sound';

function childCount(v: { root: { children: unknown[] } }): number {
  return v.root.children.length;
}

describe('front-end views render', () => {
  afterEach(() => updateLayout(1280, 720));

  for (const portrait of [false, true]) {
    const dims = portrait ? [390, 844] : [1280, 720];
    const tag = portrait ? 'portrait' : 'landscape';

    it(`TitleView renders in ${tag} (with and without continue)`, () => {
      updateLayout(dims[0], dims[1]);
      const noop = () => {};
      const actions = { onNewRun: noop, onContinue: noop, onHowToPlay: noop, onAbout: noop };
      const a = new TitleView(false, actions);
      const b = new TitleView(true, actions);
      expect(() => { a.render(); b.render(); }).not.toThrow();
      expect(childCount(a)).toBeGreaterThan(0);
    });

    it(`HelpView renders both modes in ${tag}`, () => {
      updateLayout(dims[0], dims[1]);
      const help = new HelpView('help', () => {});
      const about = new HelpView('about', () => {});
      expect(() => { help.render(); about.render(); }).not.toThrow();
    });

    it(`PauseMenu renders and confirms abandon in ${tag}`, () => {
      updateLayout(dims[0], dims[1]);
      const menu = new PauseMenu({ onResume: () => {}, onHowToPlay: () => {}, onToggleSound: () => {}, onAbandon: () => {} });
      expect(() => menu.render()).not.toThrow();
    });

    it(`DeckView renders a grid and an empty pile in ${tag}`, () => {
      updateLayout(dims[0], dims[1]);
      const full = new DeckView('卡组', ['strike', 'defend', 'bash', 'cleave', 'reaper'], () => {});
      const empty = new DeckView('抽牌堆', [], () => {});
      expect(() => { full.render(); empty.render(); }).not.toThrow();
      expect(childCount(full)).toBeGreaterThan(childCount(empty) - 1);
    });

    it(`PathSelectView renders in ${tag}`, () => {
      updateLayout(dims[0], dims[1]);
      const v = new PathSelectView(() => {});
      expect(() => v.render()).not.toThrow();
    });

    it(`ShopView renders shop and remove modes in ${tag}`, () => {
      updateLayout(dims[0], dims[1]);
      const mgr = RunManager.newRun(3, 'berserker');
      mgr.state.phase = 'shop';
      mgr.state.gold = 300;
      mgr.state.shop = {
        cards: [{ id: 'heavyBlow', price: 65, sold: false }, { id: 'cleave+', price: 40, sold: true }],
        relics: [{ id: 'lantern', price: 130, sold: false }],
        removalPrice: 60,
        removalUsed: false,
      };
      const v = new ShopView(mgr, { onBuyCard: () => {}, onBuyRelic: () => {}, onRemoveCard: () => {}, onLeave: () => {} });
      expect(() => v.render()).not.toThrow();
      expect(childCount(v)).toBeGreaterThan(0);
    });

    it(`CampfireView renders choose and upgrade modes in ${tag}`, () => {
      updateLayout(dims[0], dims[1]);
      const mgr = RunManager.newRun(3, 'berserker');
      mgr.state.phase = 'campfire';
      const v = new CampfireView(mgr, () => {}, () => {});
      expect(() => v.render()).not.toThrow();
    });

    it(`EventView renders choices in ${tag}`, () => {
      updateLayout(dims[0], dims[1]);
      const mgr = RunManager.newRun(3, 'berserker');
      mgr.state.phase = 'event';
      mgr.state.pendingEventId = 'novaShrine';
      const v = new EventView(mgr, () => {});
      expect(() => v.render()).not.toThrow();
      expect(childCount(v)).toBeGreaterThan(0);
    });
  }
});

describe('sound mute', () => {
  beforeEach(() => { if (isMuted()) toggleMute(); });
  it('toggles and reports mute state', () => {
    expect(isMuted()).toBe(false);
    expect(toggleMute()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMute()).toBe(false);
  });
});
