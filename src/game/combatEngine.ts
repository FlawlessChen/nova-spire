import type {
  CardDefinition,
  CardInstance,
  CombatState,
  EffectDefinition,
  EnemyDefinition,
  EnemyMove,
  EnemyState,
  PlayContext,
  ResolvedIntent,
} from '@/types';
import { PLAYER_ID } from '@/types';
import { SeededRNG } from '@/core/rng';
import { EventBus } from '@/core/eventBus';
import { CARDS } from '@/data/cards';
import { ENEMIES } from '@/data/enemies';
import { resolveEffects } from './targeting';
import { applyIntent, tickStatuses } from './effectResolver';

// The combat engine: owns the FSM and all state transitions. Pure logic, no
// PixiJS. Randomness flows through a seeded RNG; observable moments flow through
// the EventBus.

export interface CombatConfig {
  playerMaxHp: number;
  playerHp: number;
  maxEnergy: number;
  handSize: number;
  deck: string[];        // card definition ids
  enemies: string[];     // enemy definition ids
  seed: number;
}

export class CombatEngine {
  state: CombatState;
  readonly bus: EventBus;
  private rng: SeededRNG;
  private handSize: number;
  private instanceCounter = 0;

  constructor(config: CombatConfig, bus?: EventBus) {
    this.bus = bus ?? new EventBus();
    this.rng = new SeededRNG(config.seed);
    this.handSize = config.handSize;

    const drawPile = this.rng.shuffle(
      config.deck.map((id) => this.makeCard(id)),
    );

    const enemies = config.enemies.map((id, i) => this.spawnEnemy(ENEMIES[id], i));

    this.state = {
      phase: 'combatStart',
      turn: 0,
      player: {
        hp: config.playerHp,
        maxHp: config.playerMaxHp,
        block: 0,
        energy: config.maxEnergy,
        maxEnergy: config.maxEnergy,
        statuses: [],
      },
      enemies,
      drawPile,
      hand: [],
      discardPile: [],
      exhaustPile: [],
      pendingIntents: [],
      rngSeed: config.seed,
      outcome: 'ongoing',
    };
  }

  // ── setup helpers ──
  private makeCard(definitionId: string): CardInstance {
    return { instanceId: `c${this.instanceCounter++}`, definitionId };
  }

  private spawnEnemy(def: EnemyDefinition, index: number): EnemyState {
    const hp = this.rng.int(def.maxHp[0], def.maxHp[1]);
    return {
      entityId: `enemy${index}`,
      definitionId: def.id,
      hp,
      maxHp: hp,
      block: 0,
      statuses: [],
      nextMove: null,
      aiMemory: { turnCount: 0 },
    };
  }

  // ── lifecycle ──
  start(): void {
    this.beginPlayerTurn();
  }

  private beginPlayerTurn(): void {
    this.state.turn += 1;
    this.state.phase = 'playerTurn';
    this.state.player.energy = this.state.player.maxEnergy;
    this.state.player.block = 0;

    // onCombatStart fires on turn 1, AFTER block is reset, so combat-start
    // relics (e.g. +block) aren't wiped by the turn's block reset.
    if (this.state.turn === 1) this.bus.publish({ type: 'onCombatStart' });

    this.bus.publish({ type: 'onTurnStart', turn: this.state.turn, side: 'player' });

    tickStatuses(this.state, PLAYER_ID, this.bus);
    this.drawCards(this.handSize);
    this.telegraphEnemies();
    this.checkOutcome();
  }

  // ── deck operations ──
  drawCards(n: number): void {
    for (let i = 0; i < n; i++) {
      if (this.state.drawPile.length === 0) {
        if (this.state.discardPile.length === 0) return; // truly out of cards
        this.state.drawPile = this.rng.shuffle(this.state.discardPile);
        this.state.discardPile = [];
      }
      const card = this.state.drawPile.pop()!;
      this.state.hand.push(card);
    }
  }

  private cardDef(instance: CardInstance): CardDefinition {
    return CARDS[instance.definitionId];
  }

  // ── playing a card ──
  canPlay(instance: CardInstance): boolean {
    if (this.state.phase !== 'playerTurn' && this.state.phase !== 'awaitingTarget') return false;
    return this.state.player.energy >= this.cardDef(instance).cost;
  }

