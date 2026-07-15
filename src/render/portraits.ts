import { Container, Graphics } from 'pixi.js';

// Procedural combatant portraits. No art assets: each enemy (and the player)
// gets a distinct geometric emblem drawn with plain Graphics, so every foe is
// recognizable at a glance. All emblems are centred on (0,0) and scaled by
// `size` (their bounding diameter). New enemy without an entry falls back to a
// neutral emblem — adding art is optional, never required.

type Draw = (g: Graphics, s: number) => void;

const PORTRAITS: Record<string, Draw> = {
  // 玩家 — 新星（Nova）：四芒星 + 光核
  player: (g, s) => {
    const r = s / 2;
    g.circle(0, 0, r * 0.95).fill({ color: 0x4dd8ff, alpha: 0.1 });
    g.poly([0, -r, r * 0.18, -r * 0.18, r, 0, r * 0.18, r * 0.18, 0, r, -r * 0.18, r * 0.18, -r, 0, -r * 0.18, -r * 0.18])
      .fill({ color: 0x4dd8ff, alpha: 0.9 });
    g.circle(0, 0, r * 0.22).fill(0xeafcff);
  },

  // 酸液史莱姆 — 绿色团块，高光 + 双眼
  slime: (g, s) => {
    const r = s / 2;
    g.ellipse(0, r * 0.15, r * 0.95, r * 0.7).fill({ color: 0x52e09a, alpha: 0.9 });
    g.ellipse(-r * 0.25, -r * 0.15, r * 0.35, r * 0.22).fill({ color: 0xd0ffe8, alpha: 0.35 });
    g.circle(-r * 0.28, r * 0.05, r * 0.09).fill(0x0a2a1a);
    g.circle(r * 0.18, r * 0.05, r * 0.09).fill(0x0a2a1a);
  },

  // 邪教徒 — 紫袍兜帽，阴影中的双目
  cultist: (g, s) => {
    const r = s / 2;
    g.poly([0, -r, r * 0.85, r, -r * 0.85, r]).fill({ color: 0x6b46b8, alpha: 0.95 });
    g.circle(0, -r * 0.25, r * 0.42).fill(0x1c1236);
    g.circle(-r * 0.15, -r * 0.22, r * 0.07).fill(0xff5a6a);
    g.circle(r * 0.15, -r * 0.22, r * 0.07).fill(0xff5a6a);
  },

  // 颚虫 — 分节虫体 + 尖颚
  jawWorm: (g, s) => {
    const r = s / 2;
    g.circle(r * 0.35, r * 0.3, r * 0.34).fill({ color: 0x9a5f2c, alpha: 0.9 });
    g.circle(0, r * 0.05, r * 0.42).fill({ color: 0xb5732f, alpha: 0.95 });
    g.circle(-r * 0.35, -r * 0.25, r * 0.5).fill(0xc98738);
    g.poly([-r * 0.75, -r * 0.5, -r * 0.15, -r * 0.62, -r * 0.4, -r * 0.15]).fill(0xf0e0c0);
    g.poly([-r * 0.05, -r * 0.62, r * 0.4, -r * 0.3, -r * 0.15, -r * 0.15]).fill(0xf0e0c0);
    g.circle(-r * 0.45, -r * 0.35, r * 0.08).fill(0x201008);
  },

  // 地精首领 — 赤红巨颅 + 金色双角
  gremlinNob: (g, s) => {
    const r = s / 2;
    g.poly([-r * 0.5, -r * 0.55, -r * 0.95, -r, -r * 0.35, -r * 0.85]).fill(0xffd54d);
    g.poly([r * 0.5, -r * 0.55, r * 0.95, -r, r * 0.35, -r * 0.85]).fill(0xffd54d);
    g.circle(0, 0, r * 0.75).fill({ color: 0xc4453a, alpha: 0.95 });
    g.rect(-r * 0.45, -r * 0.28, r * 0.36, r * 0.1).fill(0x701e16);
    g.rect(r * 0.09, -r * 0.28, r * 0.36, r * 0.1).fill(0x701e16);
    g.circle(-r * 0.27, -r * 0.1, r * 0.09).fill(0xffe08a);
    g.circle(r * 0.27, -r * 0.1, r * 0.09).fill(0xffe08a);
    g.rect(-r * 0.3, r * 0.32, r * 0.6, r * 0.12).fill(0x701e16);
  },

  // 哨卫 — 蓝色机械菱身 + 单目 + 天线
  sentry: (g, s) => {
    const r = s / 2;
    g.rect(-r * 0.04, -r, r * 0.08, r * 0.3).fill(0x8f9bc4);
    g.circle(0, -r, r * 0.08).fill(0x4dd8ff);
    g.poly([0, -r * 0.7, r * 0.8, 0, 0, r * 0.9, -r * 0.8, 0]).fill({ color: 0x2f6b9e, alpha: 0.95 });
    g.poly([0, -r * 0.45, r * 0.55, 0, 0, r * 0.62, -r * 0.55, 0]).fill({ color: 0x3fa9e8, alpha: 0.5 });
    g.circle(0, 0, r * 0.2).fill(0xffd54d);
    g.circle(0, 0, r * 0.09).fill(0x201a05);
  },

  // 守护者 — 紫金巨盾 + 能量核心
  guardian: (g, s) => {
    const r = s / 2;
    g.poly([0, -r, r * 0.85, -r * 0.45, r * 0.85, r * 0.35, 0, r, -r * 0.85, r * 0.35, -r * 0.85, -r * 0.45])
      .fill({ color: 0x5c3a9e, alpha: 0.95 })
      .stroke({ width: Math.max(2, s * 0.05), color: 0xffd54d, alpha: 0.9 });
    g.circle(0, 0, r * 0.34).fill({ color: 0xffd54d, alpha: 0.25 });
    g.circle(0, 0, r * 0.22).fill(0xffd54d);
    g.circle(0, 0, r * 0.1).fill(0xfff6d8);
  },
};

// 未登记的敌人：中性六边形徽记
function fallback(g: Graphics, s: number): void {
  const r = s / 2;
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
  }
  g.poly(pts).fill({ color: 0x55608a, alpha: 0.9 });
  g.circle(0, 0, r * 0.25).fill(0xe8ecff);
}

/** Build a portrait emblem for a combatant id ('player' or an enemy definition id). */
export function portrait(id: string, size: number): Container {
  const c = new Container();
  const g = new Graphics();
  (PORTRAITS[id] ?? fallback)(g, size);
  c.addChild(g);
  return c;
}
