import { Container } from 'pixi.js';
import { RunManager } from '@/game/runManager';
import { SaveManager } from '@/game/saveManager';
import { CombatEngine } from '@/game/combatEngine';
import { RelicEngine } from '@/game/relicEngine';
import { CombatView } from '@/render/combatView';
import { MapView } from '@/render/mapView';
import { RewardView } from '@/render/rewardView';
import { CampfireView } from '@/render/campfireView';

// App: the top-level FSM that binds RunManager phases to the right view. It owns
// the single active view under `root`, swaps it whenever the run phase changes,
// and persists after every change via SaveManager. Combat is the one phase that
// spins up a CombatEngine; on combat end it feeds the result back to the run.

export class App {
  readonly root = new Container();
  private mgr!: RunManager;
  private save: SaveManager;
  private currentPhaseKey = '';
  private activeView: { root: Container } | null = null;

  constructor(save: SaveManager = new SaveManager()) {
    this.save = save;
  }

  /** Start: resume a saved run if present, else begin a fresh one. */
  start(): void {
    const saved = this.save.load();
    if (saved && saved.phase !== 'won' && saved.phase !== 'lost') {
      this.attach(RunManager.fromState(saved));
    } else {
      this.newRun();
    }
  }

  private newRun(): void {
    const seed = Math.floor(performance.now() * 1000) % 0x7fffffff || 1;
    this.attach(RunManager.newRun(seed));
  }

  private attach(mgr: RunManager): void {
    this.mgr = mgr;
    mgr.onChange((s) => this.save.save(s));
    // force a first render regardless of phase
    this.currentPhaseKey = '';
    this.syncView();
  }

  // Re-evaluate which view should be showing. Combat re-uses its engine/view
  // across re-renders (keyed by the combat node), so we don't rebuild it every
  // time the player plays a card.
  private syncView(): void {
    const phase = this.mgr.state.phase;
    const key = this.viewKey();
    if (key === this.currentPhaseKey) {
      // same logical view — just re-render it
      this.renderActive();
      return;
    }
    this.currentPhaseKey = key;
    this.root.removeChildren();

    switch (phase) {
      case 'map':
      case 'won':
      case 'lost':
        this.showMap();
        break;
      case 'combat':
        this.showCombat();
        break;
      case 'reward':
        this.showReward();
        break;
      case 'campfire':
        this.showCampfire();
        break;
    }
  }

  // A key that changes only when the ACTIVE VIEW should change. Combat is keyed
  // by the current node so a new battle rebuilds, but playing cards doesn't.
  private viewKey(): string {
    const s = this.mgr.state;
    switch (s.phase) {
      case 'combat':
        return `combat:${s.currentNodeId}`;
      case 'map':
      case 'won':
      case 'lost':
        return 'map';
      case 'reward':
        return `reward:${s.currentNodeId}`;
      case 'campfire':
        return `campfire:${s.currentNodeId}`;
    }
  }

  private renderActive(): void {
    const v = this.activeView as unknown as { render?: () => void };
    v?.render?.();
  }

  /** Re-render the active view in place (e.g. after an orientation change). */
  rerender(): void {
    this.renderActive();
  }

  // ── view builders ──
  private showMap(): void {
    const view = new MapView(this.mgr, (nodeId) => {
      if (nodeId === '__restart__') {
        this.save.clear();
        this.newRun();
        return;
      }
      this.mgr.enterNode(nodeId);
      this.syncView();
    });
    this.setActive(view);
  }

  private showCombat(): void {
    const engine = new CombatEngine(this.mgr.combatConfigForCurrentNode());
    // Wire the player's relics as event-bus subscribers BEFORE start(), so
    // onCombatStart relics fire on turn 1. The engine stays unaware of relics.
    const relicEngine = new RelicEngine(engine, this.mgr.state.relics);
    relicEngine.attach(engine.bus);
    const view = new CombatView(engine, (won, playerHp) => {
      relicEngine.detach();
      this.mgr.resolveCombat(won, playerHp);
      this.syncView();
    }, this.mgr.state.relics);
    engine.start();
    this.setActive(view);
  }

  private showReward(): void {
    const choices = this.mgr.state.pendingReward ?? [];
    const view = new RewardView(choices, (cardId) => {
      this.mgr.chooseReward(cardId);
      this.syncView();
    }, this.mgr.state.pendingRelic);
    this.setActive(view);
  }

  private showCampfire(): void {
    const view = new CampfireView(this.mgr, () => {
      this.mgr.restAtCampfire();
      this.syncView();
    });
    this.setActive(view);
  }

  private setActive(view: { root: Container; render: () => void }): void {
    this.activeView = view;
    this.root.addChild(view.root);
    view.render();
  }
}
