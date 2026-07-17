import { Container, Graphics } from 'pixi.js';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { isMuted } from '@/render/sound';
import { label, button, panel, UI } from '@/render/ui';

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
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.85 }));

    const w = layout.portrait ? layout.W - 100 : 380;
    const h = 400;
    const x = (layout.W - w) / 2;
    const y = (layout.H - h) / 2;
    const c = new Container();
    c.x = x;
    c.y = y;
    c.addChild(panel(w, h, UI.panel, 16));
    c.addChild(new Graphics().roundRect(0, 0, w, h, 16).stroke({ width: 1.5, color: UI.accent, alpha: 0.5 }));
    c.addChild(label(L.ui.menu, 28, UI.text, w / 2, 24, 0.5));

    const btnW = w - 60;
    const bx = (w - btnW) / 2;
    let by = 80;
    const step = 66;

    if (!this.confirmingAbandon) {
      c.addChild(button(L.ui.resume, bx, by, this.actions.onResume, { width: btnW, height: 50, color: UI.buttonAlt, icon: 'back' }));
      by += step;
      c.addChild(button(L.ui.menuHowToPlay, bx, by, this.actions.onHowToPlay, { width: btnW, height: 50, icon: 'help' }));
      by += step;
      const soundLabel = `${L.ui.sound}：${isMuted() ? L.ui.soundOff : L.ui.soundOn}`;
      c.addChild(button(soundLabel, bx, by, () => this.actions.onToggleSound(), { width: btnW, height: 50, icon: isMuted() ? 'audioOff' : 'audioOn' }));
      by += step;
      c.addChild(button(L.ui.abandonRun, bx, by, () => { this.confirmingAbandon = true; this.render(); }, { width: btnW, height: 50, color: 0x6e2634, icon: 'removeCard' }));
    } else {
      // abandon confirmation
      c.addChild(label(L.ui.abandonConfirm, 15, UI.text, w / 2, 96, 0.5));
      by = 150;
      c.addChild(button(L.ui.abandonRun, bx, by, this.actions.onAbandon, { width: btnW, height: 50, color: 0x6e2634, icon: 'removeCard' }));
      by += step;
      c.addChild(button(L.ui.back, bx, by, () => { this.confirmingAbandon = false; this.render(); }, { width: btnW, height: 50, icon: 'back' }));
    }

    this.root.addChild(c);
  }
}
