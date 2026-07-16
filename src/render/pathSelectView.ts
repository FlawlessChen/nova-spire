import { Container, Graphics } from 'pixi.js';
import { PATHS, PATH_IDS } from '@/data/paths';
import { layout } from '@/render/layout';
import { L, pathName, pathTagline, pathDesc, relicName } from '@/i18n';
import { label, wrappedText, button, panel, UI } from '@/render/ui';

// PathSelectView: the run opens here (Hextech-Prism style). Three hero paths,
// each a build identity; picking one starts the run with that deck + signature
// relic + reward bias. Reads path DATA only; calls back with the chosen id.

// Accent color per path, echoing its theme.
const PATH_ACCENT: Record<string, number> = {
  toxicologist: 0x52e09a, // toxin green
  berserker: 0xff7a5c,    // rage ember
  bulwark: 0x4dd8ff,      // bastion cyan
};

export class PathSelectView {
  readonly root = new Container();

  constructor(private onChoose: (pathId: string) => void) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.6 }));

    this.root.addChild(label(L.ui.pathSelectTitle, layout.portrait ? 32 : 40, UI.gold, layout.W / 2, layout.portrait ? 60 : 70, 0.5));
    this.root.addChild(label(L.ui.pathSelectHint, layout.portrait ? 15 : 18, UI.subtle, layout.W / 2, layout.portrait ? 104 : 122, 0.5));

    // portrait → vertical stack of wide cards; landscape → three columns
    if (layout.portrait) {
      const cardW = layout.W - 80;
      const cardH = 300;
      const gap = 28;
      const totalH = PATH_IDS.length * cardH + (PATH_IDS.length - 1) * gap;
      let y = Math.max(150, (layout.H - totalH) / 2);
      for (const id of PATH_IDS) {
        this.root.addChild(this.drawPathCard(id, 40, y, cardW, cardH));
        y += cardH + gap;
      }
    } else {
      const cardW = 340;
      const cardH = 420;
      const gap = 40;
      const totalW = PATH_IDS.length * cardW + (PATH_IDS.length - 1) * gap;
      let x = (layout.W - totalW) / 2;
      const y = 170;
      for (const id of PATH_IDS) {
        this.root.addChild(this.drawPathCard(id, x, y, cardW, cardH));
        x += cardW + gap;
      }
    }
  }

  private drawPathCard(id: string, x: number, y: number, w: number, h: number): Container {
    const path = PATHS[id];
    const accent = PATH_ACCENT[id] ?? UI.accent;
    const c = new Container();
    c.x = x;
    c.y = y;

    c.addChild(panel(w, h, UI.panel, 16));
    c.addChild(new Graphics().roundRect(0, 0, w, h, 16).stroke({ width: 2, color: accent, alpha: 0.8 }));
    // accent header band
    c.addChild(new Graphics().roundRect(2, 2, w - 4, 64, 14).fill({ color: accent, alpha: 0.14 }));

    let cy = 22;
    c.addChild(label(pathName(id), 26, UI.text, w / 2, cy, 0.5));
    cy += 42;
    c.addChild(label(pathTagline(id), 15, accent, w / 2, cy, 0.5));
    cy += 34;

    c.addChild(wrappedText(pathDesc(id), 14, UI.subtle, w - 40, w / 2, cy, 'center'));
    cy = layout.portrait ? h - 120 : h - 150;

    // starting relic line
    const relicId = path.relics[0];
    if (relicId) {
      c.addChild(new Graphics().rect(20, cy, w - 40, 1).fill({ color: 0xffffff, alpha: 0.12 }));
      cy += 12;
      c.addChild(label(`${L.ui.pathStartRelic}：${relicName(relicId)}`, 14, UI.gold, w / 2, cy, 0.5));
      cy += 26;
    }
    c.addChild(label(`${L.ui.pathStartDeck}：${path.deck.length} 张`, 13, UI.subtle, w / 2, cy, 0.5));

    // choose button pinned to the bottom
    const btnW = w - 60;
    c.addChild(
      button(L.ui.startRun, (w - btnW) / 2, h - 62, () => this.onChoose(id), { width: btnW, height: 46, color: UI.button }),
    );

    // whole card is also tappable
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => this.onChoose(id));
    return c;
  }
}
