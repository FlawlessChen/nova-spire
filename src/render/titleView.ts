import { Container, Graphics } from 'pixi.js';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { label, button, UI, glowCircle } from '@/render/ui';

// TitleView: the front door. A large "NOVA SPIRE" wordmark with a nova emblem,
// subtitle, and a vertical menu. Continue appears only when a run can be
// resumed. Reads no game state beyond `canContinue`; all actions call back.

export interface TitleActions {
  onNewRun: () => void;
  onContinue: () => void;
  onHowToPlay: () => void;
  onAbout: () => void;
}

export class TitleView {
  readonly root = new Container();

  constructor(
    private canContinue: boolean,
    private actions: TitleActions,
  ) {}

  render(): void {
    this.root.removeChildren();
    const cx = layout.W / 2;
    const topY = layout.portrait ? layout.H * 0.16 : layout.H * 0.2;

    // nova emblem above the title
    const emblem = new Container();
    emblem.x = cx;
    emblem.y = topY;
    emblem.addChild(glowCircle(0, 0, 26, UI.accent, 0.0));
    const r = 30;
    emblem.addChild(
      new Graphics()
        .poly([0, -r, r * 0.2, -r * 0.2, r, 0, r * 0.2, r * 0.2, 0, r, -r * 0.2, r * 0.2, -r, 0, -r * 0.2, -r * 0.2])
        .fill({ color: UI.accent, alpha: 0.95 }),
    );
    emblem.addChild(new Graphics().circle(0, 0, r * 0.3).fill(0xeafcff));
    this.root.addChild(emblem);

    // wordmark
    const titleSize = layout.portrait ? 60 : 84;
    this.root.addChild(label('NOVA', titleSize, UI.text, cx, topY + 48, 0.5));
    this.root.addChild(label('SPIRE', titleSize, UI.accent, cx, topY + 48 + titleSize * 0.95, 0.5));
    this.root.addChild(label('新星之塔', layout.portrait ? 24 : 28, UI.subtle, cx, topY + 48 + titleSize * 2, 0.5));
    this.root.addChild(label(L.ui.gameSubtitle, layout.portrait ? 14 : 16, UI.subtle, cx, topY + 48 + titleSize * 2 + 40, 0.5));

    // menu buttons
    const btnW = layout.portrait ? layout.W - 120 : 300;
    let by = layout.portrait ? layout.H * 0.58 : layout.H * 0.56;
    const step = 70;

    if (this.canContinue) {
      this.root.addChild(button(L.ui.menuContinue, cx - btnW / 2, by, this.actions.onContinue, { width: btnW, height: 56, color: UI.buttonAlt }));
      by += step;
    }
    this.root.addChild(button(L.ui.menuNewRun, cx - btnW / 2, by, this.actions.onNewRun, { width: btnW, height: 56 }));
    by += step;
    // secondary row: how-to-play + about side by side
    const halfW = (btnW - 16) / 2;
    this.root.addChild(button(L.ui.menuHowToPlay, cx - btnW / 2, by, this.actions.onHowToPlay, { width: halfW, height: 50, fontSize: 17, color: 0x2a3352 }));
    this.root.addChild(button(L.ui.menuAbout, cx - btnW / 2 + halfW + 16, by, this.actions.onAbout, { width: halfW, height: 50, fontSize: 17, color: 0x2a3352 }));
  }
}
