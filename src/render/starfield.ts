import { Container, Graphics } from 'pixi.js';
import { layout } from '@/render/layout';
import { PX } from '@/render/pixelUi';

// The persistent pixel backdrop behind every view: a blocky star field with
// gentle twinkle, a few pixel nebulae (concentric alpha squares), and the
// silhouette of the Spire itself rising from the bottom of the screen with a
// pixel nova at its apex.
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

    // space gradient: deep base, slightly lighter toward the top (layered blocks)
    const bg = new Graphics().rect(0, 0, W, H).fill(PX.bgDeep);
    bg.rect(0, 0, W, H * 0.45).fill({ color: 0x151b38, alpha: 0.5 });
    bg.rect(0, 0, W, H * 0.2).fill({ color: 0x1b1440, alpha: 0.3 });
    this.root.addChild(bg);

    // nebulae: big concentric alpha squares (pixel analogue of soft blobs)
    const nebulae = [
      { x: W * 0.18, y: H * 0.22, r: Math.min(W, H) * 0.24, color: 0x2a2058 },
      { x: W * 0.85, y: H * 0.6, r: Math.min(W, H) * 0.3, color: 0x0f2c48 },
      { x: W * 0.6, y: H * 0.12, r: Math.min(W, H) * 0.18, color: 0x241a4e },
    ];
    for (const n of nebulae) {
      const g = new Graphics();
      g.rect(n.x - n.r * 1.6, n.y - n.r * 1.6, n.r * 3.2, n.r * 3.2).fill({ color: n.color, alpha: 0.05 });
      g.rect(n.x - n.r * 1.15, n.y - n.r * 1.15, n.r * 2.3, n.r * 2.3).fill({ color: n.color, alpha: 0.07 });
      g.rect(n.x - n.r * 0.7, n.y - n.r * 0.7, n.r * 1.4, n.r * 1.4).fill({ color: n.color, alpha: 0.09 });
      this.root.addChild(g);
    }

    // the Spire: a blocky tower silhouette rising into the field, windows lit
    const cx = W / 2;
    const baseW = Math.min(W * 0.16, 130);
    const u = Math.max(4, Math.round(baseW / 10));
    const spireH = u * 18;
    const spire = new Graphics();
    // stacked blocks tapering to the top
    spire.rect(cx - baseW / 2, H - u * 4, baseW, u * 4).fill({ color: PX.spire, alpha: 0.92 });
    spire.rect(cx - baseW / 2 + u, H - u * 8, baseW - u * 2, u * 4).fill({ color: PX.spire, alpha: 0.92 });
    spire.rect(cx - baseW / 2 + u * 2, H - u * 12, baseW - u * 4, u * 4).fill({ color: PX.spire, alpha: 0.92 });
    spire.rect(cx - u, H - u * 15, u * 2, u * 3).fill({ color: PX.spire, alpha: 0.92 });
    spire.rect(cx - u * 0.5, H - u * 17, u, u * 2).fill({ color: PX.spire, alpha: 0.92 });
    // lit windows scattered up the tower
    const winCols: Array<[number, number]> = [
      [cx - baseW / 4, H - u * 2],
      [cx + baseW / 5, H - u * 2],
      [cx - u * 2, H - u * 6],
      [cx + u, H - u * 6],
      [cx, H - u * 10],
      [cx - u * 0.5, H - u * 13],
    ];
    for (const [wx, wy] of winCols) {
      spire.rect(wx, wy, u, u).fill({ color: Math.random() < 0.5 ? PX.cyan : PX.gold, alpha: 0.4 });
    }
    this.root.addChild(spire);

    // pixel nova at the apex: concentric squares
    const apex = new Graphics();
    const ay = H - spireH - 6;
    apex.rect(cx - 16, ay - 16, 32, 32).fill({ color: PX.cyan, alpha: 0.06 });
    apex.rect(cx - 9, ay - 9, 18, 18).fill({ color: PX.cyan, alpha: 0.16 });
    apex.rect(cx - 4, ay - 4, 8, 8).fill({ color: 0xdff6ff, alpha: 0.95 });
    this.root.addChild(apex);

    // stars: density scales with area; drawn as small squares, a few larger
    const count = Math.round((W * H) / 8500);
    const palette = [PX.ink, 0xbfe8ff, 0xd8c8ff, 0xfff0c8];
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const large = Math.random() > 0.88;
      const s = large ? 2 : 1;
      const color = palette[Math.floor(Math.random() * palette.length)];
      g.rect(0, 0, s, s).fill(color);
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
