# CURRENT_STATE.md

# Game Context Manager 当前开发状态

更新时间：2026-06-22

## 1. 当前阶段

T020 打包与 MVP 收尾已完成。

当前仓库已经具备最小可运行的 Electron + React + TypeScript + Vite + Tailwind 桌面应用壳，已建立共享领域类型层、基础 SQLite 持久化层，可以从 GUI 选择本地目录创建 `game-context/` 工作空间，也可以导入本软件生成的已有 `game-context/` 并重建 SQLite 索引。应用可创建/选择本地用户，可创建、查看、编辑一级游戏主节点，可上传、查看和删除独立图片资产，可创建、编辑、删除二级模块节点并关联/取消关联图片，也可在模块下创建、查看、编辑和删除三级内容节点。查看节点时，GUI 可以把表单字段、当前节点关联图片和生成后的 MD 预览组合展示。当前还新增了本地 API 配置页、AI Provider 抽象、字段级 AI 预览式编辑能力、三级内容到二级模块的预览式 AI 汇总能力、二级模块到一级游戏主节点的预览式 AI 汇总能力、更清晰的节点树、快捷入口、流程引导和统一通知/预览样式，并提供一个可由外部 Agent 直接读取的示例 `game-context/` 工作空间。README 已补齐 MVP 使用、构建、启动、本地数据、安全和未来计划说明，生产构建和已构建应用启动烟测均已通过。

T020 新增能力：

- `README.md` 已补充当前 MVP 能力、边界、安装、开发、测试、构建、已构建应用启动、基础用户流程、Agent 读取流程、本地数据路径、API/AI 安全、验证方式、已知限制和未来计划。
- `package.json` 新增 `start` 脚本，可在 `corepack pnpm build` 后使用 `corepack pnpm start` 从 `out/` 启动已构建应用。
- 已确认 `corepack pnpm build` 输出 renderer/main/preload 生产产物；当前不是签名 OS 安装包。
- 已确认本地 SQLite 数据库默认位于 Electron `app.getPath('userData')/game-context-manager.sqlite3`，本机烟测路径为 `C:\Users\JT\AppData\Roaming\game-context-manager\game-context-manager.sqlite3`。
- 已确认 API key 仍只保存到本地 SQLite，文件导出测试覆盖不写入 agent-facing 文件。
- 未新增云服务、MCP/RAG 或自动玩游戏等边界外能力。

## 2. 当前产品定位

Game Context Manager 仍保持本地优先定位，只负责帮助人类管理、规整、查看、编辑、删除、汇总和导出结构化游戏上下文，让其他 Agent 能够读取普通文件形态的上下文源。

它不负责数据分析、生图、自动运营建议、RAG、MCP、自动玩游戏、联网公共项目空间或云端多人协作。

## 3. 当前技术决策

已落地：

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- pnpm / Corepack
- SQLite（当前使用 Electron/Node 内置 `node:sqlite`）
- Node 文件系统 API
- Markdown + YAML frontmatter 风格导出
- `manifest.yml`、`INDEX.md`、`image_catalog.yml` 自动生成与更新
- 图片资产复制、重命名、引用查看和删除
- 游戏、模块、内容节点与图片多对多关联
- 二级模块与三级内容节点删除安全规则
- OpenAI-compatible / mock AI Provider 抽象
- 本地 API 配置保存与连接测试
- 字段级 AI 增加/修改/润色候选与确认覆盖
- 三级内容到二级模块的 AI 汇总候选与确认覆盖
- 二级模块到一级游戏的 AI 汇总候选与确认覆盖
- 已有 `game-context/` 工作空间导入与 SQLite 索引重建

后续维护方向：

- 配置 lint/format 规则。
- 增加 GUI 自动化或更系统的人工烟测记录。
- 如目标 Electron/Node 运行时变化，评估替换 `node:sqlite`。
- 在 MVP 行为稳定后补充 OS 安装包打包与签名。

## 4. 当前文件状态

当前主要代码结构：

