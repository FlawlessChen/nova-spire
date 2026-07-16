import { Container } from 'pixi.js';
import { RunManager } from '@/game/runManager';
import { SaveManager } from '@/game/saveManager';
import { CombatEngine } from '@/game/combatEngine';
import { RelicEngine } from '@/game/relicEngine';
import { CombatView } from '@/render/combatView';
import { MapView } from '@/render/mapView';
import { RewardView } from '@/render/rewardView';
import { CampfireView } from '@/render/campfireView';
import { PathSelectView } from '@/render/pathSelectView';

// App: the top-level FSM that binds RunManager phases to the right view. It owns
// the single active view under `root`, swaps it whenever the run phase changes,
// and persists after every change via SaveManager. Combat is the one phase that
// spins up a CombatEngine; on combat end it feeds the result back to the run.
//
// Before a run exists (no resumable save), the App shows a hero-path selection
// screen; the chosen path seeds RunManager.newRun.

export class App {
  readonly root = new Container();
  private mgr: RunManager | null = null;
  private save: SaveManager;
  private currentPhaseKey = '';
  private activeView: { root: Container } | null = null;

  constructor(save: SaveManager = new SaveManager()) {
    this.save = save;
  }

  /** Start: resume a saved run if present, else offer hero-path selection. */
  start(): void {
    const saved = this.save.load();
    if (saved && saved.phase !== 'won' && saved.phase !== 'lost') {
      this.attach(RunManager.fromState(saved));
    } else {
      this.showPathSelect();
    }
  }

  // Hero-path selection gate — shown when there's no run to resume.
  private showPathSelect(): void {
    this.mgr = null;
    this.currentPhaseKey = 'pathSelect';
    this.root.removeChildren();
    const view = new PathSelectView((pathId) => this.newRun(pathId));
    this.setActive(view);
  }

  private newRun(pathId: string): void {
    const seed = Math.floor(performance.now() * 1000) % 0x7fffffff || 1;
    this.attach(RunManager.newRun(seed, pathId));
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
    const mgr = this.mgr;
    if (!mgr) return;
    const phase = mgr.state.phase;
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
    const s = this.mgr?.state;
    if (!s) return 'pathSelect';
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
    const mgr = this.mgr!;
    const view = new MapView(mgr, (nodeId) => {
      if (nodeId === '__restart__') {
        this.save.clear();
        this.showPathSelect(); // a new run picks a fresh path
        return;
      }
      mgr.enterNode(nodeId);
      this.syncView();
    });
    this.setActive(view);
  }

  private showCombat(): void {
    const mgr = this.mgr!;
    const engine = new CombatEngine(mgr.combatConfigForCurrentNode());
    // Wire the player's relics as event-bus subscribers BEFORE start(), so
    // onCombatStart relics fire on turn 1. The engine stays unaware of relics.
    const relicEngine = new RelicEngine(engine, mgr.state.relics);
    relicEngine.attach(engine.bus);
    const view = new CombatView(engine, (won, playerHp) => {
      relicEngine.detach();
      mgr.resolveCombat(won, playerHp);
      this.syncView();
    }, mgr.state.relics);
    engine.start();
    this.setActive(view);
  }

  private showReward(): void {
    const mgr = this.mgr!;
    const choices = mgr.state.pendingReward ?? [];
    const view = new RewardView(choices, (cardId) => {
      mgr.chooseReward(cardId);
      this.syncView();
    }, mgr.state.pendingRelic);
    this.setActive(view);
  }

  private showCampfire(): void {
    const mgr = this.mgr!;
    const view = new CampfireView(mgr, () => {
      mgr.restAtCampfire();
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
