import { Container, Graphics, Text } from 'pixi.js';
import type { CardDefinition } from '@/types';
import { resolveCard, isUpgraded } from '@/data/cardUpgrade';
import { cardName, cardDesc, cardTypeLabel } from '@/i18n';
import { PX, PIXEL_FONT, pxText, scanlines } from '@/render/pixelUi';

// Retro pixel / CRT card skin. Type-coloured blocks, pixel-stepped borders,
// Zpix CJK bitmap font, and CRT scanlines. Pulls primitives + palette from
// pixelUi so the card face is consistent with the rest of the pixel UI.
// Function signature is identical to the previous version so combatView and
// rewardView keep working unchanged.

const TYPE_COLOR: Record<CardDefinition['type'], number> = {
  attack: PX.red,
  skill: PX.cyan,
  power: PX.purple,
};

const TYPE_INK: Record<CardDefinition['type'], number> = {
  attack: 0xffa0a0,
  skill: 0xbff0ff,
  power: 0xd0b0ff,
};

const RARITY_COLOR: Record<CardDefinition['rarity'], number> = {
  common: PX.subtle,
  uncommon: PX.cyan,
  rare: PX.gold,
};

// Pixel-art sigil drawn from small blocks, one per card type. Each call paints
// into the supplied Graphics so the sigil composites with the art viewport.
function pixelSigil(g: Graphics, type: CardDefinition['type'], cx: number, cy: number, r: number): void {
  const u = Math.max(2, Math.round(r / 7)); // grid unit
  const ink = TYPE_INK[type];
  const block = (gx: number, gy: number, gw: number, gh: number, alpha = 0.7): void => {
    g.rect(cx + gx * u, cy + gy * u, gw * u, gh * u).fill({ color: ink, alpha });
  };
  if (type === 'attack') {
    // pixel sword: blade + crossguard + pommel
    block(-0.5, -3, 1, 4);        // blade
    block(-0.5, -3.4, 1, 0.6);    // tip
    block(-2, 1, 4, 1);           // crossguard
    block(-0.5, 1.6, 1, 1.2);     // grip
    block(-1, 2.6, 2, 0.7);       // pommel
  } else if (type === 'skill') {
    // pixel shield: broad top, tapering base, cross detail
    block(-2, -2.6, 4, 1);        // top edge
    block(-2, -1.6, 4, 2);        // body
    block(-1.5, 0.4, 3, 1);       // taper
    block(-1, 1.4, 2, 1);         // point
    g.rect(cx - u * 0.4, cy - u * 1.6, u * 0.8, u * 2.4).fill({ color: ink, alpha: 0.95 });
    g.rect(cx - u * 1.4, cy - u * 0.4, u * 2.8, u * 0.8).fill({ color: ink, alpha: 0.95 });
  } else {
    // pixel star: cross + diagonal accents
    block(-0.5, -3, 1, 6);        // vertical
    block(-3, -0.5, 6, 1);        // horizontal
    block(-1, -1, 2, 2, 0.95);    // bright core
    block(-2, -2, 0.7, 0.7);      // diagonal nubs
    block(1.3, -2, 0.7, 0.7);
    block(-2, 1.3, 0.7, 0.7);
    block(1.3, 1.3, 0.7, 0.7);
  }
}

export interface CardFaceOpts {
  selected?: boolean;
}

