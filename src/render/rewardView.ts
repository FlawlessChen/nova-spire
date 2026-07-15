import { Container, Graphics } from 'pixi.js';
import { CARDS } from '@/data/cards';
import { DESIGN_W, DESIGN_H } from '@/render/combatView';
import { label, wrappedText, button, panel, UI } from '@/render/ui';

// RewardView: after a battle, choose one of three cards to add to the deck, or
// skip. Reads a list of card definition ids; calls back with the chosen id or
// null (skip).

const CARD_TYPE_COLOR: Record<string, number> = {
  attack: 0x8a2f2f,
  skill: 0x2f6b8a,
  power: 0x6b3f8a,
};

export class RewardView {
  readonly root = new Container();

  constructor(
    private choices: string[],
    private onChoose: (cardId: string | null) => void,
  ) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill(UI.overlay));
    this.root.addChild(label('战斗胜利 — 选择一张卡牌', 32, UI.accent, DESIGN_W / 2, 80, 0.5));

    const cardW = 190;
    const cardH = 260;
    const gap = 40;
    const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
    let x = (DESIGN_W - totalW) / 2;
    const y = 200;
    for (const id of this.choices) {
      this.root.addChild(this.drawRewardCard(id, x, y, cardW, cardH));
      x += cardW + gap;
    }

    this.root.addChild(
      button('跳过', DESIGN_W / 2 - 90, y + cardH + 50, () => this.onChoose(null), { width: 180, color: 0x555a6e }),
    );
  }

  private drawRewardCard(id: string, x: number, y: number, w: number, h: number): Container {
    const def = CARDS[id];
    const c = new Container();
    c.x = x;
    c.y = y;

    const base = CARD_TYPE_COLOR[def.type] ?? UI.panel;
    c.addChild(panel(w, h, base, 12));
    c.addChild(new Graphics().roundRect(0, 0, w, h, 12).stroke({ width: 2, color: 0x000000, alpha: 0.5 }));

    // cost
    c.addChild(new Graphics().circle(24, 24, 17).fill(0x11131a));
    c.addChild(label(`${def.cost}`, 20, UI.accent, 24, 24, 0.5));

    // name
    c.addChild(label(def.name, 18, UI.text, w / 2, 54, 0.5));
    c.addChild(new Graphics().rect(16, 82, w - 32, 1).fill({ color: 0xffffff, alpha: 0.2 }));

    // description
    c.addChild(wrappedText(def.description, 14, UI.text, w - 28, w / 2, 100, 'center'));

    // type tag
    c.addChild(label(def.type.toUpperCase(), 12, UI.subtle, w / 2, h - 28, 0.5));

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => this.onChoose(id));
    // hover feedback
    c.on('pointerover', () => (c.y = y - 10));
    c.on('pointerout', () => (c.y = y));
    return c;
  }
}
