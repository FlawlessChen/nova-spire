import { Container } from 'pixi.js';
import { layout } from '@/render/layout';
import { L, relicName, relicDesc } from '@/i18n';
import { PX, pxLabel, pixelButton, pixelOverlay } from '@/render/pixelUi';
import { cardFace } from '@/render/cardArt';

// RewardView: after a battle, choose one of three cards to add to the deck, or
// skip. Uses the shared cardFace renderer so reward cards look exactly like
// they will in hand. Calls back with the chosen id or null (skip).

export class RewardView {
  readonly root = new Container();

  constructor(
    private choices: string[],
    private onChoose: (cardId: string | null) => void,
    private droppedRelic: string | null = null,
  ) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(pixelOverlay(layout.W, layout.H, 0.95));
    this.root.addChild(pxLabel(L.ui.rewardTitle, layout.portrait ? 24 : 30, PX.gold, layout.W / 2, 80, 0.5));

    // elite relic drop announcement
    if (this.droppedRelic) {
      this.root.addChild(
        pxLabel(
          L.ui.relicDrop(relicName(this.droppedRelic), relicDesc(this.droppedRelic)),
          layout.portrait ? 13 : 16,
          PX.green,
          layout.W / 2,
          130,
          0.5,
        ),
      );
    }

    const cardW = 190;
    const cardH = 260;
    // portrait: 3 cards of 190 + gaps must fit 720 → tighten the gap
    const gap = layout.portrait
      ? Math.min(40, (layout.W - 40 - this.choices.length * cardW) / Math.max(1, this.choices.length - 1))
      : 40;
    const totalW = this.choices.length * cardW + (this.choices.length - 1) * gap;
    let x = (layout.W - totalW) / 2;
    const y = layout.portrait ? 320 : 200;
    for (const id of this.choices) {
      this.root.addChild(this.drawRewardCard(id, x, y, cardW, cardH));
      x += cardW + gap;
    }

    this.root.addChild(
      pixelButton(L.ui.skip, layout.W / 2 - 90, y + cardH + 50, () => this.onChoose(null), { width: 180, height: 50, variant: 'ghost' }),
    );
  }

  private drawRewardCard(id: string, x: number, y: number, w: number, h: number): Container {
    const c = cardFace(id, w, h);
    c.x = x;
    c.y = y;
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => this.onChoose(id));
    // hover feedback (desktop)
    c.on('pointerover', () => (c.y = y - 10));
    c.on('pointerout', () => (c.y = y));
    return c;
  }
}
