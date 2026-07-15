import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import type { MapNode, NodeType } from '@/types/run';
import { DESIGN_W, DESIGN_H } from '@/render/combatView';
import { label, button, UI } from '@/render/ui';

// MapView: renders the layered-DAG map and lets the player pick the next
// reachable node. Layer 0 sits at the BOTTOM, the boss at the TOP, so the run
// reads as a climb. Reads RunManager state only; a click calls back to the App.

const NODE_META: Record<NodeType, { color: number; glyph: string; name: string }> = {
  battle: { color: 0x8a3f3f, glyph: '⚔', name: '战斗' },
  elite: { color: 0xb5652f, glyph: '☠', name: '精英' },
  campfire: { color: 0x2f8a6b, glyph: '🔥', name: '篝火' },
  boss: { color: 0x8a2f6b, glyph: '♛', name: 'BOSS' },
};

const NODE_R = 26;

export class MapView {
  readonly root = new Container();

  constructor(
    private mgr: RunManager,
    private onEnterNode: (nodeId: string) => void,
  ) {}

  render(): void {
    this.root.removeChildren();
    const state = this.mgr.state;
    const map = state.map;

    // header
    this.root.addChild(label('旅程地图', 30, UI.text, DESIGN_W / 2, 20, 0.5));
    this.root.addChild(label(`生命 ${state.playerHp}/${state.playerMaxHp}`, 20, UI.good, 40, 28));
    this.root.addChild(label(`金币 ${state.gold}`, 20, UI.accent, 40, 56));
    this.root.addChild(label(`卡组 ${state.deck.length} 张`, 18, UI.subtle, 40, 84));

    const reachable = new Set(this.mgr.availableNodes().map((n) => n.id));
    const visited = new Set(state.visitedNodeIds);

    // vertical layout: layer 0 at bottom, boss at top
    const topPad = 120;
    const bottomPad = 90;
    const usableH = DESIGN_H - topPad - bottomPad;
    const layerY = (layer: number): number =>
      DESIGN_H - bottomPad - (layer / (map.layerCount - 1)) * usableH;
    const nodeX = (node: MapNode): number => {
      const layerNodes = Object.values(map.nodes).filter((n) => n.layer === node.layer);
      const count = layerNodes.length;
      const spacing = Math.min(220, (DESIGN_W - 200) / Math.max(1, count));
      const totalW = spacing * (count - 1);
      const startX = DESIGN_W / 2 - totalW / 2;
      return startX + node.col * spacing;
    };

    // draw edges first (under nodes)
    const edges = new Graphics();
    for (const node of Object.values(map.nodes)) {
      for (const nextId of node.next) {
        const next = map.nodes[nextId];
        const onPath = visited.has(node.id) && visited.has(nextId);
        edges
          .moveTo(nodeX(node), layerY(node.layer))
          .lineTo(nodeX(next), layerY(next.layer))
          .stroke({ width: onPath ? 4 : 2, color: onPath ? UI.accent : 0x3a3f52, alpha: onPath ? 0.9 : 0.6 });
      }
    }
    this.root.addChild(edges);

    // draw nodes
    for (const node of Object.values(map.nodes)) {
      this.root.addChild(this.drawNode(node, nodeX(node), layerY(node.layer), reachable.has(node.id), visited.has(node.id), state.currentNodeId === node.id));
    }

    // if the run is over, offer a restart
    if (this.mgr.isOver()) {
      this.root.addChild(
        button(state.phase === 'won' ? '通关！新的一局' : '再来一局', DESIGN_W / 2 - 110, DESIGN_H - 74, () => this.onEnterNode('__restart__'), { width: 220, color: state.phase === 'won' ? UI.buttonAlt : UI.button }),
      );
    }
  }

  private drawNode(
    node: MapNode,
    x: number,
    y: number,
    reachable: boolean,
    visited: boolean,
    current: boolean,
  ): Container {
    const meta = NODE_META[node.type];
    const c = new Container();
    c.x = x;
    c.y = y;

    const g = new Graphics().circle(0, 0, NODE_R).fill(meta.color);
    if (current) g.stroke({ width: 4, color: 0xffffff });
    else if (reachable) g.stroke({ width: 3, color: UI.accent });
    else g.stroke({ width: 2, color: 0x000000, alpha: 0.4 });
    c.addChild(g);

    c.alpha = visited || reachable || current ? 1 : 0.55;

    c.addChild(label(meta.glyph, 22, 0xffffff, 0, 0, 0.5));
    c.addChild(label(meta.name, 13, reachable ? UI.accent : UI.subtle, 0, NODE_R + 4, 0.5));

    if (reachable && !this.mgr.isOver()) {
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => this.onEnterNode(node.id));
      // subtle pulse ring to signal "clickable"
      c.addChildAt(new Graphics().circle(0, 0, NODE_R + 6).stroke({ width: 2, color: UI.accent, alpha: 0.5 }), 0);
    }
    return c;
  }
}
