import { Container, Graphics, Text } from 'pixi.js';
import type { CombatEngine } from '@/game/combatEngine';
import type { EnemyState, GameEvent, StatusInstance, StatusId } from '@/types';
import { PLAYER_ID } from '@/types';
import { resolveCard } from '@/data/cardUpgrade';
import { getStatusStacks } from '@/game/entities';
import { WEAK_MULTIPLIER, VULNERABLE_MULTIPLIER } from '@/data/statuses';
import { playSound } from '@/render/sound';
import { layout } from '@/render/layout';
import { L, enemyName, relicName, statusShort } from '@/i18n';
import { UI, button, label as uiLabel } from '@/render/ui';
import { portrait } from '@/render/portraits';
import { cardFace } from '@/render/cardArt';

// PixiJS render layer. Reads CombatState and draws it; never mutates game state.
// All player input flows back through CombatEngine methods. On any engine call
// the view fully re-renders — combat is turn-based, so a full redraw per action
// is simpler and plenty fast. Coordinates come from the orientation-aware
// `layout` singleton; all text comes from the active locale (zh-CN).

const COLOR = {
  enemyPanel: 0x1b1430,
  playerPanel: 0x0f2136,
  hpBg: 0x2a1220,
  hpEnemy: 0xff5a6a,
  hpPlayer: 0x52e09a,
  block: 0x3fa9e8,
  energy: 0xffd54d,
  selected: 0xffd54d,
  text: 0xe8ecff,
  subtle: 0x8f9bc4,
  overlay: 0x060912,
} as const;

const STATUS_COLORS: Record<StatusId, number> = {
  weak: 0x9b59b6,
  vulnerable: 0xe67e22,
  poison: 0x27ae60,
  strength: 0xf1c40f,
};

const ENEMY_PANEL_H = 176;

export class CombatView {
  readonly root = new Container();
  private selectedInstanceId: string | null = null;
  private messages: string[] = [];
  // FX: floating damage/block numbers live on a persistent layer that survives
  // full re-renders (render() only clears root, then re-attaches this layer).
  private fxLayer = new Container();
  private floats: { node: Text; life: number }[] = [];
  private outcomeSoundPlayed = false;
  private shakeFrames = 0;

  constructor(
    private engine: CombatEngine,
    private onCombatEnd: (won: boolean, playerHp: number) => void,
    private relicIds: string[] = [],
    private actions?: { onMenu: () => void; onViewPile: (which: 'draw' | 'discard') => void },
  ) {
    this.engine.bus.subscribe((e) => this.onEvent(e));
    this.startFxLoop();
  }

