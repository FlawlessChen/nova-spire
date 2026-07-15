import { Container, Graphics, Text } from 'pixi.js';
import type { CardDefinition } from '@/types';
import { CARDS } from '@/data/cards';
import { cardName, cardDesc, cardTypeLabel } from '@/i18n';
import { FONT, UI, label } from '@/render/ui';

// Shared card face renderer, used by the combat hand and the reward screen so
// cards look identical everywhere. Sci-fi frame: rarity-colored border, a type
// band behind the name, a cost gem, a faint type sigil as "art", localized
// name/description/type chip.

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
  const def = CARDS[definitionId];
  const c = new Container();
  const bandH = Math.round(h * 0.17);

  // frame
  const frame = new Graphics()
    .roundRect(0, 0, w, h, 12)
    .fill(0x10162a)
    .stroke({ width: opts.selected ? 3 : 2, color: opts.selected ? UI.gold : RARITY_BORDER[def.rarity], alpha: opts.selected ? 1 : 0.9 });
  c.addChild(frame);

  // type band behind the name (flat rect under the rounded top)
  const band = new Graphics();
  band.roundRect(2, 2, w - 4, bandH + 10, 10).fill({ color: TYPE_BAND[def.type], alpha: 0.9 });
  band.rect(2, bandH - 2, w - 4, 12).fill({ color: TYPE_BAND[def.type], alpha: 0.9 });
  c.addChild(band);

  // art zone sigil
  const art = new Graphics();
  sigil(art, def.type, w / 2, h * 0.42, w * 0.28);
  c.addChild(art);

  // cost gem (over the band's left edge)
  const gem = new Graphics();
  gem.circle(19, 19, 16).fill(0x0c101f).stroke({ width: 2, color: UI.gold, alpha: 0.9 });
  c.addChild(gem);
  c.addChild(label(`${def.cost}`, 17, UI.gold, 19, 19, 0.5));

  // name centred on the band (leave room for the gem on the left)
  const name = label(cardName(definitionId), Math.round(w * 0.1), UI.text, w / 2 + 8, 2 + (bandH + 8) / 2, 0.5);
  c.addChild(name);

  // divider between art zone and text
  c.addChild(new Graphics().rect(12, h * 0.56, w - 24, 1).fill({ color: 0xffffff, alpha: 0.14 }));

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
  desc.y = h * 0.6;
  c.addChild(desc);

  // type chip at the bottom
  const chipLabel = label(cardTypeLabel(def.type), 11, UI.subtle, 0, 0, 0);
  const chipW = chipLabel.width + 14;
  const chip = new Container();
  chip.x = w / 2 - chipW / 2;
  chip.y = h - 24;
  chip.addChild(new Graphics().roundRect(0, 0, chipW, 17, 8).fill({ color: 0xffffff, alpha: 0.06 }).stroke({ width: 1, color: UI.subtle, alpha: 0.35 }));
  chipLabel.x = 7;
  chipLabel.y = 2;
  chip.addChild(chipLabel);
  c.addChild(chip);

  return c;
}
