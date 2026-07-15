// Orientation-aware design space. All views author against a fixed logical
// resolution; main.ts scales that stage to the physical window. Landscape uses
// the original 1280x720; portrait (mobile) flips to 720x1280 and every view
// rearranges its layout off `layout.portrait`.
//
// `layout` is a mutable singleton read at render() time — views fully re-render
// on every action, so an orientation switch only needs one re-render pass.

export const LANDSCAPE_W = 1280;
export const LANDSCAPE_H = 720;
export const PORTRAIT_W = 720;
export const PORTRAIT_H = 1280;

export interface Layout {
  W: number;
  H: number;
  portrait: boolean;
}

export const layout: Layout = { W: LANDSCAPE_W, H: LANDSCAPE_H, portrait: false };

/**
 * Recompute the design space for the given physical screen size.
 * Returns true when the orientation flipped (caller should re-render views).
 */
export function updateLayout(screenW: number, screenH: number): boolean {
  const portrait = screenH > screenW;
  if (portrait === layout.portrait) return false;
  layout.portrait = portrait;
  layout.W = portrait ? PORTRAIT_W : LANDSCAPE_W;
  layout.H = portrait ? PORTRAIT_H : LANDSCAPE_H;
  return true;
}
