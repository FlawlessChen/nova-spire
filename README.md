# Nova Spire

数据驱动的卡牌 Roguelike Deckbuilder，使用 **TypeScript + PixiJS + Vite** 构建。

**🎮 在线试玩：https://flawlesschen.github.io/nova-spire/** （桌面横屏与手机竖屏均可）

爬塔式的单局旅程：在分层地图上选路，逐场战斗，靠三选一加牌与遗物成长，最终挑战 Boss。进度自动存档，刷新即可续玩。

## ✨ 特性

- **完整 Roguelike 循环**：地图探索 → 战斗 → 三选一加牌 → 篝火回血 → 精英掉落遗物 → Boss → 通关/失败
- **回合制卡牌战斗**：能量、抽/弃/洗牌堆、格挡、意图预告，以及虚弱/易伤/中毒/力量状态
- **22 张卡牌 · 6 种敌人（含 2 精英 + Boss） · 6 个遗物**，全部为数据；新增内容 = 加数据
- **遗物 = 事件总线订阅者**：战斗开始加护甲、每 3 张牌抽 1 张、击杀回血等，零引擎耦合
- **全面中文化**：zh-CN 语言系统，卡牌/敌人/遗物/界面全部中文（i18n 架构，可扩展多语言）
- **科幻星空主题**：星空闪烁背景、塔楼剪影、程序化敌我形象、稀有度卡框——零美术资源，全部代码绘制
- **移动端竖屏适配**：横屏 1280×720 / 竖屏 720×1280 双设计空间，旋转即时重排，触屏优化
- **种子化可复现**：同种子生成同地图、同战斗；存档精确保存 RNG 状态
- **自动存档 / 续玩**：localStorage，带版本校验与损坏防御
- **飘字与音效占位**：伤害/格挡飘字 + WebAudio 合成音效，无资源依赖

## 🏗️ 架构原则（已锁定）

1. **数据驱动**：卡牌/敌人/遗物是数据，不是类。
2. **编写层与运行层分离**：`EffectDefinition`（相对目标）→ `ResolvedIntent`（绝对实体）。
3. **战斗引擎为纯逻辑**，不依赖 PixiJS —— `src/core` 与 `src/game` grep 不到任何内容 id。
4. **EffectResolver 单点**：所有效果执行逻辑集中在一处 switch。
5. **FSM 管回合流程**；`CombatState` 为可序列化纯数据快照。
6. **可种子化 RNG**，保证可复现。
7. **GameEvent 事件总线**：遗物 / UI / 成就皆为订阅者，引擎不知晓谁在监听。

## 📂 目录结构

```
src/
  core/     RNG（mulberry32）、事件总线（不依赖 Pixi）
  game/     战斗引擎、FSM、EffectResolver、地图生成、RunManager、遗物引擎、存档
  data/     cards / enemies / statuses / relics / encounters 数据表
  types/    核心类型定义（战斗 + Run 旅程）
  render/   PixiJS 渲染层（只读 state）：战斗 / 地图 / 奖励 / 篝火 / 顶层 App FSM
test/       引擎、地图、Run、存档、遗物、平衡回归的单元测试
```

## 🚀 开发

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（Vite）
npm run build    # 类型检查 + 生产构建
npm test         # 运行测试（Vitest）
npm run typecheck
```

## 🎮 玩法

- 点击手牌打出；攻击牌若有多个敌人需再点目标。
- 点「结束回合」，敌人按预告的意图行动。
- 战斗胜利后三选一加牌（可跳过）；精英额外掉落遗物；篝火可休息回血。
- 击败 Boss 即通关。中途死亡则本局结束。

## 🗺️ 路线图

进度与里程碑详见 [`TASKS.md`](./TASKS.md)。M1–M5（引擎 / 单场战斗 / Run 循环 / 内容与平衡 / 打磨发布）均已完成，共 57 个测试通过。

## 📦 部署

推送到 `master` 会自动触发两个工作流：**CI**（测试 + 构建）与 **Deploy Pages**（构建并发布到 GitHub Pages）。线上地址：https://flawlesschen.github.io/nova-spire/

也可部署到任意静态托管：`npm run build` 产出 `dist/`，上传到 Netlify / Vercel / Cloudflare Pages 等即可。`vite.config.ts` 已设 `base: './'`，支持子路径部署。

## 📄 许可

MIT
