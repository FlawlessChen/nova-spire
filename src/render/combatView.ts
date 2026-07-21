import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { CombatEngine } from '@/game/combatEngine';
import type { EnemyState, GameEvent, StatusInstance, StatusId } from '@/types';
import { PLAYER_ID } from '@/types';
import { resolveCard } from '@/data/cardUpgrade';
import { getStatusStacks } from '@/game/entities';
import { WEAK_MULTIPLIER, VULNERABLE_MULTIPLIER } from '@/data/statuses';
import { playSound } from '@/render/sound';
import { layout } from '@/render/layout';
import { L, enemyName, relicName, statusShort } from '@/i18n';
import { PX, pxText, pixelButton, pixelPanel, pixelBar, pixelPill, pixelOverlay, pixelGem } from '@/render/pixelUi';
import { portrait } from '@/render/portraits';
import { cardFace } from '@/render/cardArt';
import { EFFECTS } from '@/render/artAssets';

// PixiJS render layer (retro pixel skin). Reads CombatState and draws it; never
// mutates game state. All player input flows back through CombatEngine methods.
// On any engine call the view fully re-renders — combat is turn-based, so a
// full redraw per action is simpler and plenty fast. Coordinates come from the
// orientation-aware `layout` singleton; all text comes from the active locale.