  /**
   * Play a card from hand. chosenTargetId is required when the card's
   * targetMode is 'enemy'. Returns true if the card was played.
   */
  playCard(instanceId: string, chosenTargetId?: string): boolean {
    const idx = this.state.hand.findIndex((c) => c.instanceId === instanceId);
    if (idx < 0) return false;
    const instance = this.state.hand[idx];
    const def = this.cardDef(instance);
    if (!this.canPlay(instance)) return false;
    if (def.targetMode === 'enemy' && !chosenTargetId) return false;

    this.state.phase = 'resolvingEffects';
    this.state.player.energy -= def.cost;

    // remove from hand
    this.state.hand.splice(idx, 1);

    this.bus.publish({ type: 'onCardPlayed', cardId: def.id, sourceId: PLAYER_ID });

    const ctx: PlayContext = { sourceId: PLAYER_ID, chosenTargetId };
    const intents = resolveEffects(def.effects, ctx, this.state, this.rng);
    this.executeIntents(intents);

    // to discard (or exhaust)
    if (def.exhaust) this.state.exhaustPile.push(instance);
    else this.state.discardPile.push(instance);

    this.removeDeadEnemies();
    this.checkOutcome();
    if (this.state.outcome === 'ongoing') this.state.phase = 'playerTurn';
    return true;
  }

  // Execute a queue of intents. drawCards is dispatched here (needs pile access).
  private executeIntents(intents: ResolvedIntent[]): void {
    for (const intent of intents) {
      if (intent.kind === 'drawCards') {
        this.drawCards(intent.value ?? 0);
      } else {
        applyIntent(this.state, intent, this.bus);
      }
    }
  }

  /**
   * Apply a list of authoring-layer effects from an external source (e.g. a
   * relic) as if cast by `sourceId`. Routes through the SAME resolve→execute
   * path as cards and enemy moves, so effect logic stays in one place. Returns
   * silently if combat has ended.
   */
  applyEffects(effects: EffectDefinition[], sourceId: string = PLAYER_ID): void {
    if (this.state.outcome !== 'ongoing') return;
    const ctx: PlayContext = { sourceId };
    const intents = resolveEffects(effects, ctx, this.state, this.rng);
    this.executeIntents(intents);
    this.removeDeadEnemies();
    this.checkOutcome();
  }

  // ── ending the turn / enemy turn ──
  endTurn(): void {
    if (this.state.phase !== 'playerTurn') return;
    this.state.phase = 'endingPlayerTurn';

    // discard remaining hand
    this.state.discardPile.push(...this.state.hand);
    this.state.hand = [];

    this.runEnemyTurn();

    if (this.state.outcome === 'ongoing') this.beginPlayerTurn();
  }

  private runEnemyTurn(): void {
    this.state.phase = 'enemyTurn';
    this.bus.publish({ type: 'onTurnStart', turn: this.state.turn, side: 'enemy' });

    for (const enemy of this.state.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.block = 0;
      tickStatuses(this.state, enemy.entityId, this.bus);
      if (enemy.hp <= 0) continue;

      const move = enemy.nextMove ?? this.chooseMove(enemy);
      const ctx: PlayContext = { sourceId: enemy.entityId };
      const intents = resolveEffects(move.intents, ctx, this.state, this.rng);
      this.executeIntents(intents);
      enemy.aiMemory.lastMoveId = move.id;
      enemy.aiMemory.turnCount += 1;

      this.removeDeadEnemies();
      this.checkOutcome();
      if (this.state.outcome !== 'ongoing') return;
    }
  }

  // ── enemy AI (MVP: random by weight) ──
  private chooseMove(enemy: EnemyState): EnemyMove {
    const def = ENEMIES[enemy.definitionId];
    return this.rng.weightedPick(def.moves.map((m) => ({ value: m, weight: m.weight })));
  }

  private telegraphEnemies(): void {
    for (const enemy of this.state.enemies) {
      if (enemy.hp > 0) enemy.nextMove = this.chooseMove(enemy);
    }
  }

  // ── outcome ──
  private removeDeadEnemies(): void {
    const alive: EnemyState[] = [];
    for (const e of this.state.enemies) {
      if (e.hp <= 0) this.bus.publish({ type: 'onEnemyDeath', entityId: e.entityId });
      else alive.push(e);
    }
    this.state.enemies = alive;
  }

  private checkOutcome(): void {
    if (this.state.player.hp <= 0) {
      this.state.outcome = 'defeat';
      this.state.phase = 'combatEnd';
    } else if (this.state.enemies.length === 0) {
      this.state.outcome = 'victory';
      this.state.phase = 'combatEnd';
    }
  }
}
