import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { IconKey } from '@/render/artAssets';
import { ICONS } from '@/render/artAssets';

// Pixel / CRT design system — the single source of truth for the retro pixel
// skin every view shares. Sharp vector blocks, clean CJK sans for readability,
// CRT scanlines, PICO-8 / DB16-inspired palette. Replaces the smooth ui.ts
// primitives for the pixel restyle.

// Clean CJK sans for in-game text — keeps Chinese readable (the old bitmap
// Zpix face was too small on cards) while the block graphics keep the pixel
// soul. Pixel/CRT headings (titles, emblems) are drawn, not typeset, so
// they stay crisp & retro regardless of this choice.
export const PIXEL_FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

export const PX = {
  // base surfaces
  bgDeep: 0x000000,
  bg: 0x1a1c2c,
  bgInner: 0x0d0e18,
  panel: 0x1a1c2c,
  panelEnemy: 0x2a1a3a,
  panelPlayer: 0x1a2a4a,
  panelBorder: 0x5fcde4,
  overlay: 0x000000,
  spire: 0x3a3a4e,
  // accents
  cyan: 0x5fcde4,
  gold: 0xd8a824,
  red: 0xac3232,
  green: 0x6abe30,
  purple: 0x9d4dff,
  orange: 0xffa300,
  pink: 0xff77a8,
  // text
  text: 0xe8e8e8,
  subtle: 0x8b8b8b,
  ink: 0xffffff,
  // combat semantics
  hpPlayer: 0x6abe30,
  hpEnemy: 0xac3232,
  block: 0x5fcde4,
  energy: 0xd8a824,
  selected: 0xd8a824,
  // statuses
  weak: 0x9d4dff,
  vulnerable: 0xffa300,
  poison: 0x6abe30,
  strength: 0xd8a824,
  // paths
  pathWarrior: 0xac3232,
  pathMage: 0x9d4dff,
  pathRogue: 0x6abe30,
  // buttons
  buttonPrimary: 0x1a1c2c,
  buttonAlt: 0x1a3a2a,
  buttonDanger: 0xac3232,
  buttonGhost: 0x2a2a3a,
} as const;

// ── text ──
export function pxText(
  text: string,
  size: number,
  color: number,
  x = 0,
  y = 0,
  anchorX = 0,
  anchorY = 0,
  alpha = 1,
): Text {
  const t = new Text({
    text,
    style: { fill: color, fontSize: size, fontFamily: PIXEL_FONT, fontWeight: '400' },
  });
  t.anchor.set(anchorX, anchorY);
  t.x = x;
  t.y = y;
  t.alpha = alpha;
  return t;
}

/** Wrapped paragraph text in the pixel font. */
export function pxWrapped(
  text: string,
  size: number,
  color: number,
  width: number,
  x = 0,
  y = 0,
  align: 'left' | 'center' = 'center',
): Text {
  const t = new Text({
    text,
    style: {
      fill: color,
      fontSize: size,
      fontFamily: PIXEL_FONT,
      align,
      wordWrap: true,
      wordWrapWidth: width,
      lineHeight: size + 6,
    },
  });
  t.anchor.set(align === 'center' ? 0.5 : 0, 0);
  t.x = x;
  t.y = y;
  return t;
}

/** Legacy-signature label: single `anchor` derives Y anchor (0.5 iff anchor==0.5). */
export function pxLabel(
  text: string,
  size: number,
  color: number,
  x = 0,
  y = 0,
  anchor = 0,
  alpha = 1,
): Text {
  return pxText(text, size, color, x, y, anchor, anchor === 0.5 ? 0.5 : 0, alpha);
}

// ── scanlines ──
/** CRT scanlines: horizontal darkening every `period` px. Batched rects. */
export function scanlines(g: Graphics, x: number, y: number, w: number, h: number, period = 3, alpha = 0.1): void {
  for (let sy = y; sy < y + h; sy += period) {
    g.rect(x, sy, w, 1).fill({ color: 0x000000, alpha });
  }
}

// ── diamond gem ──
/** Clean pixel gem: a square rotated 45° (diamond) with a 1px inner highlight
 *  and an optional centred label. Used for card cost + player energy orb so the
 *  two read as the same motif. `size` is the diamond's edge length (pre-rotate). */
