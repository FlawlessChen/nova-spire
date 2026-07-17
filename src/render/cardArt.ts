import { Container, Graphics, Text } from 'pixi.js';
import type { CardDefinition } from '@/types';
import { resolveCard, isUpgraded } from '@/data/cardUpgrade';
import { cardName, cardDesc, cardTypeLabel } from '@/i18n';
import { FONT, UI, label } from '@/render/ui';

// Shared card face renderer, used by the combat hand and the reward screen so
// cards look identical everywhere. The frame is fully vector-based so it stays
// crisp in the hand, reward grid and mobile layouts: layered rarity rails,
// dedicated art viewport, name plate, cost core and description console.

const TYPE_BAND: Record<CardDefinition['type'], number> = {
  attack: 0x7a2440,
  skill: 0x1d4d6e,
  power: 0x4a2a7a,
};

const RARITY_BORDER: Record<CardDefinition['rarity'], number> = {
  common: 0x3a4a6e,
  uncommon: 0x4dd8ff,
  rare: 0xffd54d,
};

// faint sigil in the art zone, per card type
function sigil(g: Graphics, type: CardDefinition['type'], cx: number, cy: number, r: number): void {
  if (type === 'attack') {
    // crossed blade: slash triangle pair
    g.poly([cx - r, cy + r * 0.7, cx + r * 0.7, cy - r, cx + r, cy - r * 0.7, cx - r * 0.7, cy + r])
      .fill({ color: 0xff8a9a, alpha: 0.14 });
    g.poly([cx - r * 0.5, cy - r * 0.8, cx - r * 0.2, cy - r * 0.8, cx + r * 0.6, cy + r * 0.8, cx + r * 0.3, cy + r * 0.8])
      .fill({ color: 0xff8a9a, alpha: 0.1 });
  } else if (type === 'skill') {
    // shield arc
    g.poly([cx, cy - r, cx + r * 0.85, cy - r * 0.45, cx + r * 0.85, cy + r * 0.3, cx, cy + r, cx - r * 0.85, cy + r * 0.3, cx - r * 0.85, cy - r * 0.45])
      .fill({ color: 0x7fd4ff, alpha: 0.13 });
    g.circle(cx, cy, r * 0.35).fill({ color: 0x7fd4ff, alpha: 0.1 });
  } else {
    // power star
    g.poly([cx, cy - r, cx + r * 0.22, cy - r * 0.22, cx + r, cy, cx + r * 0.22, cy + r * 0.22, cx, cy + r, cx - r * 0.22, cy + r * 0.22, cx - r, cy, cx - r * 0.22, cy - r * 0.22])
      .fill({ color: 0xc9a6ff, alpha: 0.15 });
  }
}

export interface CardFaceOpts {
  selected?: boolean;
}

