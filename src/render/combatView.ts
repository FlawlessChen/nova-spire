import { Container, Graphics, Text } from 'pixi.js';
import type { CombatEngine } from '@/game/combatEngine';
import type { EnemyState, GameEvent, StatusInstance, StatusId } from '@/types';
import { PLAYER_ID } from '@/types';
import { CARDS } from '@/data/cards';
import { ENEMIES } from '@/data/enemies';
import { RELICS } from '@/data/relics';
import { getStatusStacks } from '@/game/entities';
import { WEAK_MULTIPLIER, VULNERABLE_MULTIPLIER } from '@/data/statuses';
import { playSound } from '@/render/sound';

// PixiJS render layer. Reads CombatState and draws it; never mutates game state.
// All player input flows back through CombatEngine methods. On any engine call
// the view fully re-renders — combat is turn-based, so a full redraw per action
// is simpler and plenty fast.

export const DESIGN_W = 1280;
export const DESIGN_H = 720;

const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

const COLOR = {
  panel: 0x1e2130,
  enemyPanel: 0x2a1f28,
  playerPanel: 0x1f2a24,
  hpBg: 0x401518,
  hpEnemy: 0xd8443a,
  hpPlayer: 0x4ec06a,
  block: 0x4a90d9,
  energy: 0xf0c419,
  cardAttack: 0x8a2f2f,
  cardSkill: 0x2f6b8a,
  cardPower: 0x6b3f8a,
  costCircle: 0x11131a,
  selected: 0xf0c419,
  button: 0x3a5a8a,
  buttonText: 0xffffff,
  text: 0xe8e8f0,
  subtle: 0x9aa0b4,
  overlay: 0x0a0b10,
} as const;

const STATUS_META: Record<StatusId, { short: string; color: number }> = {
  weak: { short: '弱', color: 0x9b59b6 },
  vulnerable: { short: '易伤', color: 0xe67e22 },
  poison: { short: '毒', color: 0x27ae60 },
  strength: { short: '力', color: 0xf1c40f },
};

export class CombatView {
  readonly root = new Container();
  private selectedInstanceId: string | null = null;
  private messages: string[] = [];
  // FX: floating damage/block numbers live on a persistent layer that survives
  // full re-renders (render() only clears root, then re-attaches this layer).
  private fxLayer = new Container();
  private floats: { node: Text; life: number }[] = [];
  private outcomeSoundPlayed = false;

  constructor(
    private engine: CombatEngine,
    private onCombatEnd: (won: boolean, playerHp: number) => void,
    private relicIds: string[] = [],
  ) {
    this.engine.bus.subscribe((e) => this.onEvent(e));
    this.startFxLoop();
  }

  // ── event log ──
  private onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'onTurnStart':
        if (e.side === 'player') this.pushLog(`— 回合 ${e.turn} —`);
        break;
      case 'onCardPlayed':
        playSound('card');
        break;
      case 'onDamageTaken':
        if (e.targetId === PLAYER_ID && e.amount > 0) {
          this.pushLog(`你受到 ${e.amount} 伤害${e.blocked > 0 ? `（挡下 ${e.blocked}）` : ''}`);
        }
        this.spawnDamageFloat(e.targetId, e.amount, e.blocked);
        playSound(e.amount > 0 ? 'hit' : 'block');
        break;
      case 'onEnemyDeath':
        this.pushLog('敌人被击败！');
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
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private spawnDamageFloat(targetId: string, amount: number, blocked: number): void {
    const pos = this.positionFor(targetId);
    if (!pos) return;
    const text = amount > 0 ? `-${amount}` : blocked > 0 ? `格挡 ${blocked}` : '';
    if (!text) return;
    const color = amount > 0 ? 0xff5a5a : 0x6bb8ff;
    const node = this.label(text, amount >= 10 ? 30 : 24, color, pos.x, pos.y, 0.5);
    this.fxLayer.addChild(node);
    this.floats.push({ node, life: 75 });
  }