```text
src/
  main/
    index.ts
    ipc/
      apiIpc.ts
      contentIpc.ts
      gameIpc.ts
      imageIpc.ts
      moduleIpc.ts
      userIpc.ts
      workspaceIpc.ts
    services/
      aiProviderService.ts
      fileExportService.ts
      sqliteService.ts
      workspaceService.ts
  preload/
    index.ts
  renderer/
    index.html
    src/
      main.tsx
      App.tsx
      styles/
        index.css
  shared/
    index.ts
    constants/
      fields.ts
    types/
      api.ts
      content.ts
      domain.ts
      game.ts
      image.ts
      module.ts
      user.ts
      workspace.ts
tests/
  unit/
    aiProviderService.test.ts
    domainTypes.test.ts
    fileExportService.test.ts
    sampleWorkspace.test.ts
    sqliteService.test.ts
    workspaceService.test.ts
examples/
  sample-workspace/
    README.md
    game-context/
      AGENTS.md
      CLAUDE.md
      USAGE.md
      README.md
      manifest.yml
      games/
        starfall_workshop/
          INDEX.md
          game.md
          image_catalog.yml
          assets/images/*.svg
          modules/*.md
          contents/*.md
```

当前 GUI 状态：

- 顶部栏显示应用名、工作空间、当前用户、AI 配置状态、导出状态和中英文切换入口。
- 左侧节点树显示当前工作空间、游戏主节点、真实模块节点和当前模块下的真实内容节点；节点行可点击切换当前查看节点，并显示当前查看状态。
- 左侧节点树包含快捷操作入口，可跳转到游戏、图片、模块、内容面板，并复用现有新建模块/内容状态。
- 中间工作台顶部显示推荐路径流程条，按“工作空间 → 游戏 → 图片 → 模块 → 内容”展示完成/当前/待处理状态。
- 中间详情区包含工作空间创建/导入、本地用户、游戏节点、图片库、模块节点和内容节点表单。
- 图片库可上传图片、查看预览、查看引用节点并删除图片。
- 模块和内容面板支持删除，并在危险删除前弹出确认。
- API 配置区可保存本地 API Base URL、API Key、模型名和启用状态，并可测试 mock 或 OpenAI-compatible provider 连接。
- 右侧辅助面板按当前查看节点显示关联图片、当前选中内容/模块/游戏的 MD 预览、字段级 AI 辅助编辑、模块子节点汇总、游戏模块汇总和基础结构列表。
- 当前查看节点优先级为选中内容节点、选中模块节点、游戏主节点；关联图片与 MD 预览会使用同一个节点标题组合展示。
- 右侧关联图片、MD 预览、AI 辅助和基础结构面板已统一为工具面板样式，通知提示使用统一状态色侧边条。
- AI 辅助面板在 API 配置已启用后，可选择当前已保存节点的可编辑文本字段，生成增加/修改/润色候选，并在用户确认后覆盖字段；当当前查看节点为已保存模块时，也可从其三级内容节点生成模块字段汇总候选；当当前查看节点为已保存游戏主节点时，也可从全部二级模块节点生成游戏字段汇总候选。

当前生成的工作空间结构包含：

```text
<selected-folder>/
  game-context/
    AGENTS.md
    CLAUDE.md
    USAGE.md
    README.md
    manifest.yml
    games/
      <game_id>/
        INDEX.md
        game.md
        image_catalog.yml
        assets/
          images/
            <image_id>__<display_name>.<ext>
        modules/
          <module_id>.md
        contents/
          <content_id>.md
```

`manifest.yml`、`INDEX.md`、`image_catalog.yml` 会在游戏、模块、内容节点或图片关联变化时更新。静态 `AGENTS.md`、`CLAUDE.md`、`USAGE.md` 不会因节点变化重复重写。

## 5. 已完成任务

```text
T001 — 项目脚手架初始化
T002 — 领域模型与 TypeScript 类型定义
T003 — 本地数据库与迁移初始化
T004 — 工作空间创建与基础文件结构生成
T005 — 基础 GUI 布局与节点树壳
T006 — 本地用户注册/选择
T007 — 游戏主节点创建、查看、编辑
T008 — 图片上传、重命名、图库管理
T009 — 模块节点 CRUD 与图片关联
T010 — 三级内容节点 CRUD、账号状态字段与 @ 图片引用
T011 — 节点删除与引用安全
T012 — MD 预览与 GUI 组合显示
T013 — API 配置页与 AI Provider 抽象
T014 — AI 字段级增加/修改/润色
T015 — 自下而上汇总：三级到二级
T016 — 自下而上汇总：二级到一级
T017 — 从已有 game-context 文件夹重建索引
T018 — UI 打磨：类 OpenWebUI + 类 XMind 节点管理
T019 — 示例工作空间与 Agent 可读性验证
T020 — 打包与 MVP 收尾
```

