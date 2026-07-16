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
let muted = false;
let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;

// Persist the mute preference across sessions (best-effort; never throws).
const MUTE_KEY = 'nova-spire:muted';
try {
  if (typeof localStorage !== 'undefined') muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* ignore */
}

export function isMuted(): boolean {
  return muted;
}

/** Toggle mute, persist the choice, and return the new state. */
export function toggleMute(): boolean {
  muted = !muted;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (muted) stopAmbient();
  else ensureAmbient();
  return muted;
}

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

function ensureAmbient(): void {
  if (muted || ambientOsc) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    gain.gain.setValueAtTime(0.006, ac.currentTime);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    ambientOsc = osc;
    ambientGain = gain;
  } catch {
    ambientOsc = null;
    ambientGain = null;
  }
}

function stopAmbient(): void {
  try {
    ambientGain?.gain.setValueAtTime(0.0001, audioContext()?.currentTime ?? 0);
    ambientOsc?.stop();
  } catch {
    /* ignore */
  }
  ambientOsc = null;
  ambientGain = null;
}

export function playSound(kind: SoundKind): void {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    // Browser audio starts only after a user gesture; the first gameplay sound
    // is therefore the safest point to lazily begin the ambient drone.
    ensureAmbient();
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
