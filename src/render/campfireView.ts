import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { layout } from '@/render/layout';
import { label, button, UI } from '@/render/ui';

// CampfireView: a rest node. Shows the heal on offer and a Rest button. Reads
// RunManager to preview the heal amount; the actual heal happens in RunManager.

export class CampfireView {
  readonly root = new Container();

  constructor(
    private mgr: RunManager,
    private onRest: () => void,
  ) {}

  render(): void {
    this.root.removeChildren();
    const state = this.mgr.state;
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill(UI.overlay));

    // proportional vertical placement works in both orientations
    this.root.addChild(label('🔥', 72, UI.text, layout.W / 2, layout.H * 0.25, 0.5));
    this.root.addChild(label('篝火', 36, UI.accent, layout.W / 2, layout.H * 0.375, 0.5));

    const healAmount = Math.floor(state.playerMaxHp * 0.3);
    const healed = Math.min(state.playerMaxHp, state.playerHp + healAmount);
    this.root.addChild(
      label(`休息可恢复 ${healed - state.playerHp} 点生命`, 22, UI.text, layout.W / 2, layout.H * 0.47, 0.5),
    );
    this.root.addChild(
      label(`${state.playerHp} → ${healed} / ${state.playerMaxHp}`, 20, UI.good, layout.W / 2, layout.H * 0.52, 0.5),
    );

    this.root.addChild(
      button('休息', layout.W / 2 - 100, layout.H * 0.61, () => this.onRest(), { width: 200, color: UI.buttonAlt }),
    );
  }
}
