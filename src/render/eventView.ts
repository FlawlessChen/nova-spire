import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { EVENTS } from '@/data/events';
import { layout } from '@/render/layout';
import { button, label, panel, UI, wrappedText } from '@/render/ui';
import { L } from '@/i18n';

export class EventView {
  readonly root = new Container();

  constructor(private mgr: RunManager, private onChoose: (choiceId: string) => void) {}

  render(): void {
    this.root.removeChildren();
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.92 }));
    const event = this.mgr.state.pendingEventId ? EVENTS[this.mgr.state.pendingEventId] : null;
    if (!event) return;
    const copy = L.events[event.id];
    if (!copy) return;
    const w = Math.min(layout.W - 64, 720);
    const x = (layout.W - w) / 2;
    const box = panel(w, layout.H * 0.64, UI.panel);
    box.x = x;
    box.y = layout.H * 0.18;
    this.root.addChild(box);
    this.root.addChild(label('✦', 56, UI.accent, layout.W / 2, layout.H * 0.22, 0.5));
    this.root.addChild(label(copy.title, layout.portrait ? 28 : 34, UI.gold, layout.W / 2, layout.H * 0.31, 0.5));
    this.root.addChild(wrappedText(copy.body, layout.portrait ? 17 : 20, UI.text, w - 80, layout.W / 2, layout.H * 0.39));
    const bw = Math.min(w - 80, 520);
    const startY = layout.H * 0.51;
    event.choices.forEach((choice, i) => {
      this.root.addChild(button(copy.choices[choice.id] ?? choice.id, layout.W / 2 - bw / 2, startY + i * 82, () => this.onChoose(choice.id), { width: bw, height: 58, fontSize: layout.portrait ? 15 : 17, color: i === 0 ? UI.buttonAlt : UI.button }));
    });
  }
}
