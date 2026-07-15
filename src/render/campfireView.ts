import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import { layout } from '@/render/layout';
import { L } from '@/i18n';
import { label, button, UI, glowCircle } from '@/render/ui';

// CampfireView: a rest node beneath the stars. Shows the heal on offer and a
// Rest button. Reads RunManager to preview the heal; the actual heal happens
// in RunManager.

export class CampfireView {
  readonly root = new Container();

  constructor(
    private mgr: RunManager,
    private onRest: () => void,
  ) {}

  render(): void {
    this.root.removeChildren();
    const state = this.mgr.state;
    this.root.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: UI.overlay, alpha: 0.88 }));

    // warm glow behind the fire
    this.root.addChild(glowCircle(layout.W / 2, layout.H * 0.27, 46, 0xff9a4d, 0.12));
    this.root.addChild(label('🔥', 72, UI.text, layout.W / 2, layout.H * 0.25, 0.5));
    this.root.addChild(label(L.ui.campfire, 36, UI.gold, layout.W / 2, layout.H * 0.375, 0.5));

    const healAmount = Math.floor(state.playerMaxHp * 0.3);
    const healed = Math.min(state.playerMaxHp, state.playerHp + healAmount);
    this.root.addChild(
      label(L.ui.campfireHeal(healed - state.playerHp), 22, UI.text, layout.W / 2, layout.H * 0.47, 0.5),
    );
    this.root.addChild(
      label(L.ui.campfireHp(state.playerHp, healed, state.playerMaxHp), 20, UI.good, layout.W / 2, layout.H * 0.52, 0.5),
    );

    this.root.addChild(
      button(L.ui.rest, layout.W / 2 - 100, layout.H * 0.61, () => this.onRest(), { width: 200, color: UI.buttonAlt }),
    );
  }
}