  // ── event log ──
  private onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'onTurnStart':
        if (e.side === 'player') this.pushLog(L.ui.logTurn(e.turn));
        break;
      case 'onCardPlayed':
        playSound('card');
        this.shakeFrames = Math.max(this.shakeFrames, 4);
        break;
      case 'onDamageTaken':
        if (e.targetId === PLAYER_ID && e.amount > 0) {
          this.pushLog(L.ui.logPlayerHit(e.amount, e.blocked));
        }
        this.spawnDamageFloat(e.targetId, e.amount, e.blocked);
        playSound(e.amount > 0 ? 'hit' : 'block');
        if (e.amount > 0) this.shakeFrames = Math.max(this.shakeFrames, e.targetId === PLAYER_ID ? 8 : 5);
        break;
      case 'onEnemyDeath':
        this.pushLog(L.ui.logEnemyDead);
        break;
    }
  }

  // ── floating combat text ──
  // Rises and fades via a rAF loop; skipped silently where rAF doesn't exist
  // (tests, SSR). Positions are approximated from the same layout math the
  // draw methods use.
  private startFxLoop(): void {
    if (typeof requestAnimationFrame === 'undefined') return;
    const tick = (): void => {
      for (const f of this.floats) {
        f.node.y -= 1.1;
        f.life -= 1;
        f.node.alpha = Math.max(0, Math.min(1, f.life / 45));
      }
      this.floats = this.floats.filter((f) => {
        if (f.life <= 0) {
          this.fxLayer.removeChild(f.node);
          return false;
        }
        return true;
      });
      if (this.shakeFrames > 0) {
        const strength = this.shakeFrames > 5 ? 2.5 : 1.2;
        this.root.x = (Math.random() - 0.5) * strength;
        this.root.y = (Math.random() - 0.5) * strength;
        this.shakeFrames -= 1;
      } else {
        this.root.x = 0;
        this.root.y = 0;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private spawnDamageFloat(targetId: string, amount: number, blocked: number): void {
    const pos = this.positionFor(targetId);
    if (!pos) return;
    const text = amount > 0 ? `-${amount}` : blocked > 0 ? L.ui.blockFloat(blocked) : '';
    if (!text) return;
    const color = amount > 0 ? 0xff5a5a : 0x6bb8ff;
    const node = this.label(text, amount >= 10 ? 30 : 24, color, pos.x, pos.y, 0.5);
    this.fxLayer.addChild(node);
    this.floats.push({ node, life: 75 });
  }

  // Approximate on-screen anchor of a combatant, mirroring drawPlayer/drawEnemies.
  private positionFor(entityId: string): { x: number; y: number } | null {
    if (entityId === PLAYER_ID) {
      return layout.portrait ? { x: 145, y: 470 } : { x: 165, y: 500 };
    }
    const enemies = this.engine.state.enemies;
    const idx = enemies.findIndex((e) => e.entityId === entityId);
    if (idx < 0) return null;
    const panelW = 200;
    const gap = 40;
    const totalW = enemies.length * panelW + (enemies.length - 1) * gap;
    const x = (layout.W - totalW) / 2 + idx * (panelW + gap) + panelW / 2;
    return { x, y: layout.portrait ? 240 : 160 };
  }

  private pushLog(msg: string): void {
    this.messages.push(msg);
    if (this.messages.length > 5) this.messages.shift();
  }

  // ── interaction ──
  private clickCard(instanceId: string): void {
    const state = this.engine.state;
    if (state.outcome !== 'ongoing') return;
    const card = state.hand.find((c) => c.instanceId === instanceId);
    if (!card) return;
    if (!this.engine.canPlay(card)) return; // not enough energy; ignore

    const def = resolveCard(card.definitionId);
    if (def.targetMode === 'enemy') {
      const alive = state.enemies.filter((e) => e.hp > 0);
      if (alive.length === 1) {
        this.engine.playCard(instanceId, alive[0].entityId);
        this.selectedInstanceId = null;
      } else {
        // multiple enemies: enter target-selection mode (toggle)
        this.selectedInstanceId = this.selectedInstanceId === instanceId ? null : instanceId;
      }
    } else {
      this.engine.playCard(instanceId);
      this.selectedInstanceId = null;
    }
    this.render();
  }

  private clickEnemy(entityId: string): void {
    if (!this.selectedInstanceId) return;
    this.engine.playCard(this.selectedInstanceId, entityId);
    this.selectedInstanceId = null;
    this.render();
  }

  private clickEndTurn(): void {
    if (this.engine.state.outcome !== 'ongoing') return;
    this.selectedInstanceId = null;
    this.engine.endTurn();
    this.render();
  }

  // ── render ──
  render(): void {
    this.root.removeChildren();
    const state = this.engine.state;

    this.drawHeader();
    this.drawEnemies();
    this.drawPlayer();
    this.drawHand();
    this.drawEndTurnButton();
    this.drawLog();

    if (state.outcome !== 'ongoing') {
      this.drawOutcome();
      if (!this.outcomeSoundPlayed) {
        this.outcomeSoundPlayed = true;
        playSound(state.outcome === 'victory' ? 'victory' : 'defeat');
      }
    }

    // FX layer goes on top and persists across re-renders
    this.root.addChild(this.fxLayer);
  }

  private drawHeader(): void {
    const state = this.engine.state;
    this.root.addChild(this.label(L.ui.turn(state.turn), 24, COLOR.text, layout.W / 2, 16, 0.5));

    // draw/discard pile counters — tappable to inspect the pile
    const drawLbl = this.label(L.ui.drawPile(state.drawPile.length), 15, COLOR.subtle, 20, layout.H - 26);
    const discard = this.label(L.ui.discardPile(state.discardPile.length), 15, COLOR.subtle, layout.W - 20, layout.H - 26);
    discard.anchor.set(1, 0);
    if (this.actions) {
      for (const [lbl, which] of [[drawLbl, 'draw'], [discard, 'discard']] as const) {
        lbl.eventMode = 'static';
        lbl.cursor = 'pointer';
        lbl.on('pointertap', () => this.actions!.onViewPile(which));
      }
    }
    this.root.addChild(drawLbl);
    this.root.addChild(discard);

    // menu button, top-right
    if (this.actions) {
      this.root.addChild(
        button(L.ui.menu, layout.W - 96, 12, () => this.actions!.onMenu(), { width: 84, height: 34, fontSize: 15, color: 0x2a3352 }),
      );
    }

    // relic bar: small pills across the top-left (their own row in portrait)
    let rx = layout.portrait ? 16 : 30;
    const ry = layout.portrait ? 46 : 14;
    for (const id of this.relicIds) {
      const name = this.label(relicName(id), 13, COLOR.text, 0, 0, 0);
      const pillW = name.width + 16;
      const pill = new Container();
      pill.x = rx;
      pill.y = ry;
      pill.addChild(
        new Graphics()
          .roundRect(0, 0, pillW, 22, 6)
          .fill({ color: 0x241f10, alpha: 0.9 })
          .stroke({ width: 1, color: COLOR.energy, alpha: 0.6 }),
      );
      name.x = 8;
      name.y = 4;
      pill.addChild(name);
      this.root.addChild(pill);
      rx += pillW + 8;
    }
  }

  private drawEnemies(): void {
    const enemies = this.engine.state.enemies;
    const panelW = 200;
    // shrink the gap if a wide group wouldn't fit the design width
    const baseGap = 40;
    const gap =
      enemies.length > 1
        ? Math.min(baseGap, (layout.W - 20 - enemies.length * panelW) / (enemies.length - 1))
        : baseGap;
    const totalW = enemies.length * panelW + (enemies.length - 1) * gap;
    let x = Math.max(10, (layout.W - totalW) / 2);
    const y = layout.portrait ? 180 : 96;
    for (const enemy of enemies) {
      this.drawEnemy(enemy, x, y, panelW);
      x += panelW + gap;
    }
  }

  private drawEnemy(enemy: EnemyState, x: number, y: number, w: number): void {
    const c = new Container();
    c.x = x;
    c.y = y;
    const h = ENEMY_PANEL_H;
    const selecting = this.selectedInstanceId !== null;

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 12)
      .fill({ color: COLOR.enemyPanel, alpha: 0.92 })
      .stroke(
        selecting
          ? { width: 3, color: COLOR.selected }
          : { width: 1, color: UI.panelBorder, alpha: 0.9 },
      );
    c.addChild(bg);

    // intent telegraph, above the panel
    const intent = this.intentText(enemy);
    const intentBg = new Graphics()
      .roundRect(w / 2 - 60, -34, 120, 26, 8)
      .fill({ color: 0x000000, alpha: 0.45 })
      .stroke({ width: 1, color: intent.color, alpha: 0.5 });
    c.addChild(intentBg);
    c.addChild(this.label(intent.label, 15, intent.color, w / 2, -21, 0.5));

    // portrait emblem
    const face = portrait(enemy.definitionId, 56);
    face.x = w / 2;
    face.y = 44;
    c.addChild(face);

    // name
    c.addChild(this.label(enemyName(enemy.definitionId), 15, COLOR.text, w / 2, 82, 0.5));

    // hp bar
    c.addChild(this.bar(16, 96, w - 32, 18, enemy.hp, enemy.maxHp, COLOR.hpEnemy));

    // block
    if (enemy.block > 0) c.addChild(this.blockBadge(w - 44, 94, enemy.block));

    // statuses
    c.addChild(this.statusRow(enemy.statuses, 16, 128));

    if (selecting) {
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => this.clickEnemy(enemy.entityId));
    }
    this.root.addChild(c);
  }

  private drawPlayer(): void {
    const p = this.engine.state.player;
    const c = new Container();
    c.x = layout.portrait ? 20 : 40;
    c.y = 470;
    const w = 250;
    const h = 150;
    c.addChild(
      new Graphics()
        .roundRect(0, 0, w, h, 12)
        .fill({ color: COLOR.playerPanel, alpha: 0.92 })
        .stroke({ width: 1, color: UI.accent, alpha: 0.4 }),
    );

    // nova emblem + name
    const face = portrait(PLAYER_ID, 44);
    face.x = 36;
    face.y = 36;
    c.addChild(face);
    c.addChild(this.label(L.ui.you, 18, COLOR.text, 66, 24));

    c.addChild(this.bar(16, 68, w - 32, 22, p.hp, p.maxHp, COLOR.hpPlayer));
    if (p.block > 0) c.addChild(this.blockBadge(w - 44, 66, p.block));
    c.addChild(this.statusRow(p.statuses, 16, 104));
    this.root.addChild(c);

    // energy orb: floats over the panel corner in landscape, sits to the
    // panel's right in portrait
    const orb = new Container();
    orb.x = layout.portrait ? 330 : 175;
    orb.y = layout.portrait ? 545 : 452;
    orb.addChild(new Graphics().circle(0, 0, 40).fill({ color: COLOR.energy, alpha: 0.12 }));
    orb.addChild(new Graphics().circle(0, 0, 34).fill(COLOR.energy).stroke({ width: 3, color: 0x8a6d0a }));
    orb.addChild(this.label(`${p.energy}/${p.maxEnergy}`, 20, 0x2a2205, 0, 0, 0.5));
    this.root.addChild(orb);
  }

  private drawHand(): void {
    const hand = this.engine.state.hand;
    const cardW = 150;
    const cardH = 195;
    const gap = 14;
    // overlap-fan layout: cards squeeze together when the row would overflow
    const availW = layout.W - 40;
    const step =
      hand.length <= 1
        ? 0
        : Math.min(cardW + gap, (availW - cardW) / (hand.length - 1));
    const totalW = hand.length === 0 ? 0 : cardW + step * (hand.length - 1);
    let x = (layout.W - totalW) / 2;
    const y = layout.portrait ? 1040 : 495;
    for (const card of hand) {
      this.drawCard(card.instanceId, card.definitionId, x, y, cardW, cardH);
      x += step;
    }
  }

  private drawCard(instanceId: string, definitionId: string, x: number, y: number, w: number, h: number): void {
    const card = this.engine.state.hand.find((c) => c.instanceId === instanceId)!;
    const playable = this.engine.canPlay(card) && this.engine.state.outcome === 'ongoing';
    const selected = this.selectedInstanceId === instanceId;

    const c = cardFace(definitionId, w, h, { selected });
    c.x = x;
    c.y = selected ? y - 16 : y;
    c.alpha = playable ? 1 : 0.5;

    c.eventMode = 'static';
    c.cursor = playable ? 'pointer' : 'default';
    c.on('pointertap', () => this.clickCard(instanceId));
    this.root.addChild(c);
  }

  private drawEndTurnButton(): void {
    const enabled = this.engine.state.outcome === 'ongoing';
    const x = layout.portrait ? layout.W - 200 : 1058;
    const y = layout.portrait ? 515 : 452;
    this.root.addChild(
      button(L.ui.endTurn, x, y, () => this.clickEndTurn(), { width: 182, height: 56, enabled }),
    );
  }

  private drawLog(): void {
    if (this.messages.length === 0) return;
    const c = new Container();
    c.x = layout.portrait ? 20 : 980;
    c.y = layout.portrait ? 368 : 300;
    const shown = this.messages.slice(layout.portrait ? -4 : -5);
    shown.forEach((msg, i) => {
      const alpha = 0.4 + (0.6 * (i + 1)) / shown.length;
      c.addChild(this.label(msg, 14, COLOR.subtle, 0, i * 22, 0, alpha));
    });
    this.root.addChild(c);
  }

  private drawOutcome(): void {
    const win = this.engine.state.outcome === 'victory';
    const c = new Container();
    const titleY = layout.portrait ? 448 : 280;
    c.addChild(new Graphics().rect(0, 0, layout.W, layout.H).fill({ color: COLOR.overlay, alpha: 0.85 }));
    c.addChild(this.label(win ? L.ui.victory : L.ui.defeat, 64, win ? COLOR.hpPlayer : COLOR.hpEnemy, layout.W / 2, titleY, 0.5));
    if (win) {
      c.addChild(this.label(L.ui.hpLeft(this.engine.state.player.hp), 22, COLOR.text, layout.W / 2, titleY + 70, 0.5));
    }
    c.addChild(
      button(win ? L.ui.continueRun : L.ui.finishRun, layout.W / 2 - 100, titleY + 120, () =>
        this.onCombatEnd(win, this.engine.state.player.hp), { width: 200, height: 60 }),
    );
    this.root.addChild(c);
  }

  // ── small helpers ──
  private label(text: string, size: number, color: number, x = 0, y = 0, anchor = 0, alpha = 1): Text {
    return uiLabel(text, size, color, x, y, anchor, alpha);
  }

  private bar(x: number, y: number, w: number, h: number, cur: number, max: number, fill: number): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    const frac = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
    c.addChild(new Graphics().roundRect(0, 0, w, h, 5).fill(COLOR.hpBg).stroke({ width: 1, color: 0x000000, alpha: 0.4 }));
    if (frac > 0) c.addChild(new Graphics().roundRect(0, 0, w * frac, h, 5).fill(fill));
    c.addChild(this.label(`${cur}/${max}`, 13, COLOR.text, w / 2, h / 2, 0.5));
    return c;
  }

  private blockBadge(x: number, y: number, amount: number): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    c.addChild(new Graphics().roundRect(0, 0, 34, 22, 5).fill(COLOR.block).stroke({ width: 1, color: 0xffffff, alpha: 0.25 }));
    c.addChild(this.label(`${amount}`, 14, 0xffffff, 17, 11, 0.5));
    return c;
  }

  private statusRow(statuses: StatusInstance[], x: number, y: number): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    let cx = 0;
    for (const s of statuses) {
      if (s.stacks <= 0) continue;
      const txt = `${statusShort(s.id)}${s.stacks}`;
      const label = this.label(txt, 13, 0xffffff, 0, 0, 0);
      const pillW = label.width + 14;
      const pill = new Container();
      pill.x = cx;
      pill.addChild(new Graphics().roundRect(0, 0, pillW, 20, 6).fill(STATUS_COLORS[s.id]));
      label.x = 7;
      label.y = 3;
      pill.addChild(label);
      c.addChild(pill);
      cx += pillW + 6;
    }
    return c;
  }

  // Estimated telegraph damage: accounts for enemy strength/weak and player
  // vulnerable, mirroring the resolver so the number the player sees is honest.
  private intentText(enemy: EnemyState): { label: string; color: number } {
    const move = enemy.nextMove;
    if (!move) return { label: L.ui.intentUnknown, color: 0x888888 };
    let dmg = 0;
    let buff = false;
    let debuff = false;
    for (const eff of move.intents) {
      if (eff.kind === 'dealDamage') dmg += this.estimateDamage(enemy, eff.value);
      else if (eff.kind === 'gainBlock') buff = true;
      else if (eff.kind === 'applyStatus') eff.target === 'self' ? (buff = true) : (debuff = true);
    }
    if (dmg > 0) return { label: L.ui.intentAttack(dmg), color: 0xff6b6b };
    if (buff) return { label: L.ui.intentBuff, color: 0x6bd0ff };
    if (debuff) return { label: L.ui.intentDebuff, color: 0xffd06b };
    return { label: move.id, color: 0xcccccc };
  }

  private estimateDamage(enemy: EnemyState, base: number): number {
    let d = base + getStatusStacks(enemy, 'strength');
    if (getStatusStacks(enemy, 'weak') > 0) d = Math.floor(d * WEAK_MULTIPLIER);
    if (getStatusStacks(this.engine.state.player, 'vulnerable') > 0) d = Math.floor(d * VULNERABLE_MULTIPLIER);
    return Math.max(0, d);
  }
}
