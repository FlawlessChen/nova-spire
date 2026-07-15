# Nova Spire Roadmap

> 规划由长期开发者（我）维护。目标：完成卡牌 Roguelike MVP —— 一局完整的
> 「地图探索 → 战斗 → 加牌成长 → Boss」循环，可存档续玩。

## ✅ M1 — 引擎基线（完成）
- [x] 核心类型（架构 v2，锁定）
- [x] SeededRNG + 事件总线
- [x] CombatEngine FSM + EffectResolver + 相对目标解析
- [x] 卡牌系统（出牌/抽牌/弃牌/洗牌）
- [x] 状态效果（weak/vulnerable/poison/strength）
- [x] 敌人加权随机 AI + 意图预告
- [x] 胜负判定
- [x] 引擎单元测试

## ✅ M2 — 可玩单场战斗（完成）
- [x] PixiJS v8 引导 + 响应式缩放（src/main.ts）
- [x] 战斗渲染层（只读 state）：敌人/意图/HP/护甲/状态/手牌/能量/结束回合/胜负
- [x] 交互接线：出牌/选目标/结束回合
- [x] 渲染交互测试（mock PixiJS）

## 🚧 M3 — Run 旅程循环（进行中，当前优先级）
纯逻辑层（不依赖 Pixi，可序列化，种子化）：
- [ ] RunState 类型 + 地图节点/边（src/types/run.ts）
- [ ] 分层 DAG 地图生成（连通性保证）（src/game/mapGenerator.ts）
- [ ] RunManager：旅程 FSM（进入节点→战斗→奖励→前进）（src/game/runManager.ts）
- [ ] 遭遇/奖励数据池（src/data/encounters.ts）
- [ ] 战斗奖励三选一加牌
- [ ] 篝火节点（休息回血）
- [ ] Boss 节点收尾（胜利=通关）
- [ ] localStorage 存档 / 续玩
- [ ] Run 逻辑单元测试（连通性/全流程通关/存读档/种子复现）

渲染层：
- [ ] 地图界面（节点+连线，可点选可达节点）（src/render/mapView.ts）
- [ ] 奖励界面（三选一 / 跳过）（src/render/rewardView.ts）
- [ ] 顶层 App FSM 串联地图↔战斗↔奖励↔篝火↔结算（src/render/app.ts）
- [ ] 战斗结束回调改造（CombatView：onCombatEnd）

## M4 — 内容与平衡
- [ ] 扩充卡池（20+）与敌人（含 2 种精英）
- [ ] 遗物系统（EventBus 订阅者，数据驱动）
- [ ] 数值平衡（一局可通关但有压力）

## M5 — 打磨与发布
- [ ] 动画/飘字/受击反馈/音效占位
- [ ] README（含 GIF）
- [ ] GitHub Pages 部署

## 进度日志
- 2026-07-15: 项目初始化，架构 v2 确认。
- 2026-07-15: M1 引擎核心全部完成，9 单测通过，建立 git 基线。
- 2026-07-15: M2 渲染层落地，单场战斗可玩；16 测试通过，生产构建通过。
- 2026-07-15: 制定 M3 Run 旅程循环规划，开始实现旅程逻辑层。
