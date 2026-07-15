import type { GameMap, MapNode, NodeType } from '@/types/run';
import type { SeededRNG } from '@/core/rng';
import { encounterPoolFor } from '@/data/encounters';

// Seeded layered-DAG map generator. Produces a strictly-forward map:
//   layer 0 (entry battles) → intermediate layers → penultimate campfire → boss.
// Two invariants guarantee the boss is always reachable from some entry node:
//   (1) every node gets >=1 outgoing edge to the next layer;
//   (2) every node in the next layer gets >=1 incoming edge.
// Together these make the graph fully connected forward, so a path entry→boss
// always exists (proven by traversal in the tests).

export interface MapGenConfig {
  layers: number;        // total layers INCLUDING entry and boss (>= 3)
  minPerLayer: number;   // min nodes in an intermediate layer
  maxPerLayer: number;   // max nodes in an intermediate layer
}

export const DEFAULT_MAP_CONFIG: MapGenConfig = {
  layers: 6,
  minPerLayer: 2,
  maxPerLayer: 4,
};

// Node-type assignment for an intermediate layer, by depth fraction. Early
// layers are mostly normal battles; elites appear later; the layer just before
// the boss is always a campfire row so the player can heal before the finale.
function pickIntermediateType(rng: SeededRNG, layer: number, lastIntermediate: number): NodeType {
  if (layer === lastIntermediate) return 'campfire';
  // ~15% campfire, ~20% elite (only from the 2nd intermediate layer on), else battle
  const roll = rng.next();
  if (roll < 0.15) return 'campfire';
  if (layer >= 2 && roll < 0.35) return 'elite';
  return 'battle';
}

export function generateMap(rng: SeededRNG, config: MapGenConfig = DEFAULT_MAP_CONFIG): GameMap {
  const layers = Math.max(3, config.layers);
  const nodes: Record<string, MapNode> = {};
  const idsByLayer: string[][] = [];
  const lastIntermediate = layers - 2; // layer index of the campfire-before-boss

  // ── create nodes layer by layer ──
  for (let layer = 0; layer < layers; layer++) {
    const layerIds: string[] = [];

    if (layer === layers - 1) {
      // boss layer: a single boss node
      const boss: MapNode = {
        id: 'n-boss',
        type: 'boss',
        layer,
        col: 0,
        next: [],
        encounterId: 'boss-guardian',
      };
      nodes[boss.id] = boss;
      layerIds.push(boss.id);
    } else {
      const count =
        layer === 0
          ? Math.max(2, config.minPerLayer)
          : rng.int(config.minPerLayer, config.maxPerLayer);
      for (let col = 0; col < count; col++) {
        const type: NodeType = layer === 0 ? 'battle' : pickIntermediateType(rng, layer, lastIntermediate);
        const id = `n${layer}-${col}`;
        nodes[id] = {
          id,
          type,
          layer,
          col,
          next: [],
          encounterId: assignEncounter(rng, type),
        };
        layerIds.push(id);
      }
    }
    idsByLayer.push(layerIds);
  }

  // ── wire edges between consecutive layers, enforcing both invariants ──
  for (let layer = 0; layer < layers - 1; layer++) {
    const current = idsByLayer[layer];
    const nextLayer = idsByLayer[layer + 1];
    const incoming = new Set<string>();

    // (1) each current node connects to 1–2 next-layer nodes near its column
    for (const id of current) {
      const node = nodes[id];
      const fanout = Math.min(nextLayer.length, rng.int(1, 2));
      const targets = pickNearestTargets(node.col, current.length, nextLayer, fanout, rng);
      node.next = targets;
      targets.forEach((t) => incoming.add(t));
    }

    // (2) any next-layer node with no incoming edge gets adopted by the
    // nearest current node (keeps the graph fully connected)
    for (const nextId of nextLayer) {
      if (!incoming.has(nextId)) {
        const nextNode = nodes[nextId];
        const parent = nearestByCol(nextNode.col, current, nodes);
        if (!nodes[parent].next.includes(nextId)) nodes[parent].next.push(nextId);
        incoming.add(nextId);
      }
    }

    // keep edge lists tidy for deterministic rendering
    for (const id of current) nodes[id].next.sort();
  }

  return {
    layerCount: layers,
    nodes,
    entryNodeIds: idsByLayer[0].slice(),
    bossNodeId: 'n-boss',
  };
}

function assignEncounter(rng: SeededRNG, type: NodeType): string | undefined {
  const pool = encounterPoolFor(type);
  if (pool.length === 0) return undefined; // campfire
  return rng.pick(pool).id;
}

// Choose `count` targets in the next layer, biased toward the column above them
// so edges don't cross wildly. Deterministic via the seeded rng.
function pickNearestTargets(
  col: number,
  currentCount: number,
  nextLayer: string[],
  count: number,
  rng: SeededRNG,
): string[] {
  if (nextLayer.length <= count) return nextLayer.slice();
  // map this column onto the next layer's column space
  const centre = currentCount <= 1 ? 0 : (col / (currentCount - 1)) * (nextLayer.length - 1);
  const scored = nextLayer
    .map((id, i) => ({ id, dist: Math.abs(i - centre) + rng.next() * 0.5 }))
    .sort((a, b) => a.dist - b.dist);
  return scored.slice(0, count).map((s) => s.id);
}

function nearestByCol(col: number, candidates: string[], nodes: Record<string, MapNode>): string {
  let best = candidates[0];
  let bestDist = Infinity;
  for (const id of candidates) {
    const d = Math.abs(nodes[id].col - col);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}
