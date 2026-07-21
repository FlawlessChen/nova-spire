import { Container, Graphics } from 'pixi.js';
import { PX } from '@/render/pixelUi';

// Procedural combatant portraits (retro pixel skin). No art assets: each enemy
// (and the player) gets a distinct blocky emblem drawn with plain Graphics —
// squares and polygons instead of smooth circles/ellipses — so every foe is
// recognizable at a glance and the portraits match the pixel UI. All emblems
// are centred on (0,0) and scaled by `size` (their bounding diameter). New
// enemy without an entry falls back to a neutral emblem.

type Draw = (g: Graphics, s: number) => void;

// square centred at (x, y) with half-size r
function sq(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.rect(x - r, y - r, r * 2, r * 2).fill({ color, alpha });
}

const PORTRAITS: Record<string, Draw> = {
  // 玩家 — 新星（Nova）：四芒星 + 方形光核
  player: (g, s) => {
    const r = s / 2;
    sq(g, 0, 0, r * 0.95, PX.cyan, 0.1);
    g.poly([0, -r, r * 0.18, -r * 0.18, r, 0, r * 0.18, r * 0.18, 0, r, -r * 0.18, r * 0.18, -r, 0, -r * 0.18, -r * 0.18])
      .fill({ color: PX.cyan, alpha: 0.9 });
    sq(g, 0, 0, r * 0.22, PX.ink);
  },

  // 酸液史莱姆 — 绿色方块团块，高光 + 双眼
  slime: (g, s) => {
    const r = s / 2;
    g.rect(-r * 0.95, r * 0.15 - r * 0.7, r * 1.9, r * 1.4).fill({ color: PX.green, alpha: 0.9 });
    sq(g, -r * 0.25, -r * 0.15, r * 0.3, 0xd0ffe8, 0.35);
    sq(g, -r * 0.28, r * 0.05, r * 0.1, PX.bgInner);
    sq(g, r * 0.18, r * 0.05, r * 0.1, PX.bgInner);
  },

  // 邪教徒 — 紫袍兜帽，阴影中的双目
  cultist: (g, s) => {
    const r = s / 2;
    g.poly([0, -r, r * 0.85, r, -r * 0.85, r]).fill({ color: PX.purple, alpha: 0.95 });
    sq(g, 0, -r * 0.25, r * 0.42, PX.bgInner);
    sq(g, -r * 0.15, -r * 0.22, r * 0.08, PX.red);
    sq(g, r * 0.15, -r * 0.22, r * 0.08, PX.red);
  },

  // 颚虫 — 分节方块虫体 + 尖颚
  jawWorm: (g, s) => {
    const r = s / 2;
    sq(g, r * 0.35, r * 0.3, r * 0.34, PX.orange, 0.9);
    sq(g, 0, r * 0.05, r * 0.42, PX.orange, 0.95);
    sq(g, -r * 0.35, -r * 0.25, r * 0.5, PX.gold);
    g.poly([-r * 0.75, -r * 0.5, -r * 0.15, -r * 0.62, -r * 0.4, -r * 0.15]).fill(PX.ink);
    g.poly([-r * 0.05, -r * 0.62, r * 0.4, -r * 0.3, -r * 0.15, -r * 0.15]).fill(PX.ink);
    sq(g, -r * 0.45, -r * 0.35, r * 0.09, PX.bgInner);
  },

  // 虚空水蛭 — 紫色方环与吸能核心
  voidLeech: (g, s) => {
    const r = s / 2;
    g.rect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64).stroke({ width: Math.max(4, s * 0.14), color: PX.purple, alpha: 0.9 });
    sq(g, 0, 0, r * 0.48, PX.bgInner, 0.95);
    sq(g, 0, 0, r * 0.2, PX.pink);
    sq(g, -r * 0.5, -r * 0.45, r * 0.1, 0xd9c7ff);
  },

  // 尖塔无人机 — 青色悬浮机体与三角翼
  spireDrone: (g, s) => {
    const r = s / 2;
    g.poly([0, -r, r * 0.9, r * 0.5, 0, r * 0.25, -r * 0.9, r * 0.5])
      .fill({ color: PX.panelPlayer, alpha: 0.95 })
      .stroke({ width: Math.max(2, s * 0.04), color: PX.cyan, alpha: 0.85 });
    sq(g, 0, -r * 0.05, r * 0.27, PX.cyan);
    sq(g, 0, -r * 0.05, r * 0.11, PX.ink);
    g.rect(-r * 0.7, r * 0.58, r * 1.4, r * 0.1).fill({ color: PX.cyan, alpha: 0.5 });
  },

  // 地精首领 — 赤红巨颅 + 金色双角
  gremlinNob: (g, s) => {
    const r = s / 2;
    g.poly([-r * 0.5, -r * 0.55, -r * 0.95, -r, -r * 0.35, -r * 0.85]).fill(PX.gold);
    g.poly([r * 0.5, -r * 0.55, r * 0.95, -r, r * 0.35, -r * 0.85]).fill(PX.gold);
    sq(g, 0, 0, r * 0.75, PX.red, 0.95);
    g.rect(-r * 0.45, -r * 0.28, r * 0.36, r * 0.1).fill(PX.bgInner);
    g.rect(r * 0.09, -r * 0.28, r * 0.36, r * 0.1).fill(PX.bgInner);
    sq(g, -r * 0.27, -r * 0.1, r * 0.09, 0xffe08a);
    sq(g, r * 0.27, -r * 0.1, r * 0.09, 0xffe08a);
    g.rect(-r * 0.3, r * 0.32, r * 0.6, r * 0.12).fill(PX.bgInner);
  },

  // 哨卫 — 蓝色机械菱身 + 单目 + 天线
  sentry: (g, s) => {
    const r = s / 2;
    g.rect(-r * 0.04, -r, r * 0.08, r * 0.3).fill(PX.subtle);
    sq(g, 0, -r, r * 0.08, PX.cyan);
    g.poly([0, -r * 0.7, r * 0.8, 0, 0, r * 0.9, -r * 0.8, 0]).fill({ color: PX.panelPlayer, alpha: 0.95 });
    g.poly([0, -r * 0.45, r * 0.55, 0, 0, r * 0.62, -r * 0.55, 0]).fill({ color: PX.cyan, alpha: 0.5 });
    sq(g, 0, 0, r * 0.2, PX.gold);
    sq(g, 0, 0, r * 0.09, PX.bgInner);
  },

  // 守护者 — 紫金巨盾 + 能量核心
  guardian: (g, s) => {
    const r = s / 2;
    g.poly([0, -r, r * 0.85, -r * 0.45, r * 0.85, r * 0.35, 0, r, -r * 0.85, r * 0.35, -r * 0.85, -r * 0.45])
      .fill({ color: PX.purple, alpha: 0.95 })
      .stroke({ width: Math.max(2, s * 0.05), color: PX.gold, alpha: 0.9 });
    sq(g, 0, 0, r * 0.34, PX.gold, 0.25);
    sq(g, 0, 0, r * 0.22, PX.gold);
    sq(g, 0, 0, r * 0.1, PX.ink);
  },

  // 星界泰坦 — 星环包围的深空巨核
  astralTitan: (g, s) => {
    const r = s / 2;
    g.rect(-r, -r * 0.38, r * 2, r * 0.76).stroke({ width: Math.max(2, s * 0.04), color: PX.gold, alpha: 0.8 });
    sq(g, 0, 0, r * 0.72, PX.bgInner, 0.98);
    g.poly([0, -r * 0.62, r * 0.18, -r * 0.18, r * 0.62, 0, r * 0.18, r * 0.18, 0, r * 0.62, -r * 0.18, r * 0.18, -r * 0.62, 0, -r * 0.18, -r * 0.18])
      .fill(PX.gold);
    sq(g, 0, 0, r * 0.16, PX.ink);
  },
};

// 未登记的敌人：中性方块徽记
function fallback(g: Graphics, s: number): void {
  const r = s / 2;
  g.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7).fill({ color: PX.subtle, alpha: 0.9 });
  sq(g, 0, 0, r * 0.25, PX.text);
}

/** Build a portrait emblem for a combatant id ('player' or an enemy definition id). */
export function portrait(id: string, size: number): Container {
  const c = new Container();
  const g = new Graphics();
  (PORTRAITS[id] ?? fallback)(g, size);
  c.addChild(g);
  return c;
}
