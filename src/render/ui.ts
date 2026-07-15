import { Container, Graphics, Text } from 'pixi.js';

// Shared PixiJS UI primitives used across the render layer (combat, map,
// reward, campfire). Keeping them here avoids re-implementing labels/buttons in
// every view. All are plain factories returning display objects — no state.

export const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

export const UI = {
  text: 0xe8e8f0,
  subtle: 0x9aa0b4,
  panel: 0x1e2130,
  button: 0x3a5a8a,
  buttonAlt: 0x2f6b4a,
  buttonText: 0xffffff,
  accent: 0xf0c419,
  overlay: 0x0a0b10,
  danger: 0xd8443a,
  good: 0x4ec06a,
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
  c.addChild(
    new Graphics()
      .roundRect(0, 0, w, h, 10)
      .fill(opts.color ?? UI.button)
      .stroke({ width: 2, color: 0x000000, alpha: 0.4 }),
  );
  c.addChild(label(text, opts.fontSize ?? 20, UI.buttonText, w / 2, h / 2, 0.5));
  if (enabled) {
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', onClick);
  }
  return c;
}

export function panel(w: number, h: number, color: number = UI.panel, radius = 10): Graphics {
  return new Graphics().roundRect(0, 0, w, h, radius).fill(color);
}
