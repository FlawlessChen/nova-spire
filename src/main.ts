import { Application, Assets, Container } from 'pixi.js';
import { App } from '@/render/app';
import { layout, updateLayout } from '@/render/layout';
import { Starfield } from '@/render/starfield';
import { PX } from '@/render/pixelUi';
import { ALL_ART_ASSET_URLS } from '@/render/artAssets';

// App entry: boots PixiJS, mounts the persistent starfield backdrop and the
// top-level App (which owns the run FSM and swaps between map / combat /
// reward / campfire views), and scales the orientation-aware design stage
// (landscape 1280x720, portrait 720x1280) to fit the window. Rotating a phone
// rebuilds the backdrop and re-renders the active view in place.

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    background: PX.bgDeep,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  // PixiJS v8's Sprite.from(string) only reads from the Assets cache; it does
  // not initiate URL loading. Preload every selected art texture before any
  // view creates sprites so asset-backed UI/FX are visible on the first frame.
  await Assets.load(ALL_ART_ASSET_URLS);

  // Register the Zpix pixel font (CJK-capable) before any view renders text,
  // so the card faces and title screen render in the retro pixel style. Wrapped
  // in try/catch so a font-load failure degrades gracefully to the monospace
  // fallback instead of crashing the whole app.
  try {
    const zpixUrl = new URL('../assets/fonts/zpix.ttf', import.meta.url).href;
    const zpixFace = new FontFace('Zpix', `url(${zpixUrl})`);
    await zpixFace.load();
    document.fonts.add(zpixFace);
  } catch (err) {
    console.warn('Zpix pixel font failed to load; falling back to monospace', err);
  }

  const mount = document.getElementById('app');
  if (!mount) throw new Error('#app mount not found');
  mount.appendChild(app.canvas);

  // Design-space stage scaled/centred to the window.
  const stage = new Container();
  app.stage.addChild(stage);

  // Pick the initial orientation BEFORE the first render.
  updateLayout(app.screen.width, app.screen.height);

  const starfield = new Starfield();
  starfield.build();
  starfield.start();
  stage.addChild(starfield.root);

  const game = new App();
  stage.addChild(game.root);
  game.start();

  const fit = (): void => {
    const scale = Math.min(app.screen.width / layout.W, app.screen.height / layout.H);
    stage.scale.set(scale);
    stage.x = (app.screen.width - layout.W * scale) / 2;
    stage.y = (app.screen.height - layout.H * scale) / 2;
  };

  app.renderer.on('resize', () => {
    const orientationChanged = updateLayout(app.screen.width, app.screen.height);
    if (orientationChanged) {
      starfield.build();
      game.rerender();
    }
    fit();
  });
  fit();
}

main().catch((err) => {
  console.error(err);
  const mount = document.getElementById('app');
  if (mount) {
    mount.innerHTML = `<pre style="color:#f66;padding:24px;font-family:monospace;white-space:pre-wrap">${String(err)}</pre>`;
  }
});
