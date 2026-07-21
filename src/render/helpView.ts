import { Container } from 'pixi.js';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { PX, pxLabel, pxWrapped, pixelButton, pixelPanel, pixelOverlay } from '@/render/pixelUi';

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
    this.root.addChild(pixelOverlay(layout.W, layout.H, 0.92));

    const margin = layout.portrait ? 30 : 120;
    const w = layout.W - margin * 2;
    const title = this.mode === 'help' ? L.ui.helpTitle : L.ui.aboutTitle;
    this.root.addChild(pxLabel(title, layout.portrait ? 26 : 32, PX.gold, layout.W / 2, 40, 0.5));

    if (this.mode === 'about') {
      const p = new Container();
      p.x = margin;
      p.y = 120;
      p.addChild(pixelPanel(w, 200, { color: PX.panel, border: PX.cyan }));
      p.addChild(pxWrapped(L.ui.aboutBody, layout.portrait ? 14 : 16, PX.text, w - 48, w / 2, 30, 'center'));
      this.root.addChild(p);
    } else {
      // rule sections stacked in panels
      let y = 100;
      const bodySize = layout.portrait ? 13 : 14;
      const headSize = layout.portrait ? 16 : 18;
      for (const sec of L.ui.helpSections) {
        // estimate wrapped height: CJK glyphs are ~1em wide
        const charsPerLine = Math.floor((w - 40) / bodySize);
        const lines = Math.max(1, Math.ceil(sec.body.length / Math.max(1, charsPerLine)));
        const bodyH = lines * (bodySize + 6);
        const secH = 30 + bodyH + 18;

        const p = new Container();
        p.x = margin;
        p.y = y;
        p.addChild(pixelPanel(w, secH, { color: PX.panel, border: PX.panelBorder }));
        p.addChild(pxLabel(sec.heading, headSize, PX.cyan, 20, 12));
        p.addChild(pxWrapped(sec.body, bodySize, PX.text, w - 40, 20, 40, 'left'));
        this.root.addChild(p);
        y += secH + 12;
      }
    }

    this.root.addChild(
      pixelButton(L.ui.back, layout.W / 2 - 90, layout.H - 76, () => this.onClose(), { width: 180, height: 52, variant: 'secondary' }),
    );
  }
}
