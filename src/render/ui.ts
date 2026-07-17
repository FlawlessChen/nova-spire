import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { ICONS, UI_TEXTURES, type IconKey } from '@/render/artAssets';

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
  const g = new Graphics()
    .roundRect(0, 0, w, h, 12)
    .fill(base)
    .stroke({ width: 1.5, color: UI.accent, alpha: 0.55 });
  // top sheen line for a subtle sci-fi gradient feel
  g.roundRect(2, 2, w - 4, h * 0.42, 10).fill({ color: 0xffffff, alpha: 0.06 });
  c.addChild(g);
  const danger = base === UI.danger || base === 0x6e2634;
  const skin = Sprite.from(danger ? UI_TEXTURES.dangerButton : UI_TEXTURES.button);
  skin.width = w;
  skin.height = h;
  skin.alpha = 0.96;
  c.addChild(skin);
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

/** Asset-backed metal surface with a procedural fallback underneath. */
export function panel(w: number, h: number, color: number = UI.panel, radius = 12): Container {
  const c = new Container();
  const g = new Graphics()
    .roundRect(0, 0, w, h, radius)
    .fill(color)
    .stroke({ width: 1, color: UI.panelBorder, alpha: 0.9 });
  g.roundRect(1, 1, w - 2, Math.max(8, h * 0.3), radius - 1).fill({ color: 0xffffff, alpha: 0.035 });
  c.addChild(g);
  const skin = Sprite.from(UI_TEXTURES.panel);
  skin.width = w;
  skin.height = h;
  skin.alpha = 0.9;
  c.addChild(skin);
  const frame = Sprite.from(UI_TEXTURES.panelFrame);
  frame.width = w;
  frame.height = h;
  frame.alpha = 0.65;
  c.addChild(frame);
  return c;
}

/** Shared HP/progress bar using the selected Adventure UI frame. */
export function progressBar(w: number, h: number, fraction: number, fillColor: number): Container {
  const c = new Container();
  const frac = Math.max(0, Math.min(1, fraction));
  c.addChild(new Graphics().roundRect(0, 0, w, h, Math.min(6, h / 2)).fill(0x111827));
  if (frac > 0) {
    const fill = Sprite.from(UI_TEXTURES.progressFill);
    fill.x = 3;
    fill.y = 3;
    fill.width = Math.max(0, (w - 6) * frac);
    fill.height = Math.max(1, h - 6);
    fill.tint = fillColor;
    c.addChild(fill);
  }
  const frame = Sprite.from(UI_TEXTURES.progressFrame);
  frame.width = w;
  frame.height = h;
  frame.alpha = 0.95;
  c.addChild(frame);
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
