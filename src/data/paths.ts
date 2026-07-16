// Hero paths (Hextech-Prism style): at run start the player picks one of three
// build identities. A path is pure DATA — a starting deck, a signature relic,
// and reward-pool weights that tilt future card offers toward the build. No
// path logic lives in the engine; RunManager applies these fields.
//
// Design choices:
// - `deck` REPLACES the starting deck (kept at 10 cards) rather than adding, so
//   builds stay balanced against the same curve.
// - `rewardWeights` biases (not locks) reward rolls: listed cards are weighted
//   up, everything else keeps weight 1, so off-path cards still appear.

export interface PathDefinition {
  id: string;
  name: string;         // canonical English; localized in src/i18n
  deck: string[];       // replaces STARTING_DECK (card definition ids)
  relics: string[];     // signature relics granted at run start
  rewardWeights: Record<string, number>; // cardId -> weight multiplier in rewards
}

// Weighted cards appear this many times more often than a baseline card.
const CORE = 4;
const SUB = 2;

export const PATHS: Record<string, PathDefinition> = {
  // 淬毒者 — 剧毒流：叠毒穿透，靠 DoT 磨死高血敌人
  toxicologist: {
    id: 'toxicologist',
    name: 'Toxicologist',
    deck: [
      'strike', 'strike', 'strike',
      'defend', 'defend', 'defend',
      'poisonStab', 'poisonStab',
      'toxicShiv', 'cripple',
    ],
    relics: ['catalyst'],
    rewardWeights: {
      poisonStab: CORE, toxicShiv: CORE, cripple: SUB, intimidate: SUB, cleave: SUB,
    },
  },

  // 狂战士 — 力量流：叠力量放大每一次打击
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    deck: [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend',
      'flex', 'rampage', 'twinStrike',
    ],
    relics: ['vajra'],
    rewardWeights: {
      flex: CORE, rampage: CORE, twinStrike: SUB, heavyBlow: SUB, perfectedStrike: SUB,
    },
  },

  // 壁垒卫士 — 护甲流：高护甲运转，铁潮/完美打击转化防御为进攻
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    deck: [
      'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'ironWave', 'shrugItOff', 'ironclad',
    ],
    relics: ['bronzeScales'],
    rewardWeights: {
      ironWave: CORE, ironclad: CORE, shrugItOff: SUB, perfectedStrike: SUB, secondWind: SUB,
    },
  },
};

export const PATH_IDS: string[] = Object.keys(PATHS);
export const DEFAULT_PATH_ID = 'berserker';