export interface PixelGemOpts {
  fillAlpha?: number;
  label?: string;
  labelColor?: number;
  labelSize?: number;
}
export function pixelGem(
  size: number,
  fill: number,
  border: number,
  x: number,
  y: number,
  opts: PixelGemOpts = {},
): Container {
  const c = new Container();
  c.x = x;
  c.y = y;
  const g = new Graphics();
  // dark backing block (slightly larger, behind the diamond)
  g.rect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4).fill(0x000000);
  // rotated diamond: outline + filled centre
  const dia = new Graphics();
  dia.rect(-size / 2, -size / 2, size, size)
    .fill({ color: fill, alpha: opts.fillAlpha ?? 0.3 })
    .stroke({ width: 2, color: border, alpha: 1 });
  dia.rotation = Math.PI / 4;
  // 1px specular highlight (top-left of the rotated square)
  dia.rect(-size / 2 + 3, -size / 2 + 3, 3, 3).fill({ color: PX.ink, alpha: 0.6 });
  c.addChild(g);
  c.addChild(dia);
  if (opts.label !== undefined) {
    const ls = opts.labelSize ?? Math.max(11, Math.round(size * 0.42));
    c.addChild(pxText(opts.label, ls, opts.labelColor ?? 0x2a1a05, 0, 0, 0.5, 0.5));
  }
  return c;
}

// ── button ──
export type PixelButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface PixelButtonOpts {
  width?: number;
  height?: number;
  fontSize?: number;
  enabled?: boolean;
  variant?: PixelButtonVariant;
  icon?: IconKey;
  cursor?: boolean; // show `>` cursor prefix (default true)
}

const VARIANT_BORDER: Record<PixelButtonVariant, number> = {
  primary: PX.gold,
  secondary: PX.cyan,
  ghost: PX.subtle,
  danger: PX.red,
};
const VARIANT_FILL: Record<PixelButtonVariant, number> = {
  primary: PX.buttonPrimary,
  secondary: PX.buttonPrimary,
  ghost: PX.buttonGhost,
  danger: PX.buttonDanger,
};

export function pixelButton(
  text: string,
  x: number,
  y: number,
  onClick: () => void,
  opts: PixelButtonOpts = {},
): Container {
  const w = opts.width ?? 200;
  const h = opts.height ?? 52;
  const enabled = opts.enabled ?? true;
  const fontSize = opts.fontSize ?? 18;
  const variant = opts.variant ?? 'secondary';
  const showCursor = opts.cursor ?? true;
  const c = new Container();
  c.x = x;
  c.y = y;
  c.alpha = enabled ? 1 : 0.45;

  const border = VARIANT_BORDER[variant];
  const fill = VARIANT_FILL[variant];
  const g = new Graphics();
  // shadow block
  g.rect(2, 3, w, h).fill({ color: 0x000000, alpha: 0.6 });
  // body
  g.rect(0, 0, w, h).fill(fill).stroke({ width: 2, color: border, alpha: 1 });
  // 1px inner highlight
  g.rect(2, 2, w - 4, 1).fill({ color: PX.ink, alpha: 0.12 });
  // corner rivets
  g.rect(2, 2, 2, 2).fill(border);
  g.rect(w - 4, 2, 2, 2).fill(border);
  g.rect(2, h - 4, 2, 2).fill(border);
  g.rect(w - 4, h - 4, 2, 2).fill(border);
  c.addChild(g);

  // leading glyph: either an icon sprite or a `>` cursor
  let textX = 12;
  if (opts.icon) {
    const icon = Sprite.from(ICONS[opts.icon]);
    const size = Math.min(24, h * 0.5);
    icon.width = size;
    icon.height = size;
    icon.x = 12;
    icon.y = (h - size) / 2;
    c.addChild(icon);
    textX = 12 + size + 8;
  } else if (showCursor) {
    const cursor = pxText('>', fontSize, border, 12, h / 2, 0, 0.5);
    c.addChild(cursor);
    textX = 12 + cursor.width + 8;
  }
  c.addChild(pxText(text, fontSize, PX.text, textX, h / 2, 0, 0.5));

  if (enabled) {
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', onClick);
    const press = (): void => {
      c.scale.set(0.97);
      c.x = x + w * 0.015;
      c.y = y + h * 0.015;
    };
    const release = (): void => {
      c.scale.set(1);
      c.x = x;
      c.y = y;
    };
    c.on('pointerdown', press);
    c.on('pointerup', release);
    c.on('pointerupoutside', release);
  }
  return c;
}

// ── panel ──
export interface PixelPanelOpts {
  color?: number;
  border?: number;
  titleBar?: number; // coloured strip along the top
  scanlines?: boolean;
  radius?: number; // ignored — kept for signature compat, always sharp
}

