import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { layout } from '@/render/layout';
import { L, relicName, relicDesc } from '@/i18n';
import { label, button, panel, UI } from '@/render/ui';
import { cardFace } from '@/render/cardArt';

// ShopView: spend gold on cards / a relic / a one-time card removal. Reads the
// rolled ShopInventory from RunManager; every purchase re-renders in place so
// gold and sold-out states update. A "remove" sub-mode shows the deck to pick
// a card to delete.

export interface ShopActions {
  onBuyCard: (index: number) => void;
  onBuyRelic: (index: number) => void;
  onRemoveCard: (deckIndex: number) => void;
  onLeave: () => void;
}

export class ShopView {
  readonly root = new Container();
  private mode: 'shop' | 'remove' = 'shop';

  constructor(
    private mgr: RunManager,
    private actions: ShopActions,
  ) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.93 }));
    if (this.mode === 'shop') this.renderShop();
    else this.renderRemove();
  }

  private renderShop(): void {
    const shop = this.mgr.state.shop;
    if (!shop) return;

    this.root.addChild(label(L.ui.shopTitle, layout.portrait ? 26 : 32, UI.gold, layout.W / 2, 24, 0.5));
    this.root.addChild(label(L.ui.shopGold(this.mgr.state.gold), 20, UI.gold, layout.W / 2, layout.portrait ? 62 : 64, 0.5));

    // cards for sale
    const cardW = layout.portrait ? 108 : 130;
    const cardH = Math.round(cardW * 1.32);
    const gap = layout.portrait ? 12 : 22;
    const n = shop.cards.length;
    const totalW = n * cardW + (n - 1) * gap;
    let x = (layout.W - totalW) / 2;
    const y = layout.portrait ? 100 : 110;

    shop.cards.forEach((item, i) => {
      const wrap = new Container();
      wrap.x = x;
      wrap.y = y;
      const face = cardFace(item.id, cardW, cardH);
      face.alpha = item.sold ? 0.35 : this.mgr.state.gold >= item.price ? 1 : 0.55;
      wrap.addChild(face);
      // price tag
      const affordable = !item.sold && this.mgr.state.gold >= item.price;
      const tag = label(item.sold ? L.ui.shopSoldOut : L.ui.price(item.price), 14, item.sold ? UI.subtle : affordable ? UI.gold : UI.danger, cardW / 2, cardH + 6, 0.5);
      wrap.addChild(tag);
      if (!item.sold) {
        face.eventMode = 'static';
        face.cursor = 'pointer';
        face.on('pointertap', () => this.actions.onBuyCard(i));
      }
      this.root.addChild(wrap);
      x += cardW + gap;
    });

    // relic row
    const relicY = y + cardH + 46;
    shop.relics.forEach((item, i) => {
      const w = layout.portrait ? layout.W - 80 : 460;
      const rowX = (layout.W - w) / 2;
      const c = new Container();
      c.x = rowX;
      c.y = relicY;
      const affordable = !item.sold && this.mgr.state.gold >= item.price;
      c.addChild(panel(w, 66, UI.panel, 12));
      c.addChild(label(relicName(item.id), 17, item.sold ? UI.subtle : UI.gold, 16, 12));
      c.addChild(label(relicDesc(item.id), 12, UI.subtle, 16, 38));
      c.addChild(label(item.sold ? L.ui.shopSoldOut : L.ui.price(item.price), 15, item.sold ? UI.subtle : affordable ? UI.gold : UI.danger, w - 16, 24, 1));
      if (!item.sold) {
        c.eventMode = 'static';
        c.cursor = 'pointer';
        c.on('pointertap', () => this.actions.onBuyRelic(i));
      }
      this.root.addChild(c);
    });

    // removal service
    const remY = relicY + 84;
    const rw = layout.portrait ? layout.W - 80 : 460;
    const rx = (layout.W - rw) / 2;
    const canRemove = !shop.removalUsed && this.mgr.state.gold >= shop.removalPrice && this.mgr.state.deck.length > 1;
    const rc = new Container();
    rc.x = rx;
    rc.y = remY;
    rc.addChild(panel(rw, 60, UI.panel, 12));
    rc.addChild(label(L.ui.shopRemoval, 17, shop.removalUsed ? UI.subtle : UI.text, 16, 10));
    rc.addChild(label(shop.removalUsed ? L.ui.shopRemovalDone : L.ui.shopRemovalHint, 12, UI.subtle, 16, 34));
    rc.addChild(label(shop.removalUsed ? '' : L.ui.price(shop.removalPrice), 15, canRemove ? UI.gold : UI.danger, rw - 16, 22, 1));
    if (canRemove) {
      rc.eventMode = 'static';
      rc.cursor = 'pointer';
      rc.on('pointertap', () => { this.mode = 'remove'; this.render(); });
    }
    this.root.addChild(rc);

    this.root.addChild(
      button(L.ui.shopLeave, layout.W / 2 - 100, layout.H - 66, () => this.actions.onLeave(), { width: 200, height: 50 }),
    );
  }

  private renderRemove(): void {
    this.root.addChild(label(L.ui.shopChooseRemoval, layout.portrait ? 24 : 30, UI.gold, layout.W / 2, 30, 0.5));

    const deck = this.mgr.state.deck;
    const cardW = layout.portrait ? 104 : 118;
    const cardH = Math.round(cardW * 1.3);
    const gap = 14;
    const cols = Math.max(1, Math.floor((layout.W - 40 + gap) / (cardW + gap)));
    const totalW = Math.min(deck.length, cols) * cardW + (Math.min(deck.length, cols) - 1) * gap;
    const startX = (layout.W - totalW) / 2;
    const topY = 78;

    deck.forEach((entry, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const face = cardFace(entry, cardW, cardH);
      face.x = startX + col * (cardW + gap);
      face.y = topY + row * (cardH + gap);
      face.eventMode = 'static';
      face.cursor = 'pointer';
      face.on('pointertap', () => { this.actions.onRemoveCard(index); this.mode = 'shop'; this.render(); });
      this.root.addChild(face);
    });

    this.root.addChild(
      button(L.ui.back, layout.W / 2 - 90, layout.H - 66, () => { this.mode = 'shop'; this.render(); }, { width: 180, height: 50 }),
    );
  }
}