  // Approximate on-screen anchor of a combatant, mirroring drawPlayer/drawEnemies.
  private positionFor(entityId: string): { x: number; y: number } | null {
    if (entityId === PLAYER_ID) return { x: 165, y: 500 };
    const enemies = this.engine.state.enemies;
    const idx = enemies.findIndex((e) => e.entityId === entityId);
    if (idx < 0) return null;
    const panelW = 200;
    const gap = 40;
    const totalW = enemies.length * panelW + (enemies.length - 1) * gap;
    const x = (DESIGN_W - totalW) / 2 + idx * (panelW + gap) + panelW / 2;
    return { x, y: 150 };
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

    const def = CARDS[card.definitionId];
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
    this.root.addChild(this.label(`回合 ${state.turn}`, 24, COLOR.text, 640, 16, 0.5));
    this.root.addChild(
      this.label(`抽牌堆 ${state.drawPile.length}`, 15, COLOR.subtle, 30, 692),
    );
    const discard = this.label(`弃牌堆 ${state.discardPile.length}`, 15, COLOR.subtle, 1250, 692);
    discard.anchor.set(1, 0);
    this.root.addChild(discard);

    // relic bar: small pills across the top-left
    let rx = 30;
    for (const id of this.relicIds) {
      const def = RELICS[id];
      if (!def) continue;
      const name = this.label(def.name, 13, COLOR.text, 0, 0, 0);
      const pillW = name.width + 16;
      const pill = new Container();
      pill.x = rx;
      pill.y = 14;
      pill.addChild(new Graphics().roundRect(0, 0, pillW, 22, 6).fill({ color: 0x3a3520 }).stroke({ width: 1, color: COLOR.energy, alpha: 0.6 }));
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
    const gap = 40;
    const totalW = enemies.length * panelW + (enemies.length - 1) * gap;
    let x = (DESIGN_W - totalW) / 2;
    for (const enemy of enemies) {
      this.drawEnemy(enemy, x, 96, panelW);
      x += panelW + gap;
    }
  }

  private drawEnemy(enemy: EnemyState, x: number, y: number, w: number): void {
    const c = new Container();
    c.x = x;
    c.y = y;
    const h = 128;
    const selecting = this.selectedInstanceId !== null;

    const bg = new Graphics().roundRect(0, 0, w, h, 10).fill(COLOR.enemyPanel);
    if (selecting) bg.stroke({ width: 3, color: COLOR.selected });
    c.addChild(bg);

    // intent telegraph, above the panel
    const intent = this.intentText(enemy);
    const intentBg = new Graphics()
      .roundRect(w / 2 - 60, -34, 120, 26, 8)
      .fill({ color: 0x000000, alpha: 0.4 });
    c.addChild(intentBg);
    c.addChild(this.label(intent.label, 15, intent.color, w / 2, -21, 0.5));

    // name
    const name = ENEMIES[enemy.definitionId]?.name ?? enemy.definitionId;
    c.addChild(this.label(name, 17, COLOR.text, w / 2, 12, 0.5));

    // hp bar
    c.addChild(this.bar(16, 42, w - 32, 20, enemy.hp, enemy.maxHp, COLOR.hpEnemy));

    // block
    if (enemy.block > 0) c.addChild(this.blockBadge(w - 44, 40, enemy.block));

    // statuses
    c.addChild(this.statusRow(enemy.statuses, 16, 78));

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
    c.x = 40;
    c.y = 470;
    const w = 250;
    const h = 150;
    c.addChild(new Graphics().roundRect(0, 0, w, h, 10).fill(COLOR.playerPanel));
    c.addChild(this.label('你', 18, COLOR.text, 16, 12));
    c.addChild(this.bar(16, 44, w - 32, 22, p.hp, p.maxHp, COLOR.hpPlayer));
    if (p.block > 0) c.addChild(this.blockBadge(w - 44, 42, p.block));
    c.addChild(this.statusRow(p.statuses, 16, 82));
    this.root.addChild(c);

    // energy orb
    const orb = new Container();
    orb.x = 175;
    orb.y = 452;
    orb.addChild(new Graphics().circle(0, 0, 34).fill(COLOR.energy).stroke({ width: 3, color: 0x8a6d0a }));
    orb.addChild(this.label(`${p.energy}/${p.maxEnergy}`, 20, 0x2a2205, 0, 0, 0.5));
    this.root.addChild(orb);
  }

  private drawHand(): void {
    const hand = this.engine.state.hand;
    const cardW = 150;
    const cardH = 195;
    const gap = 14;
    const totalW = hand.length * cardW + Math.max(0, hand.length - 1) * gap;
    let x = (DESIGN_W - totalW) / 2;
    const y = 495;
    for (const card of hand) {
      this.drawCard(card.instanceId, card.definitionId, x, y, cardW, cardH);
      x += cardW + gap;
    }
  }

  private drawCard(instanceId: string, definitionId: string, x: number, y: number, w: number, h: number): void {
    const def = CARDS[definitionId];
    const card = this.engine.state.hand.find((c) => c.instanceId === instanceId)!;
    const playable = this.engine.canPlay(card) && this.engine.state.outcome === 'ongoing';
    const selected = this.selectedInstanceId === instanceId;

    const c = new Container();
    c.x = x;
    c.y = selected ? y - 16 : y;
    c.alpha = playable ? 1 : 0.5;

    const base =
      def.type === 'attack' ? COLOR.cardAttack : def.type === 'power' ? COLOR.cardPower : COLOR.cardSkill;
    const bg = new Graphics().roundRect(0, 0, w, h, 10).fill(base).stroke({ width: 2, color: 0x000000, alpha: 0.5 });
    if (selected) bg.stroke({ width: 3, color: COLOR.selected });
    c.addChild(bg);

    // cost circle
    c.addChild(new Graphics().circle(20, 20, 15).fill(COLOR.costCircle));
    c.addChild(this.label(`${def.cost}`, 18, COLOR.energy, 20, 20, 0.5));

    // name
    c.addChild(this.label(def.name, 16, COLOR.text, w / 2, 42, 0.5));

    // divider
    c.addChild(new Graphics().rect(14, 66, w - 28, 1).fill({ color: 0xffffff, alpha: 0.2 }));

    // description (wrapped)
    const desc = new Text({
      text: def.description,
      style: { fill: COLOR.text, fontSize: 13, fontFamily: FONT, align: 'center', wordWrap: true, wordWrapWidth: w - 24, lineHeight: 18 },
    });
    desc.anchor.set(0.5, 0);
    desc.x = w / 2;
    desc.y = 80;
    c.addChild(desc);

    c.eventMode = 'static';
    c.cursor = playable ? 'pointer' : 'default';
    c.on('pointertap', () => this.clickCard(instanceId));
    this.root.addChild(c);
  }

  private drawEndTurnButton(): void {
    const enabled = this.engine.state.outcome === 'ongoing';
    this.root.addChild(
      this.button('结束回合', 1058, 452, 182, 56, () => this.clickEndTurn(), enabled),
    );
  }

  private drawLog(): void {
    if (this.messages.length === 0) return;
    const c = new Container();
    c.x = 980;
    c.y = 250;
    const shown = this.messages.slice(-5);
    shown.forEach((msg, i) => {
      const alpha = 0.4 + (0.6 * (i + 1)) / shown.length;
      c.addChild(this.label(msg, 14, COLOR.subtle, 0, i * 22, 0, alpha));
    });
    this.root.addChild(c);
  }

  private drawOutcome(): void {
    const win = this.engine.state.outcome === 'victory';
    const c = new Container();
    c.addChild(new Graphics().rect(0, 0, DESIGN_W, DESIGN_H).fill({ color: COLOR.overlay, alpha: 0.82 }));
    c.addChild(this.label(win ? '胜利！' : '失败…', 64, win ? COLOR.hpPlayer : COLOR.hpEnemy, 640, 280, 0.5));
    if (win) {
      c.addChild(this.label(`剩余生命 ${this.engine.state.player.hp}`, 22, COLOR.text, 640, 350, 0.5));
    }
    c.addChild(
      this.button(win ? '继续' : '结束', 540, 400, 200, 60, () =>
        this.onCombatEnd(win, this.engine.state.player.hp), true),
    );
    this.root.addChild(c);
  }

  // ── small helpers ──
  private label(text: string, size: number, color: number, x = 0, y = 0, anchor = 0, alpha = 1): Text {
    const t = new Text({ text, style: { fill: color, fontSize: size, fontFamily: FONT, fontWeight: '600' } });
    t.anchor.set(anchor, anchor === 0.5 ? 0.5 : 0);
    t.x = x;
    t.y = y;
    t.alpha = alpha;
    return t;
  }

  private bar(x: number, y: number, w: number, h: number, cur: number, max: number, fill: number): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    const frac = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
    c.addChild(new Graphics().roundRect(0, 0, w, h, 5).fill(COLOR.hpBg));
    if (frac > 0) c.addChild(new Graphics().roundRect(0, 0, w * frac, h, 5).fill(fill));
    c.addChild(this.label(`${cur}/${max}`, 13, COLOR.text, w / 2, h / 2, 0.5));
    return c;
  }

