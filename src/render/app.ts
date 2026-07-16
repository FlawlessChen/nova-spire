import { Container } from 'pixi.js';
import { RunManager } from '@/game/runManager';
import { SaveManager } from '@/game/saveManager';
import { CombatEngine } from '@/game/combatEngine';
import { RelicEngine } from '@/game/relicEngine';
import { CombatView } from '@/render/combatView';
import { MapView } from '@/render/mapView';
import { RewardView } from '@/render/rewardView';
import { CampfireView } from '@/render/campfireView';
import { ShopView } from '@/render/shopView';
import { PathSelectView } from '@/render/pathSelectView';
import { TitleView } from '@/render/titleView';
import { HelpView } from '@/render/helpView';
import { PauseMenu } from '@/render/pauseMenu';
import { DeckView } from '@/render/deckView';
import { toggleMute } from '@/render/sound';
import { L } from '@/i18n';

// App: the top-level FSM. Two stacked layers:
//   screenLayer — the current primary screen (title / path-select / run views)
//   overlayLayer — modal overlays on top (help, pause menu, deck viewer)
// A run's phase (map/combat/reward/campfire) drives the screen; the title and
// path-select gates sit in front of a run. Persistence via SaveManager onChange.

type Overlay = { root: Container; render: () => void };

export class App {
  readonly root = new Container();
  private screenLayer = new Container();
  private overlayLayer = new Container();

  private mgr: RunManager | null = null;
  private save: SaveManager;
  private currentPhaseKey = '';
  private activeView: { root: Container } | null = null;
  private activeOverlay: Overlay | null = null;
  private transitionId = 0;

  constructor(save: SaveManager = new SaveManager()) {
    this.save = save;
    this.root.addChild(this.screenLayer);
    this.root.addChild(this.overlayLayer);
  }

  /** Start on the title screen. */
  start(): void {
    this.showTitle();
  }

  // ── title / gates ──
  private showTitle(): void {
    this.mgr = null;
    this.clearOverlay();
    this.currentPhaseKey = 'title';
    const canContinue = this.save.hasSave() && this.savedResumable();
    const view = new TitleView(canContinue, {
      onNewRun: () => this.showPathSelect(),
      onContinue: () => this.continueRun(),
      onHowToPlay: () => this.openOverlay(new HelpView('help', () => this.clearOverlay())),
      onAbout: () => this.openOverlay(new HelpView('about', () => this.clearOverlay())),
    });
    this.setScreen(view);
  }

  private savedResumable(): boolean {
    const s = this.save.load();
    return !!s && s.phase !== 'won' && s.phase !== 'lost';
  }

  private continueRun(): void {
    const saved = this.save.load();
    if (saved && saved.phase !== 'won' && saved.phase !== 'lost') {
      this.attach(RunManager.fromState(saved));
    } else {
      this.showPathSelect();
    }
  }

  // Hero-path selection gate.
  private showPathSelect(): void {
    this.mgr = null;
    this.clearOverlay();
    this.currentPhaseKey = 'pathSelect';
    const view = new PathSelectView((pathId) => this.newRun(pathId));
    this.setScreen(view);
  }

  private newRun(pathId: string): void {
    const seed = Math.floor(performance.now() * 1000) % 0x7fffffff || 1;
    this.attach(RunManager.newRun(seed, pathId));
  }

  private attach(mgr: RunManager): void {
    this.mgr = mgr;
    mgr.onChange((s) => this.save.save(s));
    this.currentPhaseKey = '';
    this.syncView();
  }

