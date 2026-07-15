import type { RunState, SaveData } from '@/types/run';
import { SAVE_VERSION } from '@/types/run';

// Save/load for a run. RunState is already pure serializable data, so a save is
// just a versioned JSON envelope. The storage backend is abstracted behind a
// tiny interface so this works in tests (in-memory) as well as the browser
// (localStorage) — and so a missing/blocked localStorage never throws.

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = 'nova-spire:save';

// In-memory fallback used when localStorage is unavailable (SSR, tests,
// privacy-mode browsers that throw on access).
class MemoryStorage implements StorageBackend {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function defaultBackend(): StorageBackend {
  try {
    if (typeof localStorage !== 'undefined') {
      // probe: some environments expose localStorage but throw on use
      const probe = '__nova_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    /* fall through to memory */
  }
  return new MemoryStorage();
}

export class SaveManager {
  private backend: StorageBackend;

  constructor(backend: StorageBackend = defaultBackend()) {
    this.backend = backend;
  }

  save(run: RunState): void {
    const data: SaveData = { version: SAVE_VERSION, run };
    try {
      this.backend.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* quota or serialization failure — a lost save shouldn't crash the game */
    }
  }

  /** Load a saved run, or null if none / stale version / corrupt. */
  load(): RunState | null {
    let raw: string | null;
    try {
      raw = this.backend.getItem(SAVE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!isSaveData(data)) return null;
    if (data.version !== SAVE_VERSION) return null; // MVP: reject old saves
    return data.run;
  }

  hasSave(): boolean {
    return this.load() !== null;
  }

  clear(): void {
    try {
      this.backend.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }
}

// Structural validation — just enough to trust a save before restoring it.
function isSaveData(v: unknown): v is SaveData {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.version !== 'number') return false;
  const run = obj.run as Record<string, unknown> | undefined;
  if (typeof run !== 'object' || run === null) return false;
  return (
    typeof run.seed === 'number' &&
    typeof run.rngState === 'number' &&
    typeof run.phase === 'string' &&
    typeof run.map === 'object' &&
    Array.isArray(run.deck) &&
    Array.isArray(run.relics)
  );
}
