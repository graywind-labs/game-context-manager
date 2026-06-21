# AGENTS.md

> 本文件是 Codex 在开发 **Game Context Manager（游戏上下文管理器）** 时必须遵守的工作契约。  
> 它应当足够简洁，便于每次任务都被完整读取；也应足够具体，避免开发方向漂移。UI中需要可以设置中文版和英文版。

## 1. 项目简介

**Game Context Manager（游戏上下文管理器）** 是一个本地优先的桌面 GUI 软件，用于把游戏项目相关信息管理成 Agent 可读取的结构化文件。

本软件本身**不负责**游戏数据分析、生图、自动提优化建议、自动玩游戏、RAG 检索、MCP 服务、云端多人协作或公共项目空间。它的唯一职责是帮助人类创建、规整、查看、编辑、删除、汇总和导出结构化游戏上下文，让其他 Agent 能够稳定使用这些上下文。

最终导出的内容必须是普通 Agent 可以直接读取的文件形态：

- `Markdown + YAML frontmatter`
- `manifest.yml`
- 静态通用使用说明
- 自动生成的单游戏目录索引
- 被引用的图片资源

GUI 是面向人的管理层；导出的文件是面向 Agent 的上下文源。

## 2. 每个 Codex 任务的强制阅读顺序

在实现任何任务之前，Codex 必须按顺序读取：

1. 完整读取 `CURRENT_STATE.md`。
2. 读取 `TASK.md`，找到**第一个状态为 `TODO` 的任务**。
3. 读取 `DESIGN.md` 中与当前任务相关的章节。
4. 读取与当前任务相关的已有源码和文档。
5. 如果当前任务涉及工作流、项目结构、测试或文档规范，则重新读取本 `AGENTS.md`。

除非用户明确指定其他任务，否则 Codex **每次只能实现 `TASK.md` 中第一个 TODO 任务**。
因为终端按本机默认编码会显示成乱码，所以需要你用UTF-8编码来读取项目说明文档。

## 3. 每个任务的固定工作循环

每次执行任务时，Codex 必须按以下流程工作：

1. 从 `TASK.md` 确认当前要执行的 TODO 任务 ID。
2. 检查当前代码、项目结构和相关文档。
3. 只实现满足当前任务所需的最小变更。
4. 运行合适的测试或检查。
5. 回写文档：
   - `TASK.md`：把当前任务状态从 `TODO` 改为 `DONE`，并填写 `验收结果`。
   - `CURRENT_STATE.md`：记录当前状态、已完成任务、测试结果、已知问题、下一个 TODO。
   - `AGENTS.md`：如果项目目录或生成文件结构发生有意义变化，更新本文的目录说明。
6. 如果代码无法运行、无法测试或遇到阻塞，不得把任务标记为 DONE。应保持 `TODO`，并在 `CURRENT_STATE.md` 中写明阻塞原因。

## 4. 开发原则

- 优先做小而可审查的改动。
- 不要编造隐藏需求；如果需求有歧义，选择与 `DESIGN.md` 一致的最小实现。
- 保持本地优先。MVP 不做云同步、公共多人空间或联网协作。
- 绝不硬编码 API key。
- 除非用户显式触发 AI 辅助操作，否则不要把文件或图片发送给外部 AI 服务。
- 尽量保留人的原始输入，规整结果应作为可确认版本，而不是直接覆盖原输入。
- AI 规整、AI 增加内容、AI 修改内容、AI 润色、AI 汇总结果都必须先预览，再由用户确认后写入。
- 生成给 Agent 使用的文件必须在不打开 GUI 的情况下也可阅读、可理解、可使用。
- MVP 阶段不要实现 RAG、MCP、云同步、公共多人工作区、数据分析、生图、自动运营建议或自动玩游戏，除非后续任务明确要求。

## 5. 目标技术栈

除非用户后续明确修改，否则使用以下技术栈：

- 桌面外壳：**Electron**
- 前端渲染层：**React + TypeScript + Vite**
- 样式：**Tailwind CSS**
- 状态/UI：优先使用 React 内置状态；只有确有需要时再加入 Zustand。
- 本地数据库：**SQLite**，优先使用 `better-sqlite3` 或稳定等价方案。
- 文件生成：通过 Electron main process 使用 Node 文件系统 API。
- Markdown / YAML：
  - `gray-matter`：读写 YAML frontmatter
  - `yaml`：生成和更新 `manifest.yml`
  - `remark` / `markdown-it`：只有需要渲染 Markdown 时再加入
- AI Provider 封装：
  - 提供 OpenAI-compatible Chat/Responses 抽象层
  - API URL 和 API key 必须可在 GUI 中配置
  - 不允许硬编码凭证
- 测试：
  - TypeScript 类型检查
  - 数据模型、文件生成器、manifest 生成器的单元测试
  - 在没有自动 E2E 前，保留 GUI 手动冒烟测试记录

## 6. 预期仓库结构

Codex 应逐步把项目演进为以下结构：

