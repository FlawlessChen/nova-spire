import { Application, Container } from 'pixi.js';
import { App } from '@/render/app';
import { DESIGN_W, DESIGN_H } from '@/render/combatView';

// App entry: boots PixiJS, mounts the top-level App (which owns the run FSM and
// swaps between map / combat / reward / campfire views), and scales the fixed
// 1280x720 design stage to fit the window.

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

  // Design-space stage scaled/centred to the window.
  const stage = new Container();
  app.stage.addChild(stage);

  const game = new App();
  stage.addChild(game.root);
  game.start();

  const layout = (): void => {
    const scale = Math.min(app.screen.width / DESIGN_W, app.screen.height / DESIGN_H);
    stage.scale.set(scale);
    stage.x = (app.screen.width - DESIGN_W * scale) / 2;
    stage.y = (app.screen.height - DESIGN_H * scale) / 2;
  };

  app.renderer.on('resize', layout);
  layout();
}

main().catch((err) => {
  console.error(err);
  const mount = document.getElementById('app');
  if (mount) {
    mount.innerHTML = `<pre style="color:#f66;padding:24px;font-family:monospace;white-space:pre-wrap">${String(err)}</pre>`;
  }
});
