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
    nodeShop: string;
    nodeEvent: string;
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
    campfireRest: string;
    campfireUpgrade: string;
    campfireUpgradeHint: string;
    campfireNoUpgrade: string;
    // path select
    pathSelectTitle: string;
    pathSelectHint: string;
    pathStartDeck: string;
    pathStartRelic: string;
    startRun: string;
    // title / menu
    gameSubtitle: string;
    menuNewRun: string;
    menuContinue: string;
    menuHowToPlay: string;
    menuAbout: string;
    back: string;
    close: string;
    // help
    helpTitle: string;
    helpSections: { heading: string; body: string }[];
    aboutTitle: string;
    aboutBody: string;
    // in-run menu / settings
    menu: string;
    sound: string;
    soundOn: string;
    soundOff: string;
    abandonRun: string;
    abandonConfirm: string;
    resume: string;
    viewDeck: string;
    deckTitle: (n: number) => string;
    drawPileTitle: (n: number) => string;
    discardPileTitle: (n: number) => string;
    emptyPile: string;
    // shop
    shopTitle: string;
    shopCards: string;
    shopRelics: string;
    shopRemoval: string;
    shopRemovalHint: string;
    shopRemovalDone: string;
    shopChooseRemoval: string;
    shopSoldOut: string;
    shopLeave: string;
    shopGold: (n: number) => string;
    price: (n: number) => string;
    eventContinue: string;
  };
  cards: Record<string, { name: string; desc: string; descUpgraded?: string }>;
  enemies: Record<string, string>;
  relics: Record<string, { name: string; desc: string }>;
  statuses: Record<string, { name: string; short: string }>;
  paths: Record<string, { name: string; tagline: string; desc: string }>;
  events: Record<string, { title: string; body: string; choices: Record<string, string> }>;
}
