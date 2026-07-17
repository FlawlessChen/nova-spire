import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { canUpgrade } from '@/data/cardUpgrade';
import { label, button, UI, glowCircle } from '@/render/ui';
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
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.9 }));
    if (this.mode === 'choose') this.renderChoose();
    else this.renderUpgrade();
  }

  private renderChoose(): void {
    const state = this.mgr.state;
    this.root.addChild(glowCircle(layout.W / 2, layout.H * 0.24, 46, 0xff9a4d, 0.12));
    this.root.addChild(label('🔥', 70, UI.text, layout.W / 2, layout.H * 0.22, 0.5));
    this.root.addChild(label(L.ui.campfire, 34, UI.gold, layout.W / 2, layout.H * 0.34, 0.5));

    const healAmount = Math.floor(state.playerMaxHp * 0.3);
    const healed = Math.min(state.playerMaxHp, state.playerHp + healAmount);
    const canUp = this.mgr.upgradeableCards().length > 0;

    // two option buttons side by side (stacked in portrait)
    const btnW = layout.portrait ? layout.W - 120 : 300;
    const cx = layout.W / 2;
    let y = layout.H * 0.46;

    // rest
    this.root.addChild(label(`${L.ui.campfireRest}：${L.ui.campfireHeal(healed - state.playerHp)}`, 16, UI.subtle, cx, y - 6, 0.5));
    this.root.addChild(button(L.ui.campfireRest, cx - btnW / 2, y + 12, () => this.onRest(), { width: btnW, height: 52, color: UI.buttonAlt }));
    y += 100;

    // upgrade
    this.root.addChild(label(L.ui.campfireUpgradeHint, 16, UI.subtle, cx, y - 6, 0.5));
    this.root.addChild(button(L.ui.campfireUpgrade, cx - btnW / 2, y + 12, () => { this.mode = 'upgrade'; this.render(); }, { width: btnW, height: 52, enabled: canUp, icon: canUp ? 'unlocked' : 'locked' }));
    if (!canUp) {
      this.root.addChild(label(L.ui.campfireNoUpgrade, 13, UI.subtle, cx, y + 72, 0.5));
    }
  }

  private renderUpgrade(): void {
    this.root.addChild(label(L.ui.campfireUpgrade, layout.portrait ? 26 : 32, UI.gold, layout.W / 2, 30, 0.5));

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
      button(L.ui.back, layout.W / 2 - 90, layout.H - 72, () => { this.mode = 'choose'; this.render(); }, { width: 180, height: 50 }),
    );
  }
}
