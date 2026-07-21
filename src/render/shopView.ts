import { Container } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { layout } from '@/render/layout';
import { L, relicName, relicDesc } from '@/i18n';
import { PX, pxLabel, pixelButton, pixelPanel, pixelOverlay } from '@/render/pixelUi';
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
    this.root.addChild(pixelOverlay(layout.W, layout.H, 0.93));
    if (this.mode === 'shop') this.renderShop();
    else this.renderRemove();
  }

  private renderShop(): void {
    const shop = this.mgr.state.shop;
    if (!shop) return;

    this.root.addChild(pxLabel(L.ui.shopTitle, layout.portrait ? 24 : 30, PX.gold, layout.W / 2, 24, 0.5));
    this.root.addChild(pxLabel(L.ui.shopGold(this.mgr.state.gold), 18, PX.gold, layout.W / 2, layout.portrait ? 62 : 64, 0.5));

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
      wrap.addChild(pxLabel(item.sold ? L.ui.shopSoldOut : L.ui.price(item.price), 13, item.sold ? PX.subtle : affordable ? PX.gold : PX.red, cardW / 2, cardH + 6, 0.5));
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
      c.addChild(pixelPanel(w, 66, { color: PX.panel, border: PX.gold }));
      c.addChild(pxLabel(relicName(item.id), 16, item.sold ? PX.subtle : PX.gold, 16, 12));
      c.addChild(pxLabel(relicDesc(item.id), 11, PX.subtle, 16, 38));
      c.addChild(pxLabel(item.sold ? L.ui.shopSoldOut : L.ui.price(item.price), 14, item.sold ? PX.subtle : affordable ? PX.gold : PX.red, w - 16, 24, 1));
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
    rc.addChild(pixelPanel(rw, 60, { color: PX.panel, border: shop.removalUsed ? PX.subtle : PX.red }));
    rc.addChild(pxLabel(L.ui.shopRemoval, 16, shop.removalUsed ? PX.subtle : PX.text, 16, 10));
    rc.addChild(pxLabel(shop.removalUsed ? L.ui.shopRemovalDone : L.ui.shopRemovalHint, 11, PX.subtle, 16, 34));
    rc.addChild(pxLabel(shop.removalUsed ? '' : L.ui.price(shop.removalPrice), 14, canRemove ? PX.gold : PX.red, rw - 16, 22, 1));
    if (canRemove) {
      rc.eventMode = 'static';
      rc.cursor = 'pointer';
      rc.on('pointertap', () => { this.mode = 'remove'; this.render(); });
    }
    this.root.addChild(rc);

    this.root.addChild(
      pixelButton(L.ui.shopLeave, layout.W / 2 - 100, layout.H - 66, () => this.actions.onLeave(), { width: 200, height: 50, variant: 'secondary' }),
    );
  }

  private renderRemove(): void {
    this.root.addChild(pxLabel(L.ui.shopChooseRemoval, layout.portrait ? 22 : 28, PX.gold, layout.W / 2, 30, 0.5));

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
      pixelButton(L.ui.back, layout.W / 2 - 90, layout.H - 66, () => { this.mode = 'shop'; this.render(); }, { width: 180, height: 50, variant: 'secondary' }),
    );
  }
}
