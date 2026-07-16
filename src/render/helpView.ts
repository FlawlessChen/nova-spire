import { Container, Graphics } from 'pixi.js';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { label, wrappedText, button, panel, UI } from '@/render/ui';

// HelpView: a themed overlay explaining the rules (or the About blurb). Opened
// from the title screen and the in-run menu. Pure presentation; onClose calls
// back. Two modes: 'help' (sectioned rules) and 'about'.

export class HelpView {
  readonly root = new Container();

  constructor(
    private mode: 'help' | 'about',
    private onClose: () => void,
  ) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.92 }));

    const margin = layout.portrait ? 30 : 120;
    const w = layout.W - margin * 2;
    const title = this.mode === 'help' ? L.ui.helpTitle : L.ui.aboutTitle;
    this.root.addChild(label(title, layout.portrait ? 28 : 34, UI.gold, layout.W / 2, 40, 0.5));

    if (this.mode === 'about') {
      const p = new Container();
      p.x = margin;
      p.y = 120;
      p.addChild(panel(w, 200, UI.panel, 14));
      p.addChild(wrappedText(L.ui.aboutBody, layout.portrait ? 15 : 17, UI.text, w - 48, w / 2, 30, 'center'));
      this.root.addChild(p);
    } else {
      // rule sections stacked in panels
      let y = 100;
      const bodySize = layout.portrait ? 14 : 15;
      const headSize = layout.portrait ? 17 : 19;
      for (const sec of L.ui.helpSections) {
        // estimate wrapped height: rough chars-per-line from width
        const charsPerLine = Math.floor((w - 40) / (bodySize * 0.95));
        const lines = Math.max(1, Math.ceil(sec.body.length / Math.max(1, charsPerLine)));
        const bodyH = lines * (bodySize + 5);
        const secH = 30 + bodyH + 18;

        const p = new Container();
        p.x = margin;
        p.y = y;
        p.addChild(panel(w, secH, UI.panel, 12));
        p.addChild(label(sec.heading, headSize, UI.accent, 20, 12));
        p.addChild(wrappedText(sec.body, bodySize, UI.text, w - 40, 20, 40, 'left'));
        this.root.addChild(p);
        y += secH + 12;
      }
    }

    this.root.addChild(
      button(L.ui.back, layout.W / 2 - 90, layout.H - 76, () => this.onClose(), { width: 180, height: 52 }),
    );
  }
}
