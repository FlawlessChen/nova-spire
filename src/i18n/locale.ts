// Locale contract. Every player-visible string flows through a Locale so the
// game can ship additional languages by adding one file. Content entries are
// keyed by content id (card/enemy/relic/status ids from src/data) — the data
// tables stay canonical English; locales are a presentation-layer concern.

export interface Locale {
  ui: {
    // combat
    turn: (n: number) => string;
    drawPile: (n: number) => string;
    discardPile: (n: number) => string;
    endTurn: string;
    victory: string;
    defeat: string;
    hpLeft: (hp: number) => string;
    continueRun: string;
    finishRun: string;
    you: string;
    blockFloat: (n: number) => string;
    logTurn: (n: number) => string;
    logPlayerHit: (amount: number, blocked: number) => string;
    logEnemyDead: string;
    intentAttack: (dmg: number) => string;
    intentBuff: string;
    intentDebuff: string;
    intentUnknown: string;
    // map
    mapTitle: string;
    hpLine: (cur: number, max: number) => string;
    goldLine: (n: number) => string;
    deckLine: (n: number) => string;
    relicsLine: (names: string) => string;
    nodeBattle: string;
    nodeElite: string;
    nodeCampfire: string;
    nodeBoss: string;
    runWonNew: string;
    runLostNew: string;
    // reward
    rewardTitle: string;
    relicDrop: (name: string, desc: string) => string;
    skip: string;
    cardTypeAttack: string;
    cardTypeSkill: string;
    cardTypePower: string;
    // campfire
    campfire: string;
    campfireHeal: (n: number) => string;
    campfireHp: (cur: number, healed: number, max: number) => string;
    rest: string;
  };
  cards: Record<string, { name: string; desc: string }>;
  enemies: Record<string, string>;
  relics: Record<string, { name: string; desc: string }>;
  statuses: Record<string, { name: string; short: string }>;
}
