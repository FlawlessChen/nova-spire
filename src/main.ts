import { Application, Container } from 'pixi.js';
import { CombatEngine, type CombatConfig } from '@/game/combatEngine';
import { STARTING_DECK } from '@/data/cards';
import { CombatView, DESIGN_W, DESIGN_H } from '@/render/combatView';

// App entry: boots PixiJS, wires a combat encounter to the CombatView, and
// scales the fixed 1280x720 design stage to fit the window. The render layer
// only reads engine state; all game logic lives behind CombatEngine.

// A fresh seed per encounter keeps runs varied; swap for a fixed seed to repro.
function seededConfig(seed: number): CombatConfig {
  return {
    playerMaxHp: 70,
    playerHp: 70,
    maxEnergy: 3,
    handSize: 5,
    deck: STARTING_DECK,
    enemies: ['jawWorm'],
    seed,
  };
}

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    background: 0x12131a,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  const mount = document.getElementById('app');
  if (!mount) throw new Error('#app mount not found');
  mount.appendChild(app.canvas);

  // The design-space stage: everything is authored against 1280x720, then this
  // container is scaled/centered to the actual window size.
  const stage = new Container();
  app.stage.addChild(stage);

  let view: CombatView;

  const startCombat = (): void => {
    // Vary the seed each restart without Date.now() (unavailable in some envs):
    // derive from performance.now so successive runs differ.
    const seed = Math.floor(performance.now() * 1000) % 0x7fffffff;
    const engine = new CombatEngine(seededConfig(seed));
    stage.removeChildren();
    view = new CombatView(engine, startCombat);
    stage.addChild(view.root);
    engine.start();
    view.render();
  };

  const layout = (): void => {
    const scale = Math.min(app.screen.width / DESIGN_W, app.screen.height / DESIGN_H);
    stage.scale.set(scale);
    stage.x = (app.screen.width - DESIGN_W * scale) / 2;
    stage.y = (app.screen.height - DESIGN_H * scale) / 2;
  };

  app.renderer.on('resize', layout);
  startCombat();
  layout();
}

main().catch((err) => {
  console.error(err);
  const mount = document.getElementById('app');
  if (mount) {
    mount.innerHTML = `<pre style="color:#f66;padding:24px;font-family:monospace;white-space:pre-wrap">${String(err)}</pre>`;
  }
});
