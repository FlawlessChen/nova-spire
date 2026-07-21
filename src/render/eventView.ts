import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { EVENTS } from '@/data/events';
import { layout } from '@/render/layout';
import { PX, pxLabel, pxWrapped, pixelButton, pixelPanel, pixelOverlay } from '@/render/pixelUi';
import { L } from '@/i18n';

export class EventView {
  readonly root = new Container();

  constructor(private mgr: RunManager, private onChoose: (choiceId: string) => void) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(pixelOverlay(layout.W, layout.H, 0.92));
    const event = this.mgr.state.pendingEventId ? EVENTS[this.mgr.state.pendingEventId] : null;
    if (!event) return;
    const copy = L.events[event.id];
    if (!copy) return;
    const w = Math.min(layout.W - 64, 720);
    const x = (layout.W - w) / 2;
    const box = pixelPanel(w, layout.H * 0.64, { color: PX.panel, border: PX.cyan });
    box.x = x;
    box.y = layout.H * 0.18;
    this.root.addChild(box);

    // pixel diamond sigil (replaces the ✦ emoji — reliable cross-platform)
    const dy = layout.H * 0.22;
    const dg = new Graphics().poly([layout.W / 2, dy - 22, layout.W / 2 + 18, dy, layout.W / 2, dy + 22, layout.W / 2 - 18, dy]).fill({ color: PX.cyan, alpha: 0.9 });
    this.root.addChild(dg);

    this.root.addChild(pxLabel(copy.title, layout.portrait ? 26 : 32, PX.gold, layout.W / 2, layout.H * 0.31, 0.5));
    this.root.addChild(pxWrapped(copy.body, layout.portrait ? 15 : 18, PX.text, w - 80, layout.W / 2, layout.H * 0.39));
    const bw = Math.min(w - 80, 520);
    const startY = layout.H * 0.51;
    event.choices.forEach((choice, i) => {
      this.root.addChild(pixelButton(copy.choices[choice.id] ?? choice.id, layout.W / 2 - bw / 2, startY + i * 82, () => this.onChoose(choice.id), { width: bw, height: 58, fontSize: layout.portrait ? 14 : 16, variant: i === 0 ? 'primary' : 'secondary' }));
    });
  }
}
