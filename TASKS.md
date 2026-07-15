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

## ✅ M3 — Run 旅程循环（完成）
纯逻辑层（不依赖 Pixi，可序列化，种子化）：
- [x] RunState 类型 + 地图节点/边（src/types/run.ts）
- [x] 分层 DAG 地图生成（连通性保证）（src/game/mapGenerator.ts）
- [x] RunManager：旅程 FSM（进入节点→战斗→奖励→前进）（src/game/runManager.ts）
- [x] 遭遇/奖励数据池（src/data/encounters.ts）
- [x] 战斗奖励三选一加牌
- [x] 篝火节点（休息回血）
- [x] Boss 节点收尾（胜利=通关）
- [x] localStorage 存档 / 续玩（src/game/saveManager.ts）
- [x] Run 逻辑单元测试（连通性/全流程通关/存读档/种子复现）

渲染层：
- [x] 地图界面（节点+连线，可点选可达节点）（src/render/mapView.ts）
- [x] 奖励界面（三选一 / 跳过）（src/render/rewardView.ts）
- [x] 篝火界面（src/render/campfireView.ts）
- [x] 顶层 App FSM 串联地图↔战斗↔奖励↔篝火↔结算（src/render/app.ts）
- [x] 共享 UI 原语（src/render/ui.ts）
- [x] 战斗结束回调改造（CombatView：onCombatEnd）

## ✅ M4 — 内容与平衡（完成）
- [x] 扩充卡池至 22 张（+10 新卡：多段攻击/群体/能量循环/续航）
- [x] 新增 2 种精英敌人（Gremlin Nob / Sentry）+ 5 组精英遭遇
- [x] 遗物系统：RelicEngine 事件总线订阅者 + 6 个遗物（src/data/relics.ts）
- [x] 引擎新增 applyEffects 单点入口（遗物效果复用 EffectResolver 路径）
- [x] 修复：onCombatStart 时序 bug（开局遗物护甲被回合重置清零）
- [x] 架构验证：src/core + src/game grep 零内容 id（REWARD_POOL 迁至数据层）
- [x] 精英胜利掉落遗物（不重复）；战斗/地图/奖励界面显示遗物
- [x] 数值平衡：200 种子模拟，基础策略胜率 57%（Boss slam 16→15）
- [x] 平衡回归测试固化（60 种子胜率带 30%–80%）

## ✅ M5 — 打磨与发布（完成）
- [x] 飘字反馈：伤害/格挡浮动数字（rAF 上浮渐隐，FX 层跨重绘持久）
- [x] 音效占位：WebAudio 合成音（出牌/受击/格挡/胜负），无资源依赖，环境缺失时静默
- [x] README（中文：特性/架构/目录/开发/玩法/部署）
- [x] CI：GitHub Actions 每次 push 跑测试+构建并上传 dist 产物
- [x] Pages 部署工作流（手动触发；私有仓库需付费计划，README 已记录两种部署路径）
- [ ] README 配 GIF（需真实浏览器截录，环境无浏览器，待后续补充）

## MVP 状态：✅ 完成
M1–M5 全部落地。57 个测试通过。一局完整可玩、可存档续玩、有内容深度与平衡验证的卡牌 Roguelike。

## 进度日志
- 2026-07-15: 项目初始化，架构 v2 确认。
- 2026-07-15: M1 引擎核心全部完成，9 单测通过，建立 git 基线。
- 2026-07-15: M2 渲染层落地，单场战斗可玩；16 测试通过，生产构建通过。
- 2026-07-15: 制定 M3 Run 旅程循环规划，开始实现旅程逻辑层。
- 2026-07-15: M3 完成——Run 逻辑层（地图生成/RunManager/存档）+ 渲染层（地图/奖励/篝火/顶层 App FSM）全部落地。44 测试通过，生产构建通过，dev 冒烟无误。**MVP 核心循环打通：地图探索 → 战斗 → 三选一加牌 → 篝火 → Boss → 通关/失败，可存档续玩。**
- 2026-07-15: 建立 GitHub 私有仓库 FlawlessChen/nova-spire 并推送；确立"每里程碑自动推送"工作流。
- 2026-07-15: M4 完成——卡池 22 张、2 精英、遗物系统（事件总线订阅者，引擎 grep 零内容 id）、精英掉落遗物、数值平衡（200 种子模拟 57% 基础胜率）+ 平衡回归测试。57 测试通过，构建通过。修复 onCombatStart 时序 bug。
- 2026-07-15: M5 完成——飘字/音效占位、README、CI 工作流、Pages 部署工作流（私有仓库暂不可用，已记录路径）。**MVP 全部完成。**