export function cardFace(definitionId: string, w: number, h: number, opts: CardFaceOpts = {}): Container {
  const def = resolveCard(definitionId);
  const upgraded = isUpgraded(definitionId);
  const c = new Container();
  const bandH = Math.round(h * 0.16);
  const tColor = TYPE_COLOR[def.type];
  const borderColor = opts.selected ? PX.gold : upgraded ? PX.green : RARITY_COLOR[def.rarity];

  // ── frame: sharp pixel border, no rounded corners ──
  const frame = new Graphics();
  // drop shadow (offset block)
  frame.rect(3, 4, w, h).fill({ color: 0x000000, alpha: 0.5 });
  // body
  frame.rect(0, 0, w, h).fill(PX.bg);
  // outer border (double-line for pixel feel)
  frame.rect(0, 0, w, h).stroke({ width: 3, color: borderColor, alpha: 1 });
  frame.rect(3, 3, w - 6, h - 6).stroke({ width: 1, color: borderColor, alpha: 0.4 });
  // corner rivets — 2x2 blocks accent the pixel aesthetic
  frame.rect(2, 2, 2, 2).fill(borderColor);
  frame.rect(w - 4, 2, 2, 2).fill(borderColor);
  frame.rect(2, h - 4, 2, 2).fill(borderColor);
  frame.rect(w - 4, h - 4, 2, 2).fill(borderColor);
  // type indicator strip on the top edge
  frame.rect(6, 0, Math.max(20, w * 0.24), 2).fill(tColor);
  frame.rect(w - Math.max(20, w * 0.24) - 6, h - 2, Math.max(20, w * 0.24), 2).fill({ color: tColor, alpha: 0.6 });
  c.addChild(frame);

  // ── type band: solid blocky header in the type colour ──
  const band = new Graphics();
  band.rect(4, 4, w - 8, bandH).fill({ color: tColor, alpha: 0.92 });
  band.rect(4, 4 + bandH, w - 8, 2).fill({ color: 0x000000, alpha: 0.5 });
  // a 1px highlight along the top of the band
  band.rect(4, 4, w - 8, 1).fill({ color: PX.ink, alpha: 0.25 });
  c.addChild(band);

  // ── art viewport: recessed blocky frame with sigil + pixel stars ──
  const art = new Graphics();
  const artX = 5;
  const artY = 4 + bandH + 4;
  const artW = w - 10;
  const artH = Math.round(h * 0.36);
  art.rect(artX, artY, artW, artH).fill(PX.bgInner).stroke({ width: 1, color: borderColor, alpha: 0.7 });
  art.rect(artX + 2, artY + 2, artW - 4, artH - 4).stroke({ width: 1, color: tColor, alpha: 0.3 });
  // deterministic pixel star field from the card id
  let seed = 0;
  for (const ch of definitionId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 0; i < 9; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const sx = artX + 3 + (seed % Math.max(1, artW - 6));
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const sy = artY + 3 + (seed % Math.max(1, artH - 6));
    const s = i % 3 === 0 ? 2 : 1;
    art.rect(sx, sy, s, s).fill({ color: PX.ink, alpha: 0.35 });
  }
  pixelSigil(art, def.type, w / 2, artY + artH / 2, Math.min(artW, artH) * 0.34);
  scanlines(art, artX, artY, artW, artH, 3, 0.14);
  c.addChild(art);

  // ── cost gem: faceted pixel block (octagon-ish) ──
  const gem = new Graphics();
  const gx = 16;
  const gy = 4 + bandH / 2;
  const gr = Math.round(bandH * 0.42);
  // outer block
  gem.rect(gx - gr, gy - gr, gr * 2, gr * 2).fill(0x000000).stroke({ width: 2, color: PX.gold, alpha: 1 });
  // facet: inner diagonal cuts (corner squares in bg colour)
  gem.rect(gx - gr, gy - gr, 3, 3).fill(PX.bg);
  gem.rect(gx + gr - 3, gy - gr, 3, 3).fill(PX.bg);
  gem.rect(gx - gr, gy + gr - 3, 3, 3).fill(PX.bg);
  gem.rect(gx + gr - 3, gy + gr - 3, 3, 3).fill(PX.bg);
  // inner core
  gem.rect(gx - gr + 4, gy - gr + 4, gr * 2 - 8, gr * 2 - 8).fill({ color: PX.gold, alpha: 0.22 });
  // specular highlight
  gem.rect(gx - gr + 4, gy - gr + 4, 3, 3).fill({ color: PX.ink, alpha: 0.7 });
  c.addChild(gem);
  c.addChild(pxText(`${def.cost}`, Math.max(11, Math.round(bandH * 0.5)), 0x2a1a05, gx, gy, 0.5, 0.5));

  // ── name on the band (pixel font, centred, leaving room for the gem) ──
  const nameSize = Math.max(11, Math.round(bandH * 0.5));
  c.addChild(pxText(cardName(definitionId), nameSize, PX.ink, w / 2 + 8, 4 + bandH / 2, 0.5, 0.5));

  // upgraded marker: a small `+` chip at the bottom-right corner (kept clear of
  // the rarity pips which live at the top-right)
  if (upgraded) {
    const up = new Container();
    up.x = w - 20;
    up.y = h - 22;
    const upG = new Graphics();
    upG.rect(0, 0, 12, 12).fill(PX.green).stroke({ width: 1, color: 0x000000 });
    up.addChild(upG);
    up.addChild(pxText('+', 10, 0x0a1a05, 6, 6, 0.5, 0.5));
    c.addChild(up);
  }

  // ── description console: recessed blocky panel ──
  const consoleY = artY + artH + 4;
  const consoleH = h - consoleY - 28;
  const cons = new Graphics();
  cons.rect(5, consoleY, w - 10, consoleH).fill(PX.bgInner).stroke({ width: 1, color: borderColor, alpha: 0.5 });
  cons.rect(5, consoleY, w - 10, 1).fill({ color: tColor, alpha: 0.4 });
  c.addChild(cons);
  scanlines(cons, 5, consoleY, w - 10, consoleH, 3, 0.08);

  const descSize = Math.max(10, Math.round(w * 0.072));
  const desc = new Text({
    text: cardDesc(definitionId),
    style: {
      fill: PX.text,
      fontSize: descSize,
      fontFamily: PIXEL_FONT,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: w - 18,
      lineHeight: descSize + 6,
    },
  });
  desc.anchor.set(0.5, 0.5);
  desc.x = w / 2;
  desc.y = consoleY + consoleH / 2;
  c.addChild(desc);

  // ── type chip at the bottom: sharp block with type colour ──
  const chipLabel = pxText(cardTypeLabel(def.type), Math.max(9, Math.round(w * 0.062)), PX.ink, 0, 0, 0, 0);
  const chipW = chipLabel.width + 12;
  const chip = new Container();
  chip.x = Math.round(w / 2 - chipW / 2);
  chip.y = h - 22;
  const chipG = new Graphics();
  chipG.rect(0, 0, chipW, 16).fill({ color: tColor, alpha: 0.85 }).stroke({ width: 1, color: 0x000000, alpha: 0.6 });
  chip.addChild(chipG);
  chipLabel.x = 6;
  chipLabel.y = 8;
  chipLabel.anchor.set(0, 0.5);
  chip.addChild(chipLabel);
  c.addChild(chip);

  // ── rarity pips: pixel stars (plus-shaped) in the top-right ──
  const pips = def.rarity === 'rare' ? 3 : def.rarity === 'uncommon' ? 2 : 1;
  const rarity = new Graphics();
  for (let i = 0; i < pips; i++) {
    const px = w - 8 - i * 8;
    const py = 8;
    rarity.rect(px - 1, py - 3, 2, 6).fill({ color: borderColor, alpha: 0.95 });
    rarity.rect(px - 3, py - 1, 6, 2).fill({ color: borderColor, alpha: 0.95 });
  }
  c.addChild(rarity);

  // ── global CRT scanlines over the whole card face ──
  const crt = new Graphics();
  scanlines(crt, 0, 0, w, h, 4, 0.06);
  c.addChild(crt);

  return c;
}
