# Nova Spire Roadmap

## Phase 1 架构
- [x] 核心类型设计
- [x] Vite 初始化
- [ ] PixiJS 接入（渲染层进行中）
- [x] 项目目录建立

## Phase 2 战斗核心
- [x] 核心类型落地 (src/types)
- [x] SeededRNG + 事件总线 (src/core)
- [x] CombatState 初始化
- [x] FSM 回合状态机
- [x] EffectResolver
- [x] Card 系统（出牌/抽牌/弃牌/洗牌）
- [x] 状态效果结算（weak/vulnerable/poison/strength）
- [x] 敌人 random AI + 意图预告
- [x] 胜负判定
- [x] 引擎单元测试（9 个，全部通过）

## Phase 3 内容
- [x] 卡牌数据表（12 张）
- [x] 敌人数据表（4 种，含 Boss Guardian）
- [ ] 地图节点生成 + 选路
- [ ] 战斗奖励（三选一加牌）
- [ ] Boss 战流程
- [ ] localStorage 存档

## Phase 4 发布
- [ ] 渲染层（PixiJS 战斗界面：手牌/意图/HP/能量/结束回合）
- [ ] 渲染层打磨（动画/飘字/音效占位）
- [ ] README（含 GIF）
- [ ] GitHub Pages 部署

## 进度日志
- 2026-07-15: 项目初始化，写入 CLAUDE.md/TASKS.md，架构 v2 已确认。
- 2026-07-15: Phase 2 战斗核心全部完成——引擎/FSM/EffectResolver/卡牌/状态/AI/胜负 + 9 个单测通过，typecheck 通过。Phase 3 卡牌与敌人数据表完成。建立首个 git 基线提交。
