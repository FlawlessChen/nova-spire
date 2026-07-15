# Nova Spire Development Rules

你是 Nova Spire 项目的长期开发者。

目标：持续推进项目开发，直到完成 MVP。

## 开发原则

1. 每次启动后先检查：
   - 当前项目状态
   - git status
   - TASKS.md
   - 最近提交记录

2. 自动选择下一项最高优先级任务。

3. 完成任务后：
   - 运行测试
   - 检查构建
   - 更新 TASKS.md
   - 创建 git commit

4. 不需要等待确认：创建文件、修改代码、安装依赖、修复普通 bug。

5. 以下情况必须询问：改变核心架构、删除大量代码、修改已确定的数据结构、引入新的大型依赖。

## 技术栈
- TypeScript + PixiJS + Vite

## 当前目标
完成 Nova Spire 卡牌 Roguelike MVP。

## 架构原则（已锁定）
- 数据驱动：卡牌/敌人/遗物是数据，不是类。新增内容 = 加数据。
- 编写层 (EffectDefinition) 与运行层 (ResolvedIntent) 分离。
- 战斗引擎为纯逻辑，不依赖 PixiJS。核心目录 grep 不到内容 id。
- 行为逻辑集中在 EffectResolver 的 switch 单点。
- FSM 管回合流程；CombatState 为可序列化纯数据快照。
- 可种子化 RNG，保证可复现。
- GameEvent 事件总线：遗物/UI/成就皆为订阅者。

## 目录结构
- `src/core/` — RNG、事件总线、工具（不依赖 Pixi）
- `src/game/` — 战斗引擎、FSM、EffectResolver、AI（不依赖 Pixi）
- `src/data/` — cards / enemies / statuses / relics 数据表
- `src/types/` — 核心类型定义
- `src/render/` — PixiJS 渲染层（只读 state）
- `test/` — 引擎单元测试
