import { Container, Graphics } from 'pixi.js';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { PX, pxText, scanlines, pixelButton } from '@/render/pixelUi';

// TitleView — retro pixel / CRT skin. Pixel nova emblem, pixel tower
// silhouette, scattered pixel stars, CRT scanlines, and a `>` cursor menu.
// Palette + primitives come from pixelUi; the emblem and tower are title-
// specific block art kept local. Class interface is identical to the previous
// version so app.ts keeps working unchanged.

// Pixel nova emblem: an 8-point star built from blocks, with a bright core.
function pixelEmblem(cx: number, cy: number, r: number): Container {
  const c = new Container();
  c.x = cx;
  c.y = cy;
  const g = new Graphics();
  const u = Math.max(2, Math.round(r / 5));
  // cardinal arms
  g.rect(-u * 0.5, -r, u, r * 2).fill({ color: PX.cyan, alpha: 0.9 });
  g.rect(-r, -u * 0.5, r * 2, u).fill({ color: PX.cyan, alpha: 0.9 });
  // diagonal arms (slightly shorter)
  const d = r * 0.7;
  g.rect(-u * 0.5, -d, u, d * 2).fill({ color: PX.cyan, alpha: 0.55 });
  g.rect(-d, -u * 0.5, d * 2, u).fill({ color: PX.cyan, alpha: 0.55 });
  // bright core block
  g.rect(-u, -u, u * 2, u * 2).fill(PX.ink);
  g.rect(-u * 0.5, -u * 0.5, u, u).fill(PX.gold);
  // outer pixel corners
  g.rect(-r, -r, u, u).fill({ color: PX.cyan, alpha: 0.4 });
  g.rect(r - u, -r, u, u).fill({ color: PX.cyan, alpha: 0.4 });
  g.rect(-r, r - u, u, u).fill({ color: PX.cyan, alpha: 0.4 });
  g.rect(r - u, r - u, u, u).fill({ color: PX.cyan, alpha: 0.4 });
  c.addChild(g);
  return c;
}

// Pixel tower silhouette: stacked blocks tapering to a spire, with lit windows.
function pixelTower(cx: number, baseY: number, w: number): Container {
  const c = new Container();
  c.x = cx;
  c.y = baseY;
  const g = new Graphics();
  const u = Math.max(3, Math.round(w / 14));
  // base block
  g.rect(-w / 2, -u * 4, w, u * 4).fill(PX.spire);
  // mid block (narrower)
  g.rect(-w / 2 + u, -u * 8, w - u * 2, u * 4).fill(PX.spire);
  // upper block (narrower still)
  g.rect(-w / 2 + u * 2, -u * 12, w - u * 4, u * 4).fill(PX.spire);
  // spire
  g.rect(-u, -u * 15, u * 2, u * 3).fill(PX.spire);
  g.rect(-u * 0.5, -u * 17, u, u * 2).fill(PX.spire);
  // crenellations along the base top
  for (let i = -w / 2 + u; i < w / 2 - u; i += u * 2) {
    g.rect(i, -u * 4 - u, u, u).fill(PX.spire);
  }
  // lit windows (deterministic)
  const windows: Array<[number, number]> = [
    [-w / 2 + u * 1.5, -u * 2],
    [w / 2 - u * 2.5, -u * 2],
    [-u * 2, -u * 6],
    [u * 0.5, -u * 6],
    [-u * 0.5, -u * 10],
    [u * 0.2, -u * 13],
  ];
  for (const [wx, wy] of windows) {
    g.rect(wx, wy, u, u).fill(PX.gold);
  }
  // ground line
  g.rect(-w, 0, w * 2, 2).fill({ color: PX.cyan, alpha: 0.4 });
  c.addChild(g);
  return c;
}

export interface TitleActions {
  onNewRun: () => void;
  onContinue: () => void;
  onHowToPlay: () => void;
  onAbout: () => void;
}

export class TitleView {
  readonly root = new Container();

  constructor(
    private canContinue: boolean,
    private actions: TitleActions,
  ) {}

