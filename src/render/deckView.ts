import { Container, Graphics } from 'pixi.js';
import { layout } from '@/render/layout';
import { L, cardName } from '@/i18n';
import { label, button, UI } from '@/render/ui';
import { cardFace } from '@/render/cardArt';

// DeckView: an overlay listing a pile of cards (deck / draw / discard) as a
// grid of card faces. Card ids are sorted by name so the same deck reads the
// same way each time. Pure presentation; onClose calls back.

export class DeckView {
  readonly root = new Container();

  constructor(
    private title: string,
    private cardIds: string[],
    private onClose: () => void,
  ) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.94 }));
    this.root.addChild(label(this.title, layout.portrait ? 26 : 32, UI.gold, layout.W / 2, 30, 0.5));

    const ids = this.cardIds.slice().sort((a, b) => cardName(a).localeCompare(cardName(b), 'zh'));

    if (ids.length === 0) {
      this.root.addChild(label(L.ui.emptyPile, 20, UI.subtle, layout.W / 2, layout.H / 2, 0.5));
    } else {
      // grid of small card faces
      const cardW = layout.portrait ? 104 : 120;
      const cardH = Math.round(cardW * 1.3);
      const gap = 14;
      const cols = Math.max(1, Math.floor((layout.W - 40 + gap) / (cardW + gap)));
      const totalW = cols * cardW + (cols - 1) * gap;
      const startX = (layout.W - totalW) / 2;
      const topY = 80;
      ids.forEach((id, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const face = cardFace(id, cardW, cardH);
        face.x = startX + col * (cardW + gap);
        face.y = topY + row * (cardH + gap);
        this.root.addChild(face);
      });
    }

    this.root.addChild(
      button(L.ui.close, layout.W / 2 - 90, layout.H - 72, () => this.onClose(), { width: 180, height: 50 }),
    );
  }
}