/** Sharp-rect pixel panel: shadow, body, double border, corner rivets. */
export function pixelPanel(w: number, h: number, opts: PixelPanelOpts = {}): Container {
  const c = new Container();
  const color = opts.color ?? PX.panel;
  const border = opts.border ?? PX.panelBorder;
  const g = new Graphics();
  g.rect(3, 4, w, h).fill({ color: 0x000000, alpha: 0.5 });
  g.rect(0, 0, w, h).fill(color).stroke({ width: 2, color: border, alpha: 0.9 });
  g.rect(2, 2, w - 4, h - 4).stroke({ width: 1, color: border, alpha: 0.3 });
  // corner rivets
  g.rect(2, 2, 2, 2).fill(border);
  g.rect(w - 4, 2, 2, 2).fill(border);
  g.rect(2, h - 4, 2, 2).fill(border);
  g.rect(w - 4, h - 4, 2, 2).fill(border);
  if (opts.titleBar !== undefined) {
    g.rect(0, 0, w, 4).fill(opts.titleBar);
  }
  if (opts.scanlines) scanlines(g, 2, 2, w - 4, h - 4, 3, 0.08);
  c.addChild(g);
  return c;
}

// ── overlay ──
/** Full-screen dim with optional CRT scanlines + vignette. */
export function pixelOverlay(w: number, h: number, alpha = 0.88, withScanlines = true): Container {
  const c = new Container();
  const g = new Graphics();
  g.rect(0, 0, w, h).fill({ color: PX.overlay, alpha });
  if (withScanlines) scanlines(g, 0, 0, w, h, 3, 0.08);
  // vignette frame
  g.rect(0, 0, w, 3).fill({ color: 0x000000, alpha: 0.5 });
  g.rect(0, h - 3, w, 3).fill({ color: 0x000000, alpha: 0.5 });
  g.rect(0, 0, 3, h).fill({ color: 0x000000, alpha: 0.5 });
  g.rect(w - 3, 0, 3, h).fill({ color: 0x000000, alpha: 0.5 });
  c.addChild(g);
  return c;
}

// ── progress bar ──
/** Sharp-rect HP / progress bar with centered label. */
export function pixelBar(w: number, h: number, fraction: number, fillColor: number, label?: string): Container {
  const c = new Container();
  const frac = Math.max(0, Math.min(1, fraction));
  const g = new Graphics();
  // bg
  g.rect(0, 0, w, h).fill(PX.bgInner).stroke({ width: 1, color: PX.panelBorder, alpha: 0.9 });
  // fill
  if (frac > 0) {
    const fw = Math.max(2, Math.floor((w - 4) * frac));
    g.rect(2, 2, fw, h - 4).fill(fillColor);
    // 1px highlight along the top of the fill
    g.rect(2, 2, fw, 1).fill({ color: PX.ink, alpha: 0.25 });
  }
  c.addChild(g);
  if (label) {
    c.addChild(pxText(label, Math.max(10, Math.round(h * 0.62)), PX.text, w / 2, h / 2, 0.5, 0.5));
  }
  return c;
}

// ── pill (status / relic / tag) ──
/** Sharp-rect pill: coloured fill + 1px border + label. */
export function pixelPill(text: string, color: number, fontSize = 13): Container {
  const c = new Container();
  const lbl = pxText(text, fontSize, PX.ink, 0, 0, 0, 0);
  const w = lbl.width + 12;
  const h = Math.max(18, fontSize + 6);
  const g = new Graphics();
  g.rect(0, 0, w, h).fill({ color, alpha: 0.9 }).stroke({ width: 1, color: 0x000000, alpha: 0.5 });
  c.addChild(g);
  lbl.x = 6;
  lbl.y = h / 2;
  lbl.anchor.set(0, 0.5);
  c.addChild(lbl);
  return c;
}

// ── glow (blocky) ──
/** Concentric squares — a pixel analogue of glowCircle. */
export function pixelGlow(x: number, y: number, r: number, color: number, coreAlpha = 0.9): Graphics {
  const g = new Graphics();
  g.rect(x - r * 2, y - r * 2, r * 4, r * 4).fill({ color, alpha: 0.06 });
  g.rect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8).fill({ color, alpha: 0.12 });
  g.rect(x - r, y - r, r * 2, r * 2).fill({ color, alpha: coreAlpha });
  return g;
}