```text
/
  AGENTS.md
  DESIGN.md
  TASK.md
  CURRENT_STATE.md
  README.md                         # 在早期脚手架任务中创建

  .npmrc                            # Electron 下载镜像等本地安装配置
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml               # pnpm 构建脚本批准配置
  electron-vite.config.ts
  tsconfig.json
  tsconfig.node.json
  tsconfig.test.json                # 类型级测试配置
  tsconfig.web.json
  tailwind.config.ts
  postcss.config.cjs

  src/
    main/                            # Electron 主进程
      index.ts
      ipc/
        apiIpc.ts                       # API 配置保存、读取和连接测试相关 IPC
        contentIpc.ts                # 三级内容节点创建/编辑与 @ 图片引用校验相关 IPC
        gameIpc.ts                   # 游戏主节点创建/编辑相关 IPC
        imageIpc.ts                  # 图片上传、重命名、图库读取相关 IPC
        moduleIpc.ts                 # 模块节点创建/编辑/删除与图片关联相关 IPC
        userIpc.ts                   # 本地用户创建/选择相关 IPC
        workspaceIpc.ts              # 工作空间创建相关 IPC
      services/
        workspaceService.ts          # 工作区创建、打开、读取
        fileExportService.ts         # MD、manifest、INDEX 等文件生成
        aiProviderService.ts         # AI 规整/润色 API 封装
        sqliteService.ts             # 本地数据库

    preload/                         # Electron preload 桥接层
      index.ts

    renderer/                        # React 前端
      index.html
      src/
        main.tsx
        App.tsx
        components/
          layout/
          tree/
          nodeEditor/
          imageLibrary/
          aiAssist/
        pages/
        styles/

    shared/                          # 前后端共享类型、schema 和工具
      index.ts
      types/
        api.ts                        # API 配置与连接测试 IPC 共享类型
        content.ts                   # 三级内容节点 IPC 共享类型
        domain.ts                    # 核心领域类型
        image.ts                     # 图片上传与图库 IPC 共享类型
        module.ts                    # 模块节点 IPC 共享类型
        user.ts                      # 本地用户 IPC 共享类型
        workspace.ts                 # 工作空间创建结果与 IPC 共享类型
      schemas/
      constants/
        fields.ts                    # 可编辑/不可编辑字段与中英文标签
      utils/

  tests/
    unit/
      aiProviderService.test.ts       # mock AI Provider 与连接测试单元测试
      domainTypes.test.ts            # 领域类型结构测试
      fileExportService.test.ts      # game.md、manifest、INDEX 文件生成测试
      sqliteService.test.ts          # SQLite 迁移与表结构测试
      workspaceService.test.ts       # 工作空间基础文件结构生成测试
    fixtures/

  scripts/
    dev.cjs                          # 清理 Electron 运行环境后启动 electron-vite dev

  examples/
    sample-workspace/                # 可选：生成的示例上下文工作区
```

当前脚手架使用 `electron-vite` 的默认多入口结构，因此 React 代码位于 `src/renderer/src/`，并额外包含 `src/preload/` 以保持 Electron 安全隔离。

如果实际实现与此不同，必须更新本节，并说明原因。

## 7. 生成的上下文工作区结构

当用户创建游戏上下文工作区时，应用应在用户选定文件夹下生成类似结构：

```text
<selected-folder>/
  game-context/
    AGENTS.md                        # 给下游 Agent 使用的静态说明
    CLAUDE.md                        # 给 Claude Code / WorkBuddy 等使用的静态说明
    README.md                        # 给人看的简介
    manifest.yml                     # 自动生成并实时维护的目录
    USAGE.md                         # 静态通用工作流说明，不随节点变化自动改写

    games/
      <game_id>/
        INDEX.md                     # 自动生成的单游戏索引
        game.md                      # 一级游戏主节点
        assets/
          images/
            <image_id>__<display_name>.<ext>
        image_catalog.yml            # 自动生成的图片元数据目录
        modules/
          <module_id>.md             # 二级模块节点
        contents/
          <content_id>.md            # 三级内容/阶段/体验节点
```

下游 `AGENTS.md`、`CLAUDE.md`、`USAGE.md` 是静态工作流文档。除非模板被主动更新，否则它们不应因为节点增删改而每次重写。`manifest.yml`、`INDEX.md`、`image_catalog.yml` 应在节点、图片或关键字段变化时自动更新。

## 8. 测试规则

代码变更后，按可用程度从强到弱运行以下检查：

1. `pnpm typecheck`
2. `pnpm test`
3. `pnpm lint`
4. `pnpm build`

如果某个命令尚不存在，不要假装通过；应在 `CURRENT_STATE.md` 中记录“该命令暂未配置”。

涉及文件生成的任务，至少要包含一个 fixture 或手动生成工作区检查。

涉及 AI 的任务，测试不得要求真实 API key。必须使用 mock。

## 9. 文档更新规则

每个任务完成后必须更新：

- `TASK.md`：将状态从 `TODO` 改为 `DONE`，填写 `验收结果`。
- `CURRENT_STATE.md`：更新以下内容：
  - 已完成任务
  - 当前功能状态
  - 运行过的命令和结果
  - 已知问题
  - 下一个任务
- `AGENTS.md`：如果仓库结构或生成工作区结构发生变化，更新目录说明。
- `DESIGN.md`：只有当实现过程中发现必须澄清的设计变更时才更新。

## 10. 完成定义

一个任务只有同时满足以下条件，才算完成：

- 实现了该任务要求的行为。
- 没有越过 `DESIGN.md` 中规定的产品边界。
- 没有破坏已有行为。
- 已运行相关测试/检查，或者清楚记录了无法运行的原因。
- 已更新 `TASK.md` 和 `CURRENT_STATE.md`。

## 11. 安全与数据规则

- 不得在没有明确操作和确认的情况下删除用户文件。
- 删除节点时，应删除对应 MD 文件并更新 manifest；但不得删除被多个节点共享的图片，除非用户明确删除该图片资源。
- 图片文件名必须根据用户提供的图片名进行清洗和重写。
- 原始图片文件名必须保存在元数据中。
- 生成文件时，在可行情况下使用原子写入，避免中途失败导致文件损坏。
- API key 必须本地保存，且不得提交到仓库。
- 不得把 API key 写入生成的 Markdown 文件。
