// Nova Spire — core type definitions (architecture v2, locked).
// The combat engine consumes only these types; it never references content ids
// like 'strike' or 'slime'. New cards/enemies/relics are added as DATA, not code.

// ─────────────────────────────────────────────────────────────
// Authoring layer: what card / enemy / relic authors write.
// Uses RELATIVE target selectors — no concrete entity ids.
// ─────────────────────────────────────────────────────────────

export type TargetSelector =
  | 'self'         // the caster (player on card play; the enemy on its move)
  | 'chosenEnemy'  // the enemy the player clicked (requires targetMode 'enemy')
  | 'opponent'     // the caster's opponent (enemy move -> player)
  | 'allEnemies'
  | 'randomEnemy';

export type EffectKind =
  | 'dealDamage'
  | 'gainBlock'
  | 'applyStatus'
  | 'drawCards'
  | 'gainEnergy'
  | 'heal';

export interface DamageEffect { kind: 'dealDamage'; target: TargetSelector; value: number; }
export interface BlockEffect { kind: 'gainBlock'; target: TargetSelector; value: number; }
export interface StatusEffect { kind: 'applyStatus'; target: TargetSelector; status: StatusId; amount: number; }
export interface DrawEffect { kind: 'drawCards'; value: number; }   // implicitly self
export interface EnergyEffect { kind: 'gainEnergy'; value: number; } // implicitly self
export interface HealEffect { kind: 'heal'; target: TargetSelector; value: number; }

export type EffectDefinition =
  | DamageEffect
  | BlockEffect
  | StatusEffect
  | DrawEffect
  | EnergyEffect
  | HealEffect;

// ─────────────────────────────────────────────────────────────
// Runtime layer: what the engine executes after resolving targets.
// ─────────────────────────────────────────────────────────────

export interface ResolvedIntent {
  kind: EffectKind;
  sourceId: string;   // caster entity id
  targetId: string;   // resolved receiver: 'player' or an enemy entityId
  value?: number;
  status?: StatusId;
  amount?: number;
}

export interface PlayContext {
  sourceId: string;
  chosenTargetId?: string; // the enemy the player clicked; absent for enemy moves
}

// ─────────────────────────────────────────────────────────────
// Status effects — also data.
// ─────────────────────────────────────────────────────────────

export type StatusId = 'weak' | 'vulnerable' | 'poison' | 'strength';

export type StatusBehavior = 'onTurnStart' | 'modifyDamageDealt' | 'modifyDamageTaken';

export interface StatusDefinition {
  id: StatusId;
  name: string;
  behavior: StatusBehavior;
  decay: 'decrement' | 'reset' | 'persist';
}

export interface StatusInstance {
  id: StatusId;
  stacks: number;
}

// ─────────────────────────────────────────────────────────────
// Cards.
// ─────────────────────────────────────────────────────────────

export type CardType = 'attack' | 'skill' | 'power';
export type CardRarity = 'common' | 'uncommon' | 'rare';
export type TargetMode = 'enemy' | 'self' | 'none';

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  rarity: CardRarity;
  targetMode: TargetMode;
  description: string;
  effects: EffectDefinition[];
  exhaust?: boolean;
}

export interface CardInstance {
  instanceId: string;
  definitionId: string;
  upgraded?: boolean; // upgrade-system hook; not implemented in MVP
}

// ─────────────────────────────────────────────────────────────
// Enemies.
// ─────────────────────────────────────────────────────────────

export interface EnemyMove {
  id: string;
  intents: EffectDefinition[]; // enemy uses 'opponent' to mean the player
  weight: number;
}

export type AiStrategy = 'random' | 'sequence' | 'conditional'; // sequence/conditional: post-MVP

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHp: [number, number]; // rolled within range at combat start
  moves: EnemyMove[];
  ai: AiStrategy;
}

export interface EnemyState {
  entityId: string;
  definitionId: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusInstance[];
  nextMove: EnemyMove | null; // telegraphed intent
  aiMemory: { lastMoveId?: string; turnCount: number };
}

// ─────────────────────────────────────────────────────────────
// Player + CombatState + FSM.
// ─────────────────────────────────────────────────────────────

export interface PlayerState {
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  maxEnergy: number;
  statuses: StatusInstance[];
}

export type CombatPhase =
  | 'combatStart'
  | 'playerTurn'
  | 'awaitingTarget'
  | 'resolvingEffects'
  | 'endingPlayerTurn'
  | 'enemyTurn'
  | 'combatEnd';

export type CombatOutcome = 'ongoing' | 'victory' | 'defeat';

export interface CombatState {
  phase: CombatPhase;
  turn: number;
  player: PlayerState;
  enemies: EnemyState[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  pendingIntents: ResolvedIntent[];
  rngSeed: number;
  outcome: CombatOutcome;
}

// ─────────────────────────────────────────────────────────────
// Game events — discriminated union with payload contracts.
// Relics / UI / achievements are all subscribers.
// ─────────────────────────────────────────────────────────────

export interface CombatStartEvent { type: 'onCombatStart'; }
export interface TurnStartEvent { type: 'onTurnStart'; turn: number; side: 'player' | 'enemy'; }
export interface CardPlayedEvent { type: 'onCardPlayed'; cardId: string; sourceId: string; }
export interface DamageDealtEvent { type: 'onDamageDealt'; sourceId: string; targetId: string; amount: number; }
export interface DamageTakenEvent { type: 'onDamageTaken'; targetId: string; amount: number; blocked: number; }
export interface EnemyDeathEvent { type: 'onEnemyDeath'; entityId: string; }

export type GameEvent =
  | CombatStartEvent
  | TurnStartEvent
  | CardPlayedEvent
  | DamageDealtEvent
  | DamageTakenEvent
  | EnemyDeathEvent;

// ─────────────────────────────────────────────────────────────
// Relics — authoring-layer effects triggered by events. Types only in MVP.
// ─────────────────────────────────────────────────────────────

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  trigger: GameEvent['type'];
  effects: EffectDefinition[];
  condition?: { kind: 'everyNthTrigger' | 'hpBelowPercent'; value: number };
}

export const PLAYER_ID = 'player';
