import { describe, it, expect } from 'vitest';
import { SeededRNG } from '@/core/rng';
import { generateMap, DEFAULT_MAP_CONFIG } from '@/game/mapGenerator';
import type { GameMap } from '@/types/run';

// Map generator: the load-bearing invariant is that the boss is always
// reachable from an entry node, for ANY seed. We prove it by traversal.

function bossReachable(map: GameMap): boolean {
  const seen = new Set<string>();
  const queue = [...map.entryNodeIds];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (id === map.bossNodeId) return true;
    queue.push(...map.nodes[id].next);
  }
  return false;
}

describe('generateMap', () => {
  it('always produces a boss reachable from an entry node (100 seeds)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const map = generateMap(new SeededRNG(seed));
      expect(bossReachable(map)).toBe(true);
    }
  });

  it('gives every non-boss node at least one outgoing edge', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const map = generateMap(new SeededRNG(seed));
      for (const node of Object.values(map.nodes)) {
        if (node.type === 'boss') expect(node.next.length).toBe(0);
        else expect(node.next.length).toBeGreaterThan(0);
      }
    }
  });

  it('only connects nodes to the immediately following layer', () => {
    const map = generateMap(new SeededRNG(7));
    for (const node of Object.values(map.nodes)) {
      for (const nextId of node.next) {
        expect(map.nodes[nextId].layer).toBe(node.layer + 1);
      }
    }
  });

  it('places exactly one boss on the final layer', () => {
    const map = generateMap(new SeededRNG(3));
    const bosses = Object.values(map.nodes).filter((n) => n.type === 'boss');
    expect(bosses.length).toBe(1);
    expect(bosses[0].layer).toBe(map.layerCount - 1);
  });

  it('puts a campfire row immediately before the boss', () => {
    const map = generateMap(new SeededRNG(11));
    const preBoss = map.layerCount - 2;
    const row = Object.values(map.nodes).filter((n) => n.layer === preBoss);
    expect(row.length).toBeGreaterThan(0);
    expect(row.every((n) => n.type === 'campfire')).toBe(true);
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateMap(new SeededRNG(12345), DEFAULT_MAP_CONFIG);
    const b = generateMap(new SeededRNG(12345), DEFAULT_MAP_CONFIG);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('backs every event node with an event id', () => {
    let count = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const map = generateMap(new SeededRNG(seed));
      for (const node of Object.values(map.nodes).filter((n) => n.type === 'event')) {
        expect(node.eventId).toBeTruthy();
        count++;
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it('produces different maps for different seeds', () => {
    const a = generateMap(new SeededRNG(1));
    const b = generateMap(new SeededRNG(2));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
