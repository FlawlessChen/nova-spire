import { Container, Graphics } from 'pixi.js';
import { PATHS, PATH_IDS } from '@/data/paths';
import { layout } from '@/render/layout';
import { L, pathName, pathTagline, pathDesc, relicName } from '@/i18n';
import { PX, pxLabel, pxWrapped, pixelButton, pixelPanel, pixelOverlay } from '@/render/pixelUi';

// PathSelectView: the run opens here. Three hero paths, each a build identity;
// picking one starts the run with that deck + signature relic + reward bias.
// Reads path DATA only; calls back with the chosen id.

// Accent color per path, echoing its theme — mapped onto the pixel palette so
// the path colour recurs across the run.
const PATH_ACCENT: Record<string, number> = {
  toxicologist: PX.green,  // toxin
  berserker: PX.red,       // rage
  bulwark: PX.cyan,        // bastion
};

export class PathSelectView {
  readonly root = new Container();

  constructor(private onChoose: (pathId: string) => void) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(pixelOverlay(layout.W, layout.H, 0.6));

    this.root.addChild(pxLabel(L.ui.pathSelectTitle, layout.portrait ? 30 : 38, PX.gold, layout.W / 2, layout.portrait ? 60 : 70, 0.5));
    this.root.addChild(pxLabel(L.ui.pathSelectHint, layout.portrait ? 14 : 16, PX.subtle, layout.W / 2, layout.portrait ? 104 : 122, 0.5));

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
    const accent = PATH_ACCENT[id] ?? PX.cyan;
    const c = new Container();
    c.x = x;
    c.y = y;

    c.addChild(pixelPanel(w, h, { color: PX.panel, border: accent }));
    // accent header band (sharp rect)
    c.addChild(new Graphics().rect(2, 2, w - 4, 64).fill({ color: accent, alpha: 0.16 }));

    let cy = 22;
    c.addChild(pxLabel(pathName(id), 24, PX.text, w / 2, cy, 0.5));
    cy += 42;
    c.addChild(pxLabel(pathTagline(id), 14, accent, w / 2, cy, 0.5));
    cy += 34;

    c.addChild(pxWrapped(pathDesc(id), 13, PX.subtle, w - 40, w / 2, cy, 'center'));
    cy = layout.portrait ? h - 120 : h - 150;

    // starting relic line
    const relicId = path.relics[0];
    if (relicId) {
      c.addChild(new Graphics().rect(20, cy, w - 40, 1).fill({ color: PX.ink, alpha: 0.12 }));
      cy += 12;
      c.addChild(pxLabel(`${L.ui.pathStartRelic}：${relicName(relicId)}`, 13, PX.gold, w / 2, cy, 0.5));
      cy += 26;
    }
    c.addChild(pxLabel(`${L.ui.pathStartDeck}：${path.deck.length} 张`, 12, PX.subtle, w / 2, cy, 0.5));

    // choose button pinned to the bottom
    const btnW = w - 60;
    c.addChild(
      pixelButton(L.ui.startRun, (w - btnW) / 2, h - 62, () => this.onChoose(id), { width: btnW, height: 46, fontSize: 16, variant: 'secondary' }),
    );

    // whole card is also tappable
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => this.onChoose(id));
    return c;
  }
}