  // ── run phase → screen ──
  private syncView(): void {
    const mgr = this.mgr;
    if (!mgr) return;
    const phase = mgr.state.phase;
    const key = this.viewKey();
    if (key === this.currentPhaseKey) {
      this.renderActive();
      return;
    }
    this.currentPhaseKey = key;

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
      case 'shop':
        this.showShop();
        break;
    }
  }

  private viewKey(): string {
    const s = this.mgr?.state;
    if (!s) return this.currentPhaseKey || 'title';
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
      case 'shop':
        return `shop:${s.currentNodeId}`;
    }
  }

  private renderActive(): void {
    const v = this.activeView as unknown as { render?: () => void };
    v?.render?.();
  }

  /** Re-render the active screen + overlay in place (e.g. after rotation). */
  rerender(): void {
    this.renderActive();
    this.activeOverlay?.render();
  }

  // ── run view builders ──
  private showMap(): void {
    const mgr = this.mgr!;
    const view = new MapView(mgr, (nodeId) => {
      if (nodeId === '__restart__') {
        this.save.clear();
        this.showTitle(); // finished run → back to the front door
        return;
      }
      mgr.enterNode(nodeId);
      this.syncView();
    }, {
      onMenu: () => this.openPauseMenu(),
      onViewDeck: () => this.openDeck(),
    });
    this.setScreen(view);
  }

  private showCombat(): void {
    const mgr = this.mgr!;
    const engine = new CombatEngine(mgr.combatConfigForCurrentNode());
    const relicEngine = new RelicEngine(engine, mgr.state.relics);
    relicEngine.attach(engine.bus);
    const view = new CombatView(engine, (won, playerHp) => {
      relicEngine.detach();
      mgr.resolveCombat(won, playerHp);
      this.syncView();
    }, mgr.state.relics, {
      onMenu: () => this.openPauseMenu(),
      onViewPile: (which) => this.openPile(engine, which),
    });
    engine.start();
    this.setScreen(view);
  }

  private showReward(): void {
    const mgr = this.mgr!;
    const choices = mgr.state.pendingReward ?? [];
    const view = new RewardView(choices, (cardId) => {
      mgr.chooseReward(cardId);
      this.syncView();
    }, mgr.state.pendingRelic);
    this.setScreen(view);
  }

  private showCampfire(): void {
    const mgr = this.mgr!;
    const view = new CampfireView(mgr, () => {
      mgr.restAtCampfire();
      this.syncView();
    }, (deckIndex) => {
      mgr.upgradeCardAtCampfire(deckIndex);
      this.syncView();
    });
    this.setScreen(view);
  }

  private showShop(): void {
    const mgr = this.mgr!;
    const view = new ShopView(mgr, {
      onBuyCard: (i) => { mgr.buyCard(i); this.renderActive(); },
      onBuyRelic: (i) => { mgr.buyRelic(i); this.renderActive(); },
      onRemoveCard: (deckIndex) => { mgr.removeCard(deckIndex); this.renderActive(); },
      onLeave: () => { mgr.leaveShop(); this.syncView(); },
    });
    this.setScreen(view);
  }

  // ── overlays ──
  private openPauseMenu(): void {
    this.openOverlay(new PauseMenu({
      onResume: () => this.clearOverlay(),
      onHowToPlay: () => this.openOverlay(new HelpView('help', () => this.openPauseMenu())),
      onToggleSound: () => { toggleMute(); this.activeOverlay?.render(); },
      onAbandon: () => { this.save.clear(); this.showTitle(); },
    }));
  }

  private openDeck(): void {
    const mgr = this.mgr;
    if (!mgr) return;
    this.openOverlay(new DeckView(
      L.ui.deckTitle(mgr.state.deck.length),
      mgr.state.deck,
      () => this.clearOverlay(),
    ));
  }

  private openPile(engine: CombatEngine, which: 'draw' | 'discard'): void {
    const pile = which === 'draw' ? engine.state.drawPile : engine.state.discardPile;
    const ids = pile.map((c) => c.definitionId);
    const title = which === 'draw' ? L.ui.drawPileTitle(ids.length) : L.ui.discardPileTitle(ids.length);
    this.openOverlay(new DeckView(title, ids, () => this.clearOverlay()));
  }

  private openOverlay(overlay: Overlay): void {
    this.activeOverlay = overlay;
    this.overlayLayer.removeChildren();
    this.overlayLayer.addChild(overlay.root);
    overlay.render();
  }

  private clearOverlay(): void {
    this.activeOverlay = null;
    this.overlayLayer.removeChildren();
  }

  private setScreen(view: { root: Container; render: () => void }): void {
    this.clearOverlay();
    this.activeView = view;
    this.screenLayer.removeChildren();
    this.screenLayer.addChild(view.root);
    view.render();
    this.fadeInScreen();
  }

  /** A small presentation-only fade keeps phase changes from feeling abrupt. */
  private fadeInScreen(): void {
    const id = ++this.transitionId;
    if (typeof requestAnimationFrame === 'undefined') {
      this.screenLayer.alpha = 1;
      return;
    }
    this.screenLayer.alpha = 0;
    let frame = 0;
    const tick = (): void => {
      if (id !== this.transitionId) return;
      frame += 1;
      this.screenLayer.alpha = Math.min(1, frame / 10);
      if (frame < 10) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
