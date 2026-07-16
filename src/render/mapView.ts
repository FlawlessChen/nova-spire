import { Container, Graphics } from 'pixi.js';
import type { RunManager } from '@/game/runManager';
import type { MapNode, NodeType } from '@/types/run';
import { layout } from '@/render/layout';
import { L, relicName } from '@/i18n';
import { label, button, UI } from '@/render/ui';

// MapView: the star chart. Renders the layered-DAG map as a constellation —
// layer 0 at the BOTTOM, the boss at the TOP, so the run reads as a climb up
// the Spire. Reads RunManager state only; a click calls back to the App.

const NODE_META: Record<NodeType, { color: number; glyph: string }> = {
  battle: { color: 0x8a3f5c, glyph: '⚔' },
  elite: { color: 0xd8862f, glyph: '☠' },
  campfire: { color: 0x2a8a63, glyph: '🔥' },
  shop: { color: 0x3f6bb5, glyph: '🛒' },
  boss: { color: 0x9d6bff, glyph: '♛' },
};

function nodeLabel(type: NodeType): string {
  switch (type) {
    case 'battle':
      return L.ui.nodeBattle;
    case 'elite':
      return L.ui.nodeElite;
    case 'campfire':
      return L.ui.nodeCampfire;
    case 'shop':
      return L.ui.nodeShop;
    case 'boss':
      return L.ui.nodeBoss;
  }
}

const NODE_R = 26;

export class MapView {
  readonly root = new Container();

  constructor(
    private mgr: RunManager,
    private onEnterNode: (nodeId: string) => void,
    private actions?: { onMenu: () => void; onViewDeck: () => void },
  ) {}

  render(): void {
    this.root.removeChildren();
    const state = this.mgr.state;
    const map = state.map;

    // header
    this.root.addChild(label(L.ui.mapTitle, 30, UI.text, layout.W / 2, 20, 0.5));
    this.root.addChild(label(L.ui.hpLine(state.playerHp, state.playerMaxHp), 20, UI.good, 40, 28));
    this.root.addChild(label(L.ui.goldLine(state.gold), 20, UI.gold, 40, 56));
    this.root.addChild(label(L.ui.deckLine(state.deck.length), 18, UI.subtle, 40, 84));
    if (state.relics.length > 0) {
      const names = state.relics.map((id) => relicName(id)).join('、');
      this.root.addChild(label(L.ui.relicsLine(names), 15, UI.gold, 40, 112));
    }

    // top-right: view deck + menu
    if (this.actions) {
      const bw = 110;
      this.root.addChild(button(L.ui.viewDeck, layout.W - bw * 2 - 26, 20, this.actions.onViewDeck, { width: bw, height: 40, fontSize: 16, color: 0x2a3352 }));
      this.root.addChild(button(L.ui.menu, layout.W - bw - 14, 20, this.actions.onMenu, { width: bw, height: 40, fontSize: 16, color: 0x2a3352 }));
    }

    const reachable = new Set(this.mgr.availableNodes().map((n) => n.id));
    const visited = new Set(state.visitedNodeIds);

    // vertical layout: layer 0 at bottom, boss at top
    const topPad = layout.portrait ? 170 : 120;
    const bottomPad = 90;
    const usableH = layout.H - topPad - bottomPad;
    const layerY = (layer: number): number =>
      layout.H - bottomPad - (layer / (map.layerCount - 1)) * usableH;
    const nodeX = (node: MapNode): number => {
      const layerNodes = Object.values(map.nodes).filter((n) => n.layer === node.layer);
      const count = layerNodes.length;
      const spacing = Math.min(220, (layout.W - 200) / Math.max(1, count));
      const totalW = spacing * (count - 1);
      const startX = layout.W / 2 - totalW / 2;
      return startX + node.col * spacing;
    };

    // draw edges first (under nodes) — the taken path glows gold
    const edges = new Graphics();
    for (const node of Object.values(map.nodes)) {
      for (const nextId of node.next) {
        const next = map.nodes[nextId];
        const onPath = visited.has(node.id) && visited.has(nextId);
        edges
          .moveTo(nodeX(node), layerY(node.layer))
          .lineTo(nodeX(next), layerY(next.layer))
          .stroke({
            width: onPath ? 4 : 2,
            color: onPath ? UI.gold : 0x2e3a5c,
            alpha: onPath ? 0.9 : 0.7,
          });
      }
    }
    this.root.addChild(edges);

    // draw nodes
    for (const node of Object.values(map.nodes)) {
      this.root.addChild(
        this.drawNode(node, nodeX(node), layerY(node.layer), reachable.has(node.id), visited.has(node.id), state.currentNodeId === node.id),
      );
    }

    // if the run is over, offer a restart
    if (this.mgr.isOver()) {
      this.root.addChild(
        button(state.phase === 'won' ? L.ui.runWonNew : L.ui.runLostNew, layout.W / 2 - 110, layout.H - 74, () => this.onEnterNode('__restart__'), { width: 220, color: state.phase === 'won' ? UI.buttonAlt : UI.button }),
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

    // halo for interactable/current nodes
    if (reachable && !this.mgr.isOver()) {
      c.addChild(new Graphics().circle(0, 0, NODE_R + 12).fill({ color: UI.accent, alpha: 0.08 }));
      c.addChild(new Graphics().circle(0, 0, NODE_R + 6).stroke({ width: 2, color: UI.accent, alpha: 0.6 }));
    }

    const g = new Graphics()
      .circle(0, 0, NODE_R)
      .fill({ color: meta.color, alpha: 0.95 });
    if (current) g.stroke({ width: 4, color: 0xffffff });
    else if (reachable) g.stroke({ width: 3, color: UI.accent });
    else g.stroke({ width: 2, color: 0x000000, alpha: 0.45 });
    c.addChild(g);
    // inner sheen
    c.addChild(new Graphics().circle(-NODE_R * 0.25, -NODE_R * 0.3, NODE_R * 0.45).fill({ color: 0xffffff, alpha: 0.09 }));

    c.alpha = visited || reachable || current ? 1 : 0.5;

    c.addChild(label(meta.glyph, 22, 0xffffff, 0, 0, 0.5));
    c.addChild(label(nodeLabel(node.type), 13, reachable ? UI.accent : UI.subtle, 0, NODE_R + 4, 0.5));

    if (reachable && !this.mgr.isOver()) {
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => this.onEnterNode(node.id));
    }
    return c;
  }
}