  private blockBadge(x: number, y: number, amount: number): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    c.addChild(new Graphics().roundRect(0, 0, 34, 22, 5).fill(COLOR.block));
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
      const meta = STATUS_META[s.id];
      const txt = `${meta.short}${s.stacks}`;
      const label = this.label(txt, 13, 0xffffff, 0, 0, 0);
      const pillW = label.width + 14;
      const pill = new Container();
      pill.x = cx;
      pill.addChild(new Graphics().roundRect(0, 0, pillW, 20, 6).fill(meta.color));
      label.x = 7;
      label.y = 3;
      pill.addChild(label);
      c.addChild(pill);
      cx += pillW + 6;
    }
    return c;
  }

  private button(label: string, x: number, y: number, w: number, h: number, onClick: () => void, enabled: boolean): Container {
    const c = new Container();
    c.x = x;
    c.y = y;
    c.alpha = enabled ? 1 : 0.45;
    c.addChild(new Graphics().roundRect(0, 0, w, h, 10).fill(COLOR.button).stroke({ width: 2, color: 0x000000, alpha: 0.4 }));
    c.addChild(this.label(label, 20, COLOR.buttonText, w / 2, h / 2, 0.5));
    if (enabled) {
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', onClick);
    }
    return c;
  }

  // Estimated telegraph damage: accounts for enemy strength/weak and player
  // vulnerable, mirroring the resolver so the number the player sees is honest.
  private intentText(enemy: EnemyState): { label: string; color: number } {
    const move = enemy.nextMove;
    if (!move) return { label: '?', color: 0x888888 };
    let dmg = 0;
    let buff = false;
    let debuff = false;
    for (const eff of move.intents) {
      if (eff.kind === 'dealDamage') dmg += this.estimateDamage(enemy, eff.value);
      else if (eff.kind === 'gainBlock') buff = true;
      else if (eff.kind === 'applyStatus') eff.target === 'self' ? (buff = true) : (debuff = true);
    }
    if (dmg > 0) return { label: `攻击 ${dmg}`, color: 0xff6b6b };
    if (buff) return { label: '强化', color: 0x6bd0ff };
    if (debuff) return { label: '弱化你', color: 0xffd06b };
    return { label: move.id, color: 0xcccccc };
  }

  private estimateDamage(enemy: EnemyState, base: number): number {
    let d = base + getStatusStacks(enemy, 'strength');
    if (getStatusStacks(enemy, 'weak') > 0) d = Math.floor(d * WEAK_MULTIPLIER);
    if (getStatusStacks(this.engine.state.player, 'vulnerable') > 0) d = Math.floor(d * VULNERABLE_MULTIPLIER);
    return Math.max(0, d);
  }
}
