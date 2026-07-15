import { Container, Graphics } from 'pixi.js';
import { layout } from '@/render/layout';
import { UI } from '@/render/ui';

// The persistent deep-space backdrop behind every view: a star field with
// gentle twinkle, a few soft nebulae, and the silhouette of the Spire itself
// rising from the bottom of the screen with a glowing nova at its apex.
//
// Purely cosmetic — drawn with plain Graphics (no assets, no filters), uses
// Math.random freely (never touches the seeded game RNG), and skips its
// animation loop where rAF doesn't exist (tests/SSR). Rebuild on orientation
// change via build().

interface Star {
  g: Graphics;
  base: number;   // resting alpha
  phase: number;
  speed: number;
}

export class Starfield {
  readonly root = new Container();
  private stars: Star[] = [];
  private running = false;

  /** (Re)draw for the current layout. Call once at boot and on rotation. */
  build(): void {
    this.root.removeChildren();
    this.stars = [];
    const { W, H } = layout;

    // space gradient: deep base, slightly lighter violet toward the top
    const bg = new Graphics().rect(0, 0, W, H).fill(UI.bgDeep);
    bg.rect(0, 0, W, H * 0.45).fill({ color: 0x151b38, alpha: 0.5 });
    bg.rect(0, 0, W, H * 0.2).fill({ color: 0x1b1440, alpha: 0.3 });
    this.root.addChild(bg);

    // nebulae: big soft blobs, layered alpha rings
    const nebulae = [
      { x: W * 0.18, y: H * 0.22, r: Math.min(W, H) * 0.24, color: 0x2a2058 },
      { x: W * 0.85, y: H * 0.6, r: Math.min(W, H) * 0.3, color: 0x0f2c48 },
      { x: W * 0.6, y: H * 0.12, r: Math.min(W, H) * 0.18, color: 0x241a4e },
    ];
    for (const n of nebulae) {
      const g = new Graphics();
      g.circle(n.x, n.y, n.r * 1.6).fill({ color: n.color, alpha: 0.05 });
      g.circle(n.x, n.y, n.r * 1.15).fill({ color: n.color, alpha: 0.07 });
      g.circle(n.x, n.y, n.r * 0.7).fill({ color: n.color, alpha: 0.09 });
      this.root.addChild(g);
    }

    // the Spire: a faint tower silhouette rising into the field, windows lit
    const cx = W / 2;
    const baseW = Math.min(W * 0.16, 130);
    const topW = baseW * 0.3;
    const spireH = H * 0.42;
    const spire = new Graphics();
    spire.poly([
      cx - baseW / 2, H,
      cx - topW / 2, H - spireH,
      cx + topW / 2, H - spireH,
      cx + baseW / 2, H,
    ]).fill({ color: 0x0c1226, alpha: 0.92 });
    // lit windows scattered up the tower
    for (let i = 0; i < 9; i++) {
      const t = (i + 1) / 10;
      const rowW = baseW + (topW - baseW) * t;
      const wy = H - spireH * t + 6;
      const wx = cx + (Math.random() - 0.5) * (rowW - 18);
      spire.rect(wx, wy, 3, 5).fill({ color: Math.random() < 0.5 ? UI.accent : UI.gold, alpha: 0.35 });
    }
    this.root.addChild(spire);
    // nova at the apex
    const apex = new Graphics();
    const ay = H - spireH - 10;
    apex.circle(cx, ay, 18).fill({ color: UI.accent, alpha: 0.08 });
    apex.circle(cx, ay, 10).fill({ color: UI.accent, alpha: 0.18 });
    apex.circle(cx, ay, 4).fill({ color: 0xdff6ff, alpha: 0.95 });
    this.root.addChild(apex);

    // stars: density scales with area; a few larger, most tiny
    const count = Math.round((W * H) / 8500);
    const palette = [0xffffff, 0xbfe8ff, 0xd8c8ff, 0xfff0c8];
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const large = Math.random() > 0.88;
      const r = large ? 1.8 + Math.random() * 1.4 : 0.7 + Math.random() * 1.1;
      const color = palette[Math.floor(Math.random() * palette.length)];
      g.circle(0, 0, r).fill(color);
      g.x = Math.random() * W;
      g.y = Math.random() * H;
      const base = 0.25 + Math.random() * 0.55;
      g.alpha = base;
      this.root.addChild(g);
      this.stars.push({ g, base, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.6 });
    }
  }

  /** Gentle twinkle. No-ops where requestAnimationFrame is unavailable. */
  start(): void {
    if (this.running || typeof requestAnimationFrame === 'undefined') return;
    this.running = true;
    const tick = (): void => {
      for (const s of this.stars) {
        s.phase += s.speed * 0.02;
        s.g.alpha = Math.max(0.08, Math.min(1, s.base + Math.sin(s.phase) * 0.2));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
