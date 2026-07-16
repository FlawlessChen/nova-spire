import type { Locale } from './locale';

// 简体中文 — 默认语言。内容条目按 src/data 中的内容 id 索引。

export const zhCN: Locale = {
  ui: {
    // 战斗
    turn: (n) => `回合 ${n}`,
    drawPile: (n) => `抽牌堆 ${n}`,
    discardPile: (n) => `弃牌堆 ${n}`,
    endTurn: '结束回合',
    victory: '胜利！',
    defeat: '失败…',
    hpLeft: (hp) => `剩余生命 ${hp}`,
    continueRun: '继续',
    finishRun: '结束',
    you: '你',
    blockFloat: (n) => `格挡 ${n}`,
    logTurn: (n) => `— 回合 ${n} —`,
    logPlayerHit: (amount, blocked) =>
      `你受到 ${amount} 伤害${blocked > 0 ? `（挡下 ${blocked}）` : ''}`,
    logEnemyDead: '敌人被击败！',
    intentAttack: (dmg) => `攻击 ${dmg}`,
    intentBuff: '强化',
    intentDebuff: '弱化你',
    intentUnknown: '?',
    // 地图
    mapTitle: '星图 · 新星之塔',
    hpLine: (cur, max) => `生命 ${cur}/${max}`,
    goldLine: (n) => `金币 ${n}`,
    deckLine: (n) => `卡组 ${n} 张`,
    relicsLine: (names) => `遗物：${names}`,
    nodeBattle: '战斗',
    nodeElite: '精英',
    nodeCampfire: '篝火',
    nodeBoss: 'BOSS',
    runWonNew: '登顶！新的一局',
    runLostNew: '再来一局',
    // 奖励
    rewardTitle: '战斗胜利 — 选择一张卡牌',
    relicDrop: (name, desc) => `获得遗物：${name} — ${desc}`,
    skip: '跳过',
    cardTypeAttack: '攻击',
    cardTypeSkill: '技能',
    cardTypePower: '能力',
    // 篝火
    campfire: '篝火',
    campfireHeal: (n) => `休息可恢复 ${n} 点生命`,
    campfireHp: (cur, healed, max) => `${cur} → ${healed} / ${max}`,
    rest: '休息',
    // 流派选择
    pathSelectTitle: '选择你的流派',
    pathSelectHint: '你的起始卡组、专属遗物与奖励倾向将由此决定',
    pathStartDeck: '起始卡组',
    pathStartRelic: '专属遗物',
    startRun: '开始征程',
  },

  cards: {
    strike: { name: '打击', desc: '造成 6 点伤害。' },
    defend: { name: '防御', desc: '获得 5 点护甲。' },
    poisonStab: { name: '毒刃', desc: '造成 4 点伤害，施加 3 层中毒。' },
    bash: { name: '重击', desc: '造成 8 点伤害，施加 2 层易伤。' },
    cleave: { name: '横扫', desc: '对所有敌人造成 5 点伤害。' },
    ironWave: { name: '铁潮', desc: '造成 4 点伤害，获得 4 点护甲。' },
    flex: { name: '蓄力', desc: '获得 2 点力量。' },
    quickDraw: { name: '迅捷', desc: '抽 2 张牌。' },
    intimidate: { name: '威慑', desc: '对所有敌人施加 1 层虚弱。' },
    secondWind: { name: '回气', desc: '回复 6 点生命，获得 1 点能量。' },
    heavyBlow: { name: '重锤', desc: '造成 14 点伤害。' },
    shrugItOff: { name: '卸力', desc: '获得 8 点护甲，抽 1 张牌。' },
    twinStrike: { name: '双重打击', desc: '连续两次造成 5 点伤害。' },
    rampage: { name: '狂暴', desc: '造成 10 点伤害，获得 3 点力量。' },
    whirlwind: { name: '旋风斩', desc: '对所有敌人造成 8 点伤害并施加 1 层易伤。' },
    toxicShiv: { name: '淬毒小刀', desc: '造成 3 点伤害，施加 2 层中毒。' },
    battleTrance: { name: '战斗专注', desc: '抽 3 张牌。' },
    bloodletting: { name: '放血', desc: '获得 2 点能量。' },
    ironclad: { name: '铁壁', desc: '获得 14 点护甲。' },
    perfectedStrike: { name: '完美打击', desc: '造成 12 点伤害，获得 6 点护甲。' },
    cripple: { name: '致残', desc: '施加 2 层虚弱与 2 层易伤。' },
    reaper: { name: '收割', desc: '对所有敌人造成 8 点伤害，回复 8 点生命。' },
  },

  enemies: {
    slime: '酸液史莱姆',
    cultist: '邪教徒',
    jawWorm: '颚虫',
    gremlinNob: '地精首领',
    sentry: '哨卫',
    guardian: '守护者',
  },

  relics: {
    bronzeScales: { name: '青铜鳞甲', desc: '每场战斗开始时获得 4 点护甲。' },
    vajra: { name: '金刚杵', desc: '每场战斗开始时获得 1 点力量。' },
    ancientTome: { name: '远古典籍', desc: '每场战斗开始时抽 1 张牌。' },
    inkPhial: { name: '墨水瓶', desc: '每打出 3 张牌，抽 1 张牌。' },
    lantern: { name: '战地提灯', desc: '每回合开始时获得 2 点护甲。' },
    bloodVial: { name: '血瓶', desc: '每击败一个敌人，回复 3 点生命。' },
    catalyst: { name: '催化剂', desc: '每回合开始时，对所有敌人施加 1 层中毒。' },
  },

  statuses: {
    weak: { name: '虚弱', short: '弱' },
    vulnerable: { name: '易伤', short: '易' },
    poison: { name: '中毒', short: '毒' },
    strength: { name: '力量', short: '力' },
  },

  paths: {
    toxicologist: {
      name: '淬毒者',
      tagline: '剧毒流 · 以毒穿甲',
      desc: '起手携带毒刃与淬毒小刀，专属遗物「催化剂」每回合为全体敌人叠毒。奖励偏向毒系与控制。',
    },
    berserker: {
      name: '狂战士',
      tagline: '力量流 · 越战越强',
      desc: '起手携带蓄力与狂暴，专属遗物「金刚杵」开局即得力量。奖励偏向力量与多段攻击。',
    },
    bulwark: {
      name: '壁垒卫士',
      tagline: '护甲流 · 攻守一体',
      desc: '起手携带铁潮与铁壁，专属遗物「青铜鳞甲」每场开局获得护甲。奖励偏向护甲与攻防转化。',
    },
  },
};