T020 验收摘要：

- README 已补齐 MVP 使用说明、构建命令、启动方式、本地数据路径、API key 安全、Agent 读取流程、已知限制和未来计划。
- `package.json` 新增 `start` 脚本，可运行已构建应用。
- `corepack pnpm build` 已确认输出可运行的 Electron/Vite 产物到 `out/`。
- `corepack pnpm start` 已构建应用短启动烟测通过，日志确认 SQLite 初始化成功。
- API key 不写入导出文件的测试覆盖仍通过。
- 未加入云服务、MCP/RAG、自动玩游戏或签名安装包生成，符合 T020 暂不做范围。

## 6. 当前 TODO

下一个任务为：

```text
无。`TASK.md` 中 T001-T020 均已完成。
```

## 7. 最近一次测试结果

本次运行过的命令与结果：

```text
corepack pnpm typecheck
通过。验证 main/preload/renderer TypeScript 接口、API IPC、AI provider 服务、SQLite 服务、导出服务、React UI、README 收尾后的脚本配置和 sample workspace 测试类型均可编译。

corepack pnpm test
通过。当前测试会先使用 tsconfig.test.json 做 TypeScript 校验，再运行 SQLite、工作空间、文件导出、AI provider 和 sample workspace 单元测试。sample workspace 测试验证 manifest、INDEX、frontmatter、README 读取说明、图片路径和 @ 图片引用关系。测试过程中 node:sqlite 会输出 ExperimentalWarning，但命令成功。

corepack pnpm lint
未通过：当前尚未配置 lint 脚本，pnpm 返回 Command "lint" not found。

corepack pnpm build
通过。生产构建已验证 renderer/main/preload 可打包，产物输出到 out/。

已构建应用短启动烟测
通过。通过 `corepack pnpm start` 启动已构建应用并保持运行 8 秒后结束；日志确认 SQLite 初始化成功，路径为 `C:\Users\JT\AppData\Roaming\game-context-manager\game-context-manager.sqlite3`。
```

Electron GUI 全流程人工烟测本次未执行。当前通过单元测试、生产构建和已构建应用短启动烟测验证 MVP 收尾状态。

## 8. 已知问题与风险

1. `pnpm lint` 尚未配置，后续需要决定 ESLint/Prettier 规则。
2. 当前 SQLite 使用 Electron/Node 内置 `node:sqlite`，运行时会输出 ExperimentalWarning；后续如目标运行时不再支持该模块，需要评估替代方案。
3. Windows 本地文件路径、中文图片名、图片上传、删除图片和内容节点 @ 图片引用流程仍需要真实 GUI 人工烟测。
4. API key 已限制为本地 SQLite 配置保存，当前测试覆盖不写入 agent-facing 文件；真实 OpenAI-compatible 服务连接、字段编辑、模块汇总和游戏汇总尚未做人工烟测。
5. T018/T020 已完成基础 UI 打磨和短启动烟测，但仍未做完整 Electron GUI 人工流程烟测；真实窗口下的创建/导入、滚动、节点快捷入口、中英文布局和图片上传仍建议人工检查。
6. 工作空间当前设计为一个 workspace 一个游戏主节点；未来多项目空间暂不实现。
7. 当前删除确认使用浏览器原生确认框；后续 MVP 收尾时可评估是否替换为应用内确认弹窗。
8. 当前仍不做回收站、撤销或历史恢复。
9. T017 已完成已有工作空间导入，但 Electron GUI 人工烟测本次未执行。
10. 当前导入能力面向本软件生成的单游戏 workspace；复杂冲突合并、手写非标准 Markdown 和多游戏 workspace 暂未实现。
11. T019 示例工作空间使用 SVG 占位图片，适合 Agent 可读性验证；真实 PNG/JPG 上传和预览仍需 GUI 人工烟测覆盖。

## 9. 下一步指令

当前 `TASK.md` 已无 TODO。后续如果继续维护，请让 Codex：

1. 阅读 `AGENTS.md`。
2. 阅读本文件全文。
3. 明确新的维护任务或新增 `TASK.md` 条目。
4. 优先处理 lint/format 配置、完整 GUI 烟测、SQLite 替代评估或 OS 安装包打包。
5. 完成后运行可用测试并回写 `CURRENT_STATE.md`。