export function cardFace(definitionId: string, w: number, h: number, opts: CardFaceOpts = {}): Container {
  const def = resolveCard(definitionId);
  const upgraded = isUpgraded(definitionId);
  const c = new Container();
  const bandH = Math.round(h * 0.17);
  const radius = Math.max(9, Math.round(w * 0.08));

  // frame — upgraded cards get a green-gold border
  const borderColor = opts.selected ? UI.gold : upgraded ? 0x8fe36a : RARITY_BORDER[def.rarity];
  const frame = new Graphics();
  frame.roundRect(4, 6, w, h, radius).fill({ color: 0x000000, alpha: 0.45 });
  frame.roundRect(0, 0, w, h, radius).fill(0x0b1020).stroke({ width: opts.selected || upgraded ? 4 : 3, color: borderColor, alpha: 0.95 });
  frame.roundRect(5, 5, w - 10, h - 10, Math.max(5, radius - 4)).stroke({ width: 1, color: 0xffffff, alpha: 0.13 });
  frame.rect(14, 0, Math.max(24, w * 0.28), 3).fill({ color: borderColor, alpha: 0.95 });
  frame.rect(w - Math.max(20, w * 0.2) - 14, h - 3, Math.max(20, w * 0.2), 3).fill({ color: borderColor, alpha: 0.55 });
  frame.poly([0, h * 0.24, 7, h * 0.24 - 7, 7, h * 0.24 + 12]).fill({ color: borderColor, alpha: 0.8 });
  frame.poly([w, h * 0.7, w - 7, h * 0.7 - 12, w - 7, h * 0.7 + 7]).fill({ color: borderColor, alpha: 0.55 });
  c.addChild(frame);

  // type band behind the name (flat rect under the rounded top)
  const band = new Graphics();
  band.roundRect(7, 7, w - 14, bandH + 8, Math.max(5, radius - 4)).fill({ color: TYPE_BAND[def.type], alpha: 0.92 });
  band.rect(7, bandH - 2, w - 14, 12).fill({ color: TYPE_BAND[def.type], alpha: 0.92 });
  band.rect(42, bandH + 4, w - 54, 2).fill({ color: borderColor, alpha: 0.45 });
  c.addChild(band);

  // art viewport: a distinct framed area instead of an empty middle section.
  const art = new Graphics();
  const artX = 10;
  const artY = bandH + 14;
  const artW = w - 20;
  const artH = h * 0.36;
  art.roundRect(artX, artY, artW, artH, 7).fill({ color: TYPE_BAND[def.type], alpha: 0.24 }).stroke({ width: 1.5, color: borderColor, alpha: 0.6 });
  art.roundRect(artX + 4, artY + 4, artW - 8, artH - 8, 5).stroke({ width: 1, color: 0xffffff, alpha: 0.08 });
  let seed = 0;
  for (const ch of definitionId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 0; i < 7; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const sx = artX + 8 + (seed % Math.max(1, Math.floor(artW - 16)));
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const sy = artY + 8 + (seed % Math.max(1, Math.floor(artH - 16)));
    art.circle(sx, sy, i % 3 === 0 ? 1.4 : 0.8).fill({ color: 0xffffff, alpha: 0.18 });
  }
  sigil(art, def.type, w / 2, h * 0.42, w * 0.28);
  c.addChild(art);

  // cost gem (over the band's left edge)
  const gem = new Graphics();
  gem.circle(21, 21, 18).fill(0x080c18).stroke({ width: 3, color: UI.gold, alpha: 0.95 });
  gem.circle(21, 21, 13).fill({ color: UI.accent2, alpha: 0.22 }).stroke({ width: 1, color: 0xffffff, alpha: 0.18 });
  c.addChild(gem);
  c.addChild(label(`${def.cost}`, 18, UI.gold, 21, 21, 0.5));

  // name centred on the band (leave room for the gem on the left)
  const name = label(cardName(definitionId), Math.max(12, Math.round(w * 0.098)), UI.text, w / 2 + 10, 2 + (bandH + 8) / 2, 0.5);
  c.addChild(name);

  // description console beneath the art viewport.
  const consoleY = h * 0.57;
  c.addChild(new Graphics().roundRect(10, consoleY, w - 20, h - consoleY - 32, 7).fill({ color: 0x11182b, alpha: 0.96 }).stroke({ width: 1, color: borderColor, alpha: 0.35 }));
  c.addChild(new Graphics().rect(18, consoleY, w - 36, 2).fill({ color: borderColor, alpha: 0.5 }));

  // description
  const desc = new Text({
    text: cardDesc(definitionId),
    style: {
      fill: UI.text,
      fontSize: Math.max(12, Math.round(w * 0.085)),
      fontFamily: FONT,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: w - 22,
      lineHeight: Math.max(16, Math.round(w * 0.115)),
    },
  });
  desc.anchor.set(0.5, 0);
  desc.x = w / 2;
  desc.y = consoleY + 12;
  c.addChild(desc);

  // type chip at the bottom
  const chipLabel = label(cardTypeLabel(def.type), 11, UI.subtle, 0, 0, 0);
  const chipW = chipLabel.width + 14;
  const chip = new Container();
  chip.x = w / 2 - chipW / 2;
  chip.y = h - 25;
  chip.addChild(new Graphics().roundRect(0, 0, chipW, 18, 7).fill({ color: TYPE_BAND[def.type], alpha: 0.7 }).stroke({ width: 1, color: borderColor, alpha: 0.55 }));
  chipLabel.x = 7;
  chipLabel.y = 2;
  chip.addChild(chipLabel);
  c.addChild(chip);

  // rarity indicator — one/two/three luminous pips.
  const pips = def.rarity === 'rare' ? 3 : def.rarity === 'uncommon' ? 2 : 1;
  const rarity = new Graphics();
  for (let i = 0; i < pips; i++) rarity.circle(w - 13 - i * 7, 13, 2.2).fill({ color: borderColor, alpha: 0.95 });
  c.addChild(rarity);

  return c;
}