  render(): void {
    this.root.removeChildren();
    const cx = layout.W / 2;
    const portrait = layout.portrait;
    const topY = portrait ? layout.H * 0.14 : layout.H * 0.16;

    // ── scattered pixel stars background ──
    const stars = new Graphics();
    let seed = 1337;
    const starCount = portrait ? 40 : 50;
    for (let i = 0; i < starCount; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const sx = seed % layout.W;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const sy = seed % layout.H;
      const s = i % 5 === 0 ? 2 : 1;
      const a = 0.3 + (i % 7) * 0.08;
      stars.rect(sx, sy, s, s).fill({ color: PX.ink, alpha: a });
    }
    this.root.addChild(stars);

    // ── pixel tower silhouette near the bottom ──
    const towerW = portrait ? 160 : 200;
    const towerBaseY = portrait ? layout.H * 0.5 : layout.H * 0.46;
    const tower = pixelTower(cx, towerBaseY, towerW);
    // faint so it reads as a layered backdrop rather than competing with the wordmark
    tower.alpha = portrait ? 0.7 : 0.4;
    this.root.addChild(tower);

    // ── pixel nova emblem above the wordmark ──
    const emblemR = portrait ? 22 : 28;
    this.root.addChild(pixelEmblem(cx, topY, emblemR));

    // ── wordmark ──
    const titleSize = portrait ? 44 : 56;
    this.root.addChild(pxText('NOVA', titleSize, PX.text, cx, topY + emblemR + 18, 0.5, 0));
    this.root.addChild(pxText('SPIRE', titleSize, PX.cyan, cx, topY + emblemR + 18 + titleSize + 4, 0.5, 0));
    const subSize = portrait ? 18 : 22;
    this.root.addChild(pxText('新星之塔', subSize, PX.gold, cx, topY + emblemR + 18 + titleSize * 2 + 12, 0.5, 0));
    const taglineSize = portrait ? 11 : 12;
    this.root.addChild(pxText(L.ui.gameSubtitle, taglineSize, PX.subtle, cx, topY + emblemR + 18 + titleSize * 2 + 12 + subSize + 10, 0.5, 0));

    // ── menu buttons ──
    const btnW = portrait ? layout.W - 120 : 320;
    let by = portrait ? layout.H * 0.62 : layout.H * 0.6;
    const step = 64;

    if (this.canContinue) {
      this.root.addChild(pixelButton(L.ui.menuContinue, cx - btnW / 2, by, this.actions.onContinue, { width: btnW, height: 50, fontSize: 17, variant: 'primary' }));
      by += step;
    }
    this.root.addChild(pixelButton(L.ui.menuNewRun, cx - btnW / 2, by, this.actions.onNewRun, { width: btnW, height: 50, fontSize: 17, variant: 'primary' }));
    by += step;
    // secondary row: how-to-play + about side by side
    const halfW = (btnW - 14) / 2;
    this.root.addChild(pixelButton(L.ui.menuHowToPlay, cx - btnW / 2, by, this.actions.onHowToPlay, { width: halfW, height: 44, fontSize: 14, variant: 'ghost' }));
    this.root.addChild(pixelButton(L.ui.menuAbout, cx - btnW / 2 + halfW + 14, by, this.actions.onAbout, { width: halfW, height: 44, fontSize: 14, variant: 'ghost' }));

    // ── full-screen CRT scanlines overlay ──
    const crt = new Graphics();
    scanlines(crt, 0, 0, layout.W, layout.H, 3, 0.08);
    // subtle vignette frame
    crt.rect(0, 0, layout.W, 3).fill({ color: 0x000000, alpha: 0.5 });
    crt.rect(0, layout.H - 3, layout.W, 3).fill({ color: 0x000000, alpha: 0.5 });
    crt.rect(0, 0, 3, layout.H).fill({ color: 0x000000, alpha: 0.5 });
    crt.rect(layout.W - 3, 0, 3, layout.H).fill({ color: 0x000000, alpha: 0.5 });
    this.root.addChild(crt);
  }
}
