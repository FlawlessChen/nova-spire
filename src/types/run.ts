// Nova Spire — Run (journey) layer types. Sits ABOVE the pure combat engine:
// a run is the map + persistent player progress across many combats. Like
// everything in this project it is pure, serializable DATA — no classes, no
// functions, no PixiJS. The whole RunState can be JSON-stringified to a save
// slot and restored exactly (RNG state included) for reproducibility.

// ─────────────────────────────────────────────────────────────
// Map: a layered DAG. Layer 0 = entry, last layer = boss. Edges only ever
// connect a node to nodes in the immediately following layer, so a run is a
// strictly forward march with branching choices.
// ─────────────────────────────────────────────────────────────

export type NodeType = 'battle' | 'elite' | 'campfire' | 'shop' | 'boss';

export interface MapNode {
  id: string;            // stable id, convention `n{layer}-{col}` (boss: `n-boss`)
  type: NodeType;
  layer: number;         // 0-indexed row
  col: number;           // column within the layer, for rendering layout
  next: string[];        // ids of reachable nodes in layer+1
  encounterId?: string;  // enemy-group id for battle/elite/boss nodes
}

export interface GameMap {
  layerCount: number;
  nodes: Record<string, MapNode>;
  entryNodeIds: string[];  // selectable nodes on layer 0
  bossNodeId: string;
}

// ─────────────────────────────────────────────────────────────
// Run state.
// ─────────────────────────────────────────────────────────────

export type RunPhase =
  | 'map'       // standing on the map, choosing the next node to enter
  | 'combat'    // a battle is in progress
  | 'reward'    // picking a card reward after winning a battle
  | 'campfire'  // resting at a campfire
  | 'shop'      // browsing a shop
  | 'won'       // the boss is dead — run cleared
  | 'lost';     // player died

// A shop's rolled stock. Cards/relic are ids; each has a price. `removalUsed`
// tracks the one-time card-removal service. Regenerated per shop visit.
export interface ShopItem {
  id: string;       // card entry or relic id
  price: number;
  sold: boolean;
}

export interface ShopInventory {
  cards: ShopItem[];
  relics: ShopItem[];
  removalPrice: number;
  removalUsed: boolean;
}

export interface RunState {
  seed: number;         // master seed the run was generated from
  rngState: number;     // live SeededRNG state, persisted so saves resume exactly
  phase: RunPhase;
  pathId: string;       // chosen hero path (build identity) — see src/data/paths
  map: GameMap;
  currentNodeId: string | null;  // node currently occupied; null before first step
  visitedNodeIds: string[];      // path taken so far (for map rendering)
  playerHp: number;
  playerMaxHp: number;
  deck: string[];                // card definition ids; grows through rewards
  relics: string[];              // relic definition ids owned this run
  gold: number;
  nodesCleared: number;          // progress counter
  pendingReward: string[] | null;  // card choices offered after a battle
  pendingRelic: string | null;   // relic dropped by an elite/boss, awaiting pickup
  shop: ShopInventory | null;    // rolled stock while phase === 'shop'
  combatSeed: number | null;     // seed for the in-progress combat (null outside combat)
}

// Save-file envelope: a version tag lets us migrate or reject stale saves.
// v2 added `pathId` (M8); v3 added `shop` (M10). Older saves are rejected.
export const SAVE_VERSION = 3;

export interface SaveData {
  version: number;
  run: RunState;
}
