import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { canUpgrade } from '@/data/cardUpgrade';
import { PX, pxLabel, pixelButton, pixelOverlay, pixelGlow } from '@/render/pixelUi';
import { cardFace } from '@/render/cardArt';

// CampfireView: a rest node with a choice — rest (heal) OR upgrade a card.
// Choosing upgrade opens a grid of the deck's still-upgradeable cards; tapping
// one upgrades it. Reads RunManager; the actual heal/upgrade happen there.

export class CampfireView {
  readonly root = new Container();
  private mode: 'choose' | 'upgrade' = 'choose';

  constructor(
    private mgr: RunManager,
    private onRest: () => void,
    private onUpgrade: (deckIndex: number) => void,
  ) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(pixelOverlay(layout.W, layout.H, 0.9));
    if (this.mode === 'choose') this.renderChoose();
    else this.renderUpgrade();
  }

  private renderChoose(): void {
    const state = this.mgr.state;
    const cx = layout.W / 2;
    const fireY = layout.H * 0.24;

    // pixel flame: layered triangles in fire colours
    this.root.addChild(pixelGlow(cx, fireY, 40, PX.orange, 0.12));
    const flame = new Graphics();
    const s = 26;
    flame.poly([cx, fireY - s, cx + s * 0.6, fireY + s * 0.2, cx + s * 0.3, fireY + s * 0.6, cx, fireY + s, cx - s * 0.3, fireY + s * 0.6, cx - s * 0.6, fireY + s * 0.2]).fill({ color: PX.red, alpha: 0.85 });
    flame.poly([cx, fireY - s * 0.7, cx + s * 0.4, fireY + s * 0.1, cx + s * 0.2, fireY + s * 0.5, cx, fireY + s * 0.8, cx - s * 0.2, fireY + s * 0.5, cx - s * 0.4, fireY + s * 0.1]).fill({ color: PX.orange, alpha: 0.9 });
    flame.poly([cx, fireY - s * 0.3, cx + s * 0.2, fireY + s * 0.2, cx, fireY + s * 0.5, cx - s * 0.2, fireY + s * 0.2]).fill({ color: PX.gold, alpha: 0.95 });
    this.root.addChild(flame);

    this.root.addChild(pxLabel(L.ui.campfire, 30, PX.gold, cx, layout.H * 0.36, 0.5));

    const healAmount = Math.floor(state.playerMaxHp * 0.3);
    const healed = Math.min(state.playerMaxHp, state.playerHp + healAmount);
    const canUp = this.mgr.upgradeableCards().length > 0;

    // two option buttons side by side (stacked in portrait)
    const btnW = layout.portrait ? layout.W - 120 : 300;
    let y = layout.H * 0.48;

    // rest
    this.root.addChild(pxLabel(`${L.ui.campfireRest}：${L.ui.campfireHeal(healed - state.playerHp)}`, 15, PX.subtle, cx, y - 6, 0.5));
    this.root.addChild(pixelButton(L.ui.campfireRest, cx - btnW / 2, y + 12, () => this.onRest(), { width: btnW, height: 52, variant: 'primary' }));
    y += 100;

    // upgrade
    this.root.addChild(pxLabel(L.ui.campfireUpgradeHint, 15, PX.subtle, cx, y - 6, 0.5));
    this.root.addChild(pixelButton(L.ui.campfireUpgrade, cx - btnW / 2, y + 12, () => { this.mode = 'upgrade'; this.render(); }, { width: btnW, height: 52, enabled: canUp, variant: 'secondary', icon: canUp ? 'unlocked' : 'locked' }));
    if (!canUp) {
      this.root.addChild(pxLabel(L.ui.campfireNoUpgrade, 12, PX.subtle, cx, y + 72, 0.5));
    }
  }

  private renderUpgrade(): void {
    this.root.addChild(pxLabel(L.ui.campfireUpgrade, layout.portrait ? 24 : 30, PX.gold, layout.W / 2, 30, 0.5));

    // grid of upgradeable deck cards, tapping one upgrades it. We index into the
    // real deck so duplicates upgrade the right slot.
    const deck = this.mgr.state.deck;
    const entries: { entry: string; index: number }[] = [];
    deck.forEach((entry, index) => { if (canUpgrade(entry)) entries.push({ entry, index }); });

    const cardW = layout.portrait ? 104 : 120;
    const cardH = Math.round(cardW * 1.3);
    const gap = 14;
    const cols = Math.max(1, Math.floor((layout.W - 40 + gap) / (cardW + gap)));
    const totalW = Math.min(entries.length, cols) * cardW + (Math.min(entries.length, cols) - 1) * gap;
    const startX = (layout.W - totalW) / 2;
    const topY = 80;

    entries.forEach(({ entry, index }, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const face = cardFace(entry, cardW, cardH);
      face.x = startX + col * (cardW + gap);
      face.y = topY + row * (cardH + gap);
      face.eventMode = 'static';
      face.cursor = 'pointer';
      face.on('pointertap', () => this.onUpgrade(index));
      this.root.addChild(face);
    });

    this.root.addChild(
      pixelButton(L.ui.back, layout.W / 2 - 90, layout.H - 72, () => { this.mode = 'choose'; this.render(); }, { width: 180, height: 50, variant: 'secondary' }),
    );
  }
}
