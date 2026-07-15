// Sound placeholder module. Synthesizes tiny WebAudio blips for game feedback —
// no audio assets needed for MVP; swap these for real samples later. Everything
// is guarded so environments without AudioContext (tests, SSR) silently no-op.

export type SoundKind = 'hit' | 'block' | 'heal' | 'card' | 'victory' | 'defeat';

// kind -> [frequency Hz, duration s, gain]
const TONES: Record<SoundKind, [number, number, number]> = {
  hit: [160, 0.08, 0.12],
  block: [420, 0.06, 0.08],
  heal: [660, 0.12, 0.08],
  card: [520, 0.04, 0.05],
  victory: [880, 0.35, 0.1],
  defeat: [110, 0.5, 0.12],
};

let ctx: AudioContext | null | undefined; // undefined = not probed yet

function audioContext(): AudioContext | null {
  if (ctx !== undefined) return ctx;
  try {
    const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
    ctx = AC ? new AC() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

export function playSound(kind: SoundKind): void {
  const ac = audioContext();
  if (!ac) return;
  try {
    const [freq, dur, gain] = TONES[kind];
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  } catch {
    /* audio failure must never break the game */
  }
}
