import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { ICONS, type IconKey } from '@/render/artAssets';

// Shared PixiJS UI primitives + the deep-space design tokens ("Nova Spire"
// theme: sci-fi starfield, mysterious tower). Every view pulls colors from UI
// so the palette can be retuned in one place.

export const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

export const UI = {
  // base
  bgDeep: 0x0a0e1c,       // page/space background
  panel: 0x141a2e,        // card/panel surface
  panelBorder: 0x2e3a5c,  // hairline panel border
  overlay: 0x060912,      // full-screen dim
  // accents
  accent: 0x4dd8ff,       // cyan — primary sci-fi accent
  accent2: 0x9d6bff,      // violet — secondary / arcane
  gold: 0xffd54d,         // energy / rare / rewards
  danger: 0xff5a6a,
  good: 0x52e09a,
  // text
  text: 0xe8ecff,
  subtle: 0x8f9bc4,
  // buttons
  button: 0x1c2d52,
  buttonAlt: 0x1d4636,
  buttonText: 0xeafcff,
} as const;

export function label(
  text: string,
  size: number,
  color: number,
  x = 0,
  y = 0,
  anchor = 0,
  alpha = 1,
): Text {
  const t = new Text({ text, style: { fill: color, fontSize: size, fontFamily: FONT, fontWeight: '600' } });
  t.anchor.set(anchor, anchor === 0.5 ? 0.5 : 0);
  t.x = x;
  t.y = y;
  t.alpha = alpha;
  return t;
}

export function wrappedText(
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
      fontFamily: FONT,
      align,
      wordWrap: true,
      wordWrapWidth: width,
      lineHeight: size + 5,
    },
  });
  t.anchor.set(align === 'center' ? 0.5 : 0, 0);
  t.x = x;
  t.y = y;
  return t;
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  enabled?: boolean;
  icon?: IconKey;
}

export function button(
  text: string,
  x: number,
  y: number,
  onClick: () => void,
  opts: ButtonOpts = {},
): Container {
  const w = opts.width ?? 180;
  const h = opts.height ?? 56;
  const enabled = opts.enabled ?? true;
  const c = new Container();
  c.x = x;
  c.y = y;
  c.alpha = enabled ? 1 : 0.45;

  const base = opts.color ?? UI.button;
  const danger = base === UI.danger || base === 0x6e2634;
  const accent = danger ? UI.danger : UI.accent;
  const g = new Graphics();
  g.roundRect(3, 5, w, h, 11).fill({ color: 0x000000, alpha: 0.35 });
  g.roundRect(0, 0, w, h, 11).fill(base).stroke({ width: 2, color: accent, alpha: 0.72 });
  g.roundRect(4, 4, w - 8, h - 8, 8).fill({ color: 0xffffff, alpha: 0.025 }).stroke({ width: 1, color: 0xffffff, alpha: 0.08 });
  g.rect(16, 0, Math.max(24, w * 0.22), 3).fill({ color: accent, alpha: 0.85 });
  g.rect(w - 16 - Math.max(18, w * 0.12), h - 3, Math.max(18, w * 0.12), 3).fill({ color: accent, alpha: 0.45 });
  g.poly([0, 12, 7, 5, 7, 19]).fill({ color: accent, alpha: 0.8 });
  g.poly([w, h - 12, w - 7, h - 5, w - 7, h - 19]).fill({ color: accent, alpha: 0.55 });
  c.addChild(g);
  if (opts.icon) {
    const icon = Sprite.from(ICONS[opts.icon]);
    const size = Math.min(28, h * 0.5);
    icon.width = size;
    icon.height = size;
    icon.x = 18;
    icon.y = (h - size) / 2;
    c.addChild(icon);
  }
  c.addChild(label(text, opts.fontSize ?? 20, UI.buttonText, w / 2 + (opts.icon ? 9 : 0), h / 2, 0.5));

  if (enabled) {
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', onClick);
    // press feedback (touch-friendly): shrink slightly toward the centre
    const press = (): void => {
      c.scale.set(0.96);
      c.x = x + w * 0.02;
      c.y = y + h * 0.02;
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

/** Scalable deep-space surface: layered frame, header sheen and corner marks. */
export function panel(w: number, h: number, color: number = UI.panel, radius = 12): Container {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(5, 7, w, h, radius).fill({ color: 0x000000, alpha: 0.38 });
  g.roundRect(0, 0, w, h, radius).fill(color).stroke({ width: 2, color: UI.panelBorder, alpha: 0.95 });
  g.roundRect(5, 5, w - 10, h - 10, Math.max(4, radius - 4)).stroke({ width: 1, color: UI.accent, alpha: 0.16 });
  g.roundRect(4, 4, w - 8, Math.min(54, h * 0.22), Math.max(4, radius - 3)).fill({ color: 0xffffff, alpha: 0.035 });
  g.rect(18, 0, Math.min(100, w * 0.28), 3).fill({ color: UI.accent, alpha: 0.55 });
  g.rect(w - Math.min(72, w * 0.2) - 18, h - 3, Math.min(72, w * 0.2), 3).fill({ color: UI.accent2, alpha: 0.42 });
  g.poly([0, 18, 9, 9, 9, 28]).fill({ color: UI.accent, alpha: 0.5 });
  g.poly([w, h - 18, w - 9, h - 9, w - 9, h - 28]).fill({ color: UI.accent2, alpha: 0.45 });
  c.addChild(g);
  return c;
}

/** Crisp vector HP/progress bar, safe at every layout scale. */
export function progressBar(w: number, h: number, fraction: number, fillColor: number): Container {
  const c = new Container();
  const frac = Math.max(0, Math.min(1, fraction));
  const g = new Graphics();
  g.roundRect(0, 0, w, h, Math.min(7, h / 2)).fill(0x090d18).stroke({ width: 2, color: UI.panelBorder, alpha: 0.95 });
  if (frac > 0) {
    const fw = Math.max(2, (w - 8) * frac);
    g.roundRect(4, 4, fw, Math.max(2, h - 8), Math.min(4, h / 2)).fill(fillColor);
    g.rect(8, 5, Math.max(0, fw - 8), Math.max(1, (h - 8) * 0.3)).fill({ color: 0xffffff, alpha: 0.18 });
  }
  g.rect(12, 0, Math.min(45, w * 0.2), 2).fill({ color: fillColor, alpha: 0.8 });
  c.addChild(g);
  return c;
}

/** Soft glow: layered translucent circles (no filter dependencies). */
export function glowCircle(x: number, y: number, r: number, color: number, coreAlpha = 0.9): Graphics {
  const g = new Graphics();
  g.circle(x, y, r * 2.2).fill({ color, alpha: 0.08 });
  g.circle(x, y, r * 1.5).fill({ color, alpha: 0.16 });
  g.circle(x, y, r).fill({ color, alpha: coreAlpha });
  return g;
}
