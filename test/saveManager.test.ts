import { describe, it, expect } from 'vitest';
import { SaveManager, type StorageBackend } from '@/game/saveManager';
import { RunManager } from '@/game/runManager';

// SaveManager: versioned JSON persistence over a pluggable backend. Tests use
// an in-memory backend so no real localStorage is required.

class FakeStorage implements StorageBackend {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
}

describe('SaveManager', () => {
  it('round-trips a run state', () => {
    const backend = new FakeStorage();
    const mgr = RunManager.newRun(99);
    const save = new SaveManager(backend);

    save.save(mgr.state);
    const loaded = save.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.seed).toBe(99);
    expect(loaded!.deck).toEqual(mgr.state.deck);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(mgr.state));
  });

  it('returns null when there is no save', () => {
    const save = new SaveManager(new FakeStorage());
    expect(save.load()).toBeNull();
    expect(save.hasSave()).toBe(false);
  });

  it('rejects a corrupt save', () => {
    const backend = new FakeStorage();
    backend.setItem('nova-spire:save', '{not valid json');
    const save = new SaveManager(backend);
    expect(save.load()).toBeNull();
  });

  it('rejects a save with a mismatched version', () => {
    const backend = new FakeStorage();
    const mgr = RunManager.newRun(1);
    backend.setItem('nova-spire:save', JSON.stringify({ version: 999, run: mgr.state }));
    const save = new SaveManager(backend);
    expect(save.load()).toBeNull();
  });

  it('clears a save', () => {
    const backend = new FakeStorage();
    const mgr = RunManager.newRun(1);
    const save = new SaveManager(backend);
    save.save(mgr.state);
    expect(save.hasSave()).toBe(true);
    save.clear();
    expect(save.hasSave()).toBe(false);
  });

  it('restores a run that resumes deterministically (same RNG future)', () => {
    // advance a run a couple of steps, save, then restore and confirm the
    // restored manager makes the SAME choices going forward.
    const backend = new FakeStorage();
    const original = RunManager.newRun(7777);
    original.enterNode(original.availableNodes()[0].id);
    // if that node was combat, resolve it so we land back on the map
    if (original.state.phase === 'combat') original.resolveCombat(true, 60);
    if (original.state.phase === 'reward') original.chooseReward(null);

    const save = new SaveManager(backend);
    save.save(original.state);

    const restored = RunManager.fromState(save.load()!);
    // both should now generate identical reward rolls / combat seeds because
    // the RNG state was persisted. Force a combat on each and compare seeds.
    const opts = restored.availableNodes();
    if (opts.length > 0 && restored.state.phase === 'map') {
      const nodeId = opts[0].id;
      // replicate the same action on a fresh restore of the ORIGINAL to compare
      const restored2 = RunManager.fromState(JSON.parse(JSON.stringify(original.state)));
      restored.enterNode(nodeId);
      restored2.enterNode(nodeId);
      expect(restored.state.combatSeed).toBe(restored2.state.combatSeed);
    }
    expect(restored.state.seed).toBe(7777);
    expect(restored.state.deck).toEqual(original.state.deck);
  });

  it('auto-saves through a RunManager onChange hook', () => {
    const backend = new FakeStorage();
    const save = new SaveManager(backend);
    const mgr = RunManager.newRun(2024);
    mgr.onChange((s) => save.save(s));

    mgr.enterNode(mgr.availableNodes()[0].id);
    expect(save.hasSave()).toBe(true);
    expect(save.load()!.visitedNodeIds.length).toBe(1);
  });
});
