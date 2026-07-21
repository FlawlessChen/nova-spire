import { Container } from 'pixi.js';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { isMuted } from '@/render/sound';
import { PX, pxLabel, pixelButton, pixelPanel, pixelOverlay } from '@/render/pixelUi';

// PauseMenu: an in-run overlay (resume / how-to-play / sound toggle / abandon).
// Opened from the combat and map top-bar menu button. All actions call back; it
// reads only the current mute state for its toggle label.

export interface PauseActions {
  onResume: () => void;
  onHowToPlay: () => void;
  onToggleSound: () => void;
  onAbandon: () => void;
}

export class PauseMenu {
  readonly root = new Container();
  private confirmingAbandon = false;

  constructor(private actions: PauseActions) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(pixelOverlay(layout.W, layout.H, 0.85));

    const w = layout.portrait ? layout.W - 100 : 380;
    const h = 400;
    const x = (layout.W - w) / 2;
    const y = (layout.H - h) / 2;
    const c = new Container();
    c.x = x;
    c.y = y;
    c.addChild(pixelPanel(w, h, { color: PX.panel, border: PX.cyan }));
    c.addChild(pxLabel(L.ui.menu, 26, PX.text, w / 2, 24, 0.5));

    const btnW = w - 60;
    const bx = (w - btnW) / 2;
    let by = 80;
    const step = 66;

    if (!this.confirmingAbandon) {
      c.addChild(pixelButton(L.ui.resume, bx, by, this.actions.onResume, { width: btnW, height: 50, variant: 'primary', icon: 'back' }));
      by += step;
      c.addChild(pixelButton(L.ui.menuHowToPlay, bx, by, this.actions.onHowToPlay, { width: btnW, height: 50, variant: 'secondary', icon: 'help' }));
      by += step;
      const soundLabel = `${L.ui.sound}：${isMuted() ? L.ui.soundOff : L.ui.soundOn}`;
      c.addChild(pixelButton(soundLabel, bx, by, () => this.actions.onToggleSound(), { width: btnW, height: 50, variant: 'secondary', icon: isMuted() ? 'audioOff' : 'audioOn' }));
      by += step;
      c.addChild(pixelButton(L.ui.abandonRun, bx, by, () => { this.confirmingAbandon = true; this.render(); }, { width: btnW, height: 50, variant: 'danger', icon: 'removeCard' }));
    } else {
      // abandon confirmation
      c.addChild(pxLabel(L.ui.abandonConfirm, 14, PX.text, w / 2, 96, 0.5));
      by = 150;
      c.addChild(pixelButton(L.ui.abandonRun, bx, by, this.actions.onAbandon, { width: btnW, height: 50, variant: 'danger', icon: 'removeCard' }));
      by += step;
      c.addChild(pixelButton(L.ui.back, bx, by, () => { this.confirmingAbandon = false; this.render(); }, { width: btnW, height: 50, variant: 'secondary', icon: 'back' }));
    }

    this.root.addChild(c);
  }
}