const STATUS_COLORS: Record<StatusId, number> = {
  weak: PX.weak,
  vulnerable: PX.vulnerable,
  poison: PX.poison,
  strength: PX.strength,
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
  private flashes: { node: Container; life: number }[] = [];
  private cardTrails: { node: Container; life: number; startX: number; startY: number }[] = [];
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
        this.spawnCardTrail();
        break;
      case 'onDamageTaken':
        if (e.targetId === PLAYER_ID && e.amount > 0) {
          this.pushLog(L.ui.logPlayerHit(e.amount, e.blocked));
        }
        this.spawnDamageFloat(e.targetId, e.amount, e.blocked);
        if (e.amount > 0) this.spawnImpactFlash(e.targetId);
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
      this.flashes = this.flashes.filter((f) => {
        f.life -= 1;
        f.node.alpha = Math.max(0, f.life / 12);
        if (f.life <= 0) {
          this.fxLayer.removeChild(f.node);
          return false;
        }
        return true;
      });
      this.cardTrails = this.cardTrails.filter((trail) => {
        trail.life -= 1;
        const progress = 1 - trail.life / 16;
        trail.node.x = trail.startX + (layout.W / 2 - trail.startX) * progress;
        trail.node.y = trail.startY + ((layout.portrait ? 470 : 500) - trail.startY) * progress;
        trail.node.alpha = Math.max(0, 1 - progress);
        trail.node.scale.set(1 - progress * 0.35);
        if (trail.life <= 0) {
          this.fxLayer.removeChild(trail.node);
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

  private spawnImpactFlash(targetId: string): void {
    const pos = this.positionFor(targetId);
    if (!pos) return;
    const pool = Object.values(EFFECTS);
    const flash = Sprite.from(pool[Math.floor(Math.random() * pool.length)]);
    flash.anchor.set(0.5);
    flash.x = pos.x;
    flash.y = pos.y;
    flash.width = 132;
    flash.height = 132;
    flash.alpha = 0.7;
    flash.blendMode = 'add';
    this.fxLayer.addChild(flash);
    this.flashes.push({ node: flash, life: 12 });
  }

  private spawnCardTrail(): void {
    const node = Sprite.from(EFFECTS.trace);
    node.anchor.set(0.5);
    node.width = 86;
    node.height = 86;
    node.tint = PX.cyan;
    const startX = layout.W / 2;
    const startY = layout.portrait ? 1040 : 590;
    node.x = startX;
    node.y = startY;
    this.fxLayer.addChild(node);
    this.cardTrails.push({ node, life: 16, startX, startY });
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
    this.root.addChild(this.label(L.ui.turn(state.turn), 22, PX.text, layout.W / 2, 16, 0.5));

    // draw/discard pile counters — tappable to inspect the pile
    const drawLbl = this.label(L.ui.drawPile(state.drawPile.length), 14, PX.subtle, 20, layout.H - 26);
    const discard = this.label(L.ui.discardPile(state.discardPile.length), 14, PX.subtle, layout.W - 20, layout.H - 26);
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
        pixelButton(L.ui.menu, layout.W - 100, 12, () => this.actions!.onMenu(), { width: 88, height: 34, fontSize: 14, variant: 'ghost', icon: 'menu' }),
      );
    }

    // relic bar: small pills across the top-left (their own row in portrait)
    let rx = layout.portrait ? 16 : 30;
    const ry = layout.portrait ? 46 : 14;
    for (const id of this.relicIds) {
      const pill = pixelPill(relicName(id), PX.energy, 12);
      pill.x = rx;
      pill.y = ry;
      this.root.addChild(pill);
      rx += pill.width + 8;
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

    const panel = pixelPanel(w, h, {
      color: PX.panelEnemy,
      border: selecting ? PX.selected : PX.panelBorder,
    });
    c.addChild(panel);

    // intent telegraph, above the panel — sharp pixel badge
    const intent = this.intentText(enemy);
    const intentBg = new Graphics()
      .rect(w / 2 - 60, -34, 120, 26)
      .fill({ color: 0x000000, alpha: 0.55 })
      .stroke({ width: 1, color: intent.color, alpha: 0.7 });
    c.addChild(intentBg);
    c.addChild(this.label(intent.label, 14, intent.color, w / 2, -21, 0.5));

    // portrait emblem
    const face = portrait(enemy.definitionId, 56);
    face.x = w / 2;
    face.y = 44;
    c.addChild(face);

    // name
    c.addChild(this.label(enemyName(enemy.definitionId), 14, PX.text, w / 2, 82, 0.5));

    // hp bar
    c.addChild(this.bar(16, 96, w - 32, 18, enemy.hp, enemy.maxHp, PX.hpEnemy));

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
    c.addChild(pixelPanel(w, h, { color: PX.panelPlayer, border: PX.cyan }));

    // nova emblem + name
    const face = portrait(PLAYER_ID, 44);
    face.x = 36;
    face.y = 36;
    c.addChild(face);
    c.addChild(this.label(L.ui.you, 16, PX.text, 66, 24));

    c.addChild(this.bar(16, 68, w - 32, 22, p.hp, p.maxHp, PX.hpPlayer));
    if (p.block > 0) c.addChild(this.blockBadge(w - 44, 66, p.block));
    c.addChild(this.statusRow(p.statuses, 16, 104));
    this.root.addChild(c);

    // energy orb: a pixel diamond gem floating over the panel corner — matches
    // the card cost gem so the two read as one motif.
    const orb = pixelGem(56, PX.energy, PX.energy, layout.portrait ? 330 : 175, layout.portrait ? 545 : 452, {
      fillAlpha: 0.28,
      label: `${p.energy}/${p.maxEnergy}`,
      labelColor: 0x2a1a05,
      labelSize: 16,
    });
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
      pixelButton(L.ui.endTurn, x, y, () => this.clickEndTurn(), { width: 182, height: 56, fontSize: 18, enabled, variant: 'primary' }),
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
      c.addChild(this.label(msg, 13, PX.subtle, 0, i * 22, 0, alpha));
    });
    this.root.addChild(c);
  }

  private drawOutcome(): void {
    const win = this.engine.state.outcome === 'victory';
    const c = new Container();
    const titleY = layout.portrait ? 448 : 280;
    c.addChild(pixelOverlay(layout.W, layout.H, 0.85));
    c.addChild(this.label(win ? L.ui.victory : L.ui.defeat, 56, win ? PX.hpPlayer : PX.hpEnemy, layout.W / 2, titleY, 0.5));
    if (win) {
      c.addChild(this.label(L.ui.hpLeft(this.engine.state.player.hp), 20, PX.text, layout.W / 2, titleY + 70, 0.5));
    }
    c.addChild(
      pixelButton(win ? L.ui.continueRun : L.ui.finishRun, layout.W / 2 - 100, titleY + 120, () =>
        this.onCombatEnd(win, this.engine.state.player.hp), { width: 200, height: 60, fontSize: 20, variant: 'primary' }),
    );
    this.root.addChild(c);
  }

  // ── small helpers ──
  // Wraps pxText but preserves the original label() anchor convention
  // (anchor Y is 0.5 only when anchor X is 0.5, else 0).
  private label(text: string, size: number, color: number, x = 0, y = 0, anchor = 0, alpha = 1): Text {
    return pxText(text, size, color, x, y, anchor, anchor === 0.5 ? 0.5 : 0, alpha);
  }

  private bar(x: number, y: number, w: number, h: number, cur: number, max: number, fill: number): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    const frac = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
    c.addChild(pixelBar(w, h, frac, fill, `${cur}/${max}`));
    return c;
  }

  private blockBadge(x: number, y: number, amount: number): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    c.addChild(new Graphics().rect(0, 0, 34, 22).fill(PX.block).stroke({ width: 1, color: 0x000000, alpha: 0.5 }));
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
      const pill = pixelPill(`${statusShort(s.id)}${s.stacks}`, STATUS_COLORS[s.id], 12);
      pill.x = cx;
      c.addChild(pill);
      cx += pill.width + 6;
    }
    return c;
  }

  // Estimated telegraph damage: accounts for enemy strength/weak and player
  // vulnerable, mirroring the resolver so the number the player sees is honest.
  private intentText(enemy: EnemyState): { label: string; color: number } {
    const move = enemy.nextMove;
    if (!move) return { label: L.ui.intentUnknown, color: PX.subtle };
    let dmg = 0;
    let buff = false;
    let debuff = false;
    for (const eff of move.intents) {
      if (eff.kind === 'dealDamage') dmg += this.estimateDamage(enemy, eff.value);
      else if (eff.kind === 'gainBlock') buff = true;
      else if (eff.kind === 'applyStatus') eff.target === 'self' ? (buff = true) : (debuff = true);
    }
    if (dmg > 0) return { label: L.ui.intentAttack(dmg), color: 0xff6b6b };
    if (buff) return { label: L.ui.intentBuff, color: PX.cyan };
    if (debuff) return { label: L.ui.intentDebuff, color: PX.orange };
    return { label: move.id, color: PX.subtle };
  }

  private estimateDamage(enemy: EnemyState, base: number): number {
    let d = base + getStatusStacks(enemy, 'strength');
    if (getStatusStacks(enemy, 'weak') > 0) d = Math.floor(d * WEAK_MULTIPLIER);
    if (getStatusStacks(this.engine.state.player, 'vulnerable') > 0) d = Math.floor(d * VULNERABLE_MULTIPLIER);
    return Math.max(0, d);
  }
}
