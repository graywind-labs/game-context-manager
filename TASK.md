# TASK.md

# Game Context Manager 开发任务表

规则：

- Codex 每次只执行最前面的一个 `TODO` 任务。
- 完成后必须把该任务状态改为 `DONE`。
- 完成后必须填写该任务的 `验收结果`。
- 完成后必须更新 `CURRENT_STATE.md`。
- 后一任务必须建立在前一任务基础上，不要跳步。
- 如果任务无法完成，保持 `TODO`，在 `验收结果` 和 `CURRENT_STATE.md` 记录阻塞原因。

说明：T001-T020 是旧版 MVP 的历史验收记录；从 T021 开始，当前目标以新的两栏 UI、唯一标记工作区、自动 ID、设置内语言/API、自动目录索引导出等 `DESIGN.md` 规则为准。旧任务中的三栏布局、旧式实时目录更新、主界面语言/API 入口等描述不再作为后续实现目标。

---

## T001 — 项目脚手架初始化

**状态**：DONE

### 要做什么

创建基础 Electron + React + TypeScript + Vite 项目结构，并建立最小可运行应用。

需要包括：

- `package.json`
- TypeScript 配置
- Electron main process 入口
- React renderer 入口
- 基础窗口
- 基础样式入口
- README
- 基础命令：
  - `pnpm dev`
  - `pnpm typecheck`
  - `pnpm build`

### 暂不做什么

- 不做数据库。
- 不做节点模型。
- 不做文件生成。
- 不做 AI。
- 不做复杂 UI。

### 验收标准

- `pnpm install` 后能安装依赖。
- `pnpm dev` 能启动一个桌面窗口。
- 窗口显示项目名 `Game Context Manager`。
- `pnpm typecheck` 可运行。
- `pnpm build` 可运行或明确记录尚未配置完成的原因。
- 更新 `CURRENT_STATE.md`。
- 在 `TASK.md` 填写本任务验收结果并改为 DONE。

### 验收结果

已完成基础 Electron + React + TypeScript + Vite + Tailwind 脚手架：

- 创建 `package.json`、`pnpm-lock.yaml`、TypeScript 配置、Electron main/preload 入口、React renderer 入口、Tailwind 样式入口和 README。
- `pnpm install` 已通过；当前 Codex shell 中 `pnpm` 未进入 PATH，实际使用 Corepack 等价命令 `corepack pnpm install` 验证。
- `pnpm dev` 已通过烟测：Vite renderer dev server 启动在 `http://localhost:5173/`，Electron 进程成功启动，并显示 `Game Context Manager` 应用壳。
- `pnpm typecheck` 已通过。
- `pnpm build` 已通过，产物输出到 `out/`。
- `pnpm test` 与 `pnpm lint` 暂未配置，已记录到 `CURRENT_STATE.md`。
- 已补充中英文 README 文案，并在最小 GUI 壳中加入中英文切换入口。

---

## T002 — 领域模型与 TypeScript 类型定义

**状态**：DONE

### 要做什么

在 `src/shared` 中定义核心领域类型：

- `GameNode`
- `ModuleNode`
- `ContentNode`
- `ImageAsset`
- `NodeImageLink`
- `LocalUser`
- `WorkspaceConfig`
- `ApiConfig`

定义枚举：

- `ProjectStage`
- `NodeType`
- `AiEditMode`

定义不可编辑字段与可编辑字段常量。

### 暂不做什么

- 不做 GUI 表单。
- 不做数据库持久化。
- 不做文件写入。

### 验收标准

- 类型能被 `pnpm typecheck` 校验。
- 至少有一个单元测试或类型测试验证必填字段结构。
- 字段与 `DESIGN.md` 保持一致。

### 验收结果

已完成共享领域模型与类型测试：

- 在 `src/shared/types/domain.ts` 定义 `GameNode`、`ModuleNode`、`ContentNode`、`ImageAsset`、`NodeImageLink`、`LocalUser`、`WorkspaceConfig`、`ApiConfig`。
- 定义 `ProjectStage`、`NodeType`、`AiEditMode` 枚举，并在 `src/shared/constants/fields.ts` 提供项目阶段、AI 模式的中英文标签。
- 定义 `EDITABLE_FIELDS` 与 `LOCKED_FIELDS` 常量，并通过 TypeScript `satisfies` 约束字段名必须属于对应节点类型。
- 新增 `tests/unit/domainTypes.test.ts` 类型测试，验证核心模型必填字段结构和字段常量可被类型系统校验。
- 新增 `tsconfig.test.json` 与 `pnpm test` 脚本，当前测试命令执行 TypeScript 类型级单元测试。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm build` 已通过。

## T003 — 本地数据库与迁移初始化

**状态**：DONE

### 要做什么

引入 SQLite，建立本地数据库服务。

需要支持表：

- users
- workspaces
- game_nodes
- module_nodes
- content_nodes
- image_assets
- node_image_links
- api_configs
- edit_history

实现基础迁移机制。

### 暂不做什么

- 不做完整 CRUD GUI。
- 不做 AI。
- 不做 MD 导出。

### 验收标准

- 应用启动时能初始化 SQLite。
- 重复启动不会重复创建错误。
- 有测试或手动记录验证表存在。
- 数据库文件位置清楚记录在 `CURRENT_STATE.md`。

### 验收结果

已完成本地 SQLite 初始化与基础迁移：

- 新增 `src/main/services/sqliteService.ts`，基于 Electron/Node 内置 `node:sqlite` 建立同步 SQLite 服务。
- 初始化 schema version 1，包含 `schema_migrations`、`users`、`workspaces`、`game_nodes`、`module_nodes`、`content_nodes`、`image_assets`、`node_image_links`、`api_configs`、`edit_history`。
- 应用启动时在 Electron main process 初始化数据库，并检查必需表是否存在。
- 数据库默认位置为 Electron `app.getPath('userData')/game-context-manager.sqlite3`；本机烟测路径为 `C:\Users\JT\AppData\Roaming\game-context-manager\game-context-manager.sqlite3`。
- 新增 `tests/unit/sqliteService.test.ts`，创建临时 SQLite 文件，验证所有必需表存在，并重复初始化同一数据库验证迁移不会重复执行出错。
- `pnpm test` 现在会执行 TypeScript 校验和 SQLite 运行时测试。
- 修正生产构建 preload 路径为 `out/preload/index.mjs`，Electron 启动烟测不再出现 preload 缺失错误。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm build` 已通过。
- Electron 短启动烟测已通过，日志确认 SQLite 初始化成功。
- `corepack pnpm lint` 未通过：当前仍未配置 lint 脚本。

---

## T004 — 工作空间创建与基础文件结构生成

**状态**：DONE

### 要做什么

实现选择本地文件夹并创建 `game-context/` 工作空间的能力。

创建后自动生成：

- `game-context/AGENTS.md`
- `game-context/CLAUDE.md`
- `game-context/USAGE.md`
- `game-context/README.md`
- `game-context/manifest.yml`
- `game-context/games/`

### 暂不做什么

- 不做节点完整编辑。
- 不做图片上传。
- 不做 AI。

### 验收标准

- 用户能选择目录创建工作空间。
- 文件结构与 `DESIGN.md` 一致。
- 生成的静态使用说明不依赖具体游戏节点。
- `manifest.yml` 可被 YAML 解析。

### 验收结果

已完成工作空间创建与基础文件结构生成：

- 新增 `src/main/services/workspaceService.ts`，可在用户选择目录下创建 `game-context/`、`games/`、`AGENTS.md`、`CLAUDE.md`、`USAGE.md`、`README.md`、`manifest.yml`。
- 新增 `src/main/ipc/workspaceIpc.ts`，通过 Electron 目录选择对话框选择本地文件夹并创建工作空间。
- preload 安全桥新增 `window.gameContextManager.createWorkspace()`，renderer 最小 GUI 新增“创建工作空间”入口、创建中/成功/取消/失败状态和创建路径展示。
- 生成的静态 `AGENTS.md`、`CLAUDE.md`、`USAGE.md` 为通用工作流说明，不依赖具体游戏节点。
- 初始 `manifest.yml` 使用 `yaml` 库生成，包含 workspace 信息、空 game/modules/contents/images/relations 和任务上下文入口。
- 工作空间创建结果会保存到 SQLite `workspaces` 表。
- 新增 `tests/unit/workspaceService.test.ts`，用临时目录验证基础文件结构生成、静态说明存在、`manifest.yml` 可被 YAML 解析，并验证重复创建不会覆盖已有文件。
- 补充 SQLite 测试覆盖 `saveWorkspace`。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm build` 已通过。
- `corepack pnpm lint` 未通过：当前仍未配置 lint 脚本。

---

## T005 — 基础 GUI 布局与节点树壳

**状态**：DONE

### 要做什么

实现 OpenWebUI 风格的基础布局：

- 顶部栏
- 左侧节点树区域
- 中间节点详情区域
- 右侧辅助面板区域

节点树先支持空状态和占位。

### 暂不做什么

- 不做真实节点 CRUD。
- 不做图片预览。
- 不做 AI。

### 验收标准

- 界面可启动。
- 布局清晰。
- 空工作空间和已选工作空间状态可区分。
- 基础样式可接受。

### 验收结果

已完成基础 GUI 布局与节点树壳：

- 将 renderer 主界面整理为类 OpenWebUI 的三栏工作区：顶部状态栏、左侧节点树区域、中间详情区域、右侧辅助面板区域。
- 顶部栏显示工作空间、当前用户、AI、导出等基础状态，并保留中英文切换。
- 左侧节点树支持空工作空间状态；创建工作空间后显示当前工作空间路径、游戏主节点、模块节点、内容节点占位层级，以及图片库占位。
- 中间详情区区分未选择工作空间与已创建工作空间状态，保留 T004 的创建工作空间入口、取消/错误提示、创建路径与本次创建文件列表。
- 右侧辅助面板提供关联截图、MD 预览、AI 辅助和基础结构占位。
- 未实现真实节点 CRUD、图片预览或 AI，符合 T005 暂不做范围。
- `corepack pnpm typecheck` 已通过；首次运行因未跟踪的 TypeScript 缓存 `tsconfig.web.tsbuildinfo` 写入 EPERM 失败，删除该缓存后通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前仍未配置 lint 脚本。
- `corepack pnpm build` 已通过；首次普通沙箱运行因清空 `out/main/index.js` 权限失败，提升权限重跑后通过。

---

## T006 — 本地用户注册/选择

**状态**：DONE

### 要做什么

实现本地用户创建和选择。

功能：

- 创建本地用户显示名。
- 选择当前用户。
- 当前用户用于后续创建者/最后编辑者自动填充。

### 暂不做什么

- 不做密码。
- 不做联网注册。
- 不做权限系统。

### 验收标准

- 无用户时提示创建用户。
- 创建节点前必须有当前用户。
- 当前用户状态能持久化。

### 验收结果

已完成本地用户注册/选择：

- 新增共享用户 IPC 类型 `UserState`、`CreateLocalUserInput`、`SelectCurrentUserInput`。
- SQLite 服务新增 `getUserState`、`createLocalUser`、`selectCurrentUser`，可创建本地用户、读取用户列表、按最近登录恢复当前用户，并在指定工作空间时持久化 `workspaces.current_user_id`。
- 新增 `src/main/ipc/userIpc.ts`，preload 安全桥暴露 `getUserState`、`createLocalUser`、`selectCurrentUser`。
- 新建工作空间时会把最近选择的当前用户写入 workspace 配置；在已有工作空间中创建或选择用户会更新该工作空间当前用户。
- GUI 顶部栏显示当前用户；详情区新增本地用户面板，无用户时提示创建用户，有用户时可选择当前用户。
- 工作空间节点树在没有当前用户时显示“先选择当前用户后创建游戏主节点”，为 T007 的节点创建前置约束提供 UI 状态。
- SQLite 单元测试已覆盖本地用户创建、显示名 trim、当前用户恢复、工作空间 `current_user_id` 写入和服务重启后的持久化读取。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T007 — 游戏主节点创建、查看、编辑

**状态**：DONE

### 要做什么

实现一级游戏节点：

- 创建游戏主节点。
- 一个工作空间只能创建一个。
- 表单字段符合 `DESIGN.md`。
- 创建者自动填充。
- 最后编辑者自动更新。
- 生成 `games/<game_id>/game.md`。
- 更新 manifest 和 INDEX。

### 暂不做什么

- 不做二级/三级节点。
- 不做 AI 编辑。
- 不做主图上传。

### 验收标准

- 能创建一个游戏节点。
- 不能创建第二个游戏节点。
- 能编辑可编辑字段。
- 结构字段不能编辑。
- MD 输出正确。
- manifest 更新正确。

### 验收结果

已完成游戏主节点创建、查看、编辑：

- 新增游戏节点共享 IPC 类型、Electron IPC 与 preload 安全桥，GUI 可读取、创建、更新当前工作空间的一级游戏节点。
- SQLite 服务新增 `getWorkspace`、`getGameNode`、`createGameNode`、`updateGameNode`，通过 `game_nodes.workspace_id` 唯一约束和服务层检查保证一个工作空间只能创建一个游戏主节点。
- 创建游戏节点时必须已有当前用户；创建者自动写入当前用户，编辑时最后编辑者自动更新为当前用户。
- GUI 中新增一级游戏节点表单，支持创建时填写/自动生成节点 ID，创建后节点 ID、创建者、最后编辑者、创建时间、更新时间等结构字段仅展示不可编辑。
- 新增 `fileExportService`，创建/编辑后写出 `games/<game_id>/game.md`、`games/<game_id>/INDEX.md`、空 `image_catalog.yml`，并创建 `modules/`、`contents/`、`assets/images/` 基础目录。
- `manifest.yml` 会随游戏节点创建/编辑更新 `game` 入口、生成时间和路径；右侧面板显示生成后的 `game.md` 预览。
- SQLite 单元测试覆盖创建游戏节点、阻止第二个游戏节点、编辑可编辑字段且不改变结构 ID/创建者、工作空间 `active_game_id` 持久化。
- 文件导出单元测试覆盖 `game.md` frontmatter/正文、`INDEX.md`、`image_catalog.yml`、目录结构和 `manifest.yml` YAML 解析。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T008 — 图片上传、重命名、图库管理

**状态**：DONE

### 要做什么

实现图片资产上传。

功能：

- 上传图片前必须填写图片名。
- 根据图片名生成安全文件名。
- 保留原始文件名。
- 存入 `assets/images/`。
- 生成/更新 `image_catalog.yml`。
- GUI 可查看图片。
- 图片可暂不关联任何节点。

### 暂不做什么

- 不做节点图片关联。
- 不做图片删除。
- 不做 OCR。

### 验收标准

- 上传乱码文件名图片后，实际文件名被替换为安全名称。
- 图片元数据保存。
- GUI 能预览图片。
- `image_catalog.yml` 更新。

### 验收结果

已完成图片上传、重命名、图库管理基础能力：

- 新增图片共享 IPC 类型、Electron IPC 与 preload 安全桥，GUI 可在创建游戏主节点后上传图片资产。
- 上传图片前必须填写图片名；未选择当前用户、未创建游戏主节点或图片名为空时会在 GUI 提示。
- main process 通过本地文件选择对话框选择图片，只支持 `png/jpg/jpeg/webp/gif`，不会把图片发送到外部服务。
- 上传后根据用户填写的图片名生成安全文件名，保存到 `games/<game_id>/assets/images/<image_id>__<display_name>.<ext>`；原始文件名保存在 SQLite 元数据和 `image_catalog.yml` 中。
- SQLite 服务新增图片资产创建与读取能力，写入 `image_assets` 表，图片可暂不关联任何节点。
- `fileExportService` 会生成/更新 `image_catalog.yml`、`manifest.yml` 的 images 入口，并在 `INDEX.md` 中列出图片资产。
- GUI 中新增图片库表单、图片卡片列表和右侧图片预览，可查看图片名、图片 ID、原始文件名、生成路径和备注。
- 单元测试已覆盖乱码原始文件名保留、安全相对路径、图片元数据持久化、`image_catalog.yml` 与 `manifest.yml` 图片入口生成。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T009 — 模块节点 CRUD 与图片关联

**状态**：DONE

### 要做什么

实现二级模块节点：

- 在游戏节点下创建模块。
- 编辑模块字段。
- 删除模块。
- 关联/取消关联图片。
- 生成 `modules/<module_id>.md`。
- 更新 manifest 和 INDEX。

### 暂不做什么

- 不做三级节点。
- 不做 AI。
- 删除模块时先只允许无子节点模块，后续再处理级联。

### 验收标准

- 模块创建时自动填充所属游戏、版本、创建者。
- 可关联多张图片。
- 多个模块可关联同一图片。
- MD 中包含关联截图列表。
- 删除模块更新目录。

### 验收结果

已完成模块节点 CRUD 与图片关联：

- 新增模块节点共享 IPC 类型、Electron IPC 与 preload 安全桥，GUI 可读取、创建、编辑、删除当前工作空间下的二级模块节点。
- SQLite 服务新增 `getModuleNodes`、`getModuleNode`、`createModuleNode`、`updateModuleNode`、`deleteModuleNode`、`getNodeImageLinks`，模块创建时自动使用当前游戏 ID、当前游戏版本快照和当前用户作为创建者/最后编辑者。
- 模块图片关联使用 `node_image_links` 多对多表；保存模块时会替换该模块的关联图片列表，支持一张图片被多个模块同时关联，也支持取消关联。
- 删除模块会删除模块数据库记录和模块图片关联；当前按 T009 范围只允许删除无三级内容子节点的模块，不删除图片资产。
- `fileExportService` 新增模块 MD 生成、删除模块 MD、模块 MD 预览能力；模块保存后生成 `games/<game_id>/modules/<module_id>.md`，正文包含关联截图列表。
- `manifest.yml`、`games/<game_id>/INDEX.md`、`image_catalog.yml` 会随模块创建、编辑、删除和图片关联变化更新，图片 `linked_nodes` 会记录关联模块。
- GUI 左侧节点树显示真实模块列表，中间区域新增模块表单、模块选择、新建、删除和图片复选关联，右侧 MD 预览优先显示选中模块的 Markdown。
- 单元测试已覆盖模块创建时自动填充所属游戏/版本/创建者、多个模块关联同一图片、取消关联、删除模块清理关联、模块 MD 关联截图列表、manifest/INDEX/image_catalog 更新。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T010 — 三级内容节点 CRUD、账号状态字段与 @ 图片引用

**状态**：DONE

### 要做什么

实现三级内容节点：

- 在模块下创建内容节点。
- 支持账号状态字段。
- 支持多图片关联。
- 过程说明中支持 `@image_id` 或 `@图片名`。
- 校验 @ 引用必须来自已关联图片。
- 生成 `contents/<content_id>.md`。
- 更新 manifest 和 INDEX。

### 暂不做什么

- 不做复杂 Markdown 编辑器。
- 不做自动补全图片 @。
- 不做 AI。

### 验收标准

- 可创建多个内容节点。
- 可关联多图。
- 合法 @ 引用可保存。
- 非法 @ 引用有提示。
- 输出 MD 正确。

### 验收结果

已完成三级内容节点 CRUD（创建、查看、编辑）与导出：

- 新增内容节点共享类型、Electron IPC、preload 桥接和 GUI 内容节点面板，可在选中模块下创建和编辑多个三级内容节点。
- 内容节点支持账号状态字段：创角天数、累计付费金额、最大主线通关数、角色等级。
- 内容节点支持多图片关联，关系写入 `node_image_links`，同一图片可同时关联模块和内容节点。
- 过程说明支持 `@image_id` 或 `@图片名`；保存时校验引用必须来自当前内容节点已关联图片，非法引用会返回错误提示，不会静默写出无效引用。
- 新增 `contents/<content_id>.md` 导出，frontmatter、账号状态、关联截图和过程说明输出符合设计。
- `manifest.yml`、`INDEX.md`、`image_catalog.yml` 会随内容节点创建/编辑更新，图片 `linked_nodes` 包含 `content:<content_id>`。
- 单元测试已覆盖内容节点创建、编辑、合法/非法 @ 图片引用、多图关联路径、内容 MD、manifest、INDEX 和 image_catalog 更新。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T011 — 节点删除与引用安全

**状态**：DONE

### 要做什么

完善删除逻辑：

- 删除三级节点。
- 删除二级节点并级联删除子内容节点。
- 删除图片资产。
- 图片被引用时显示引用列表并二次确认。
- 删除节点不删除图片资产。
- 删除图片会从相关节点取消关联并更新文件。

### 暂不做什么

- 不做回收站。
- 不做撤销。
- 不做历史恢复。

### 验收标准

- 删除后数据库和文件一致。
- manifest、INDEX、image_catalog 更新。
- 不会产生悬空图片引用。
- 删除危险操作有确认。

### 验收结果

已完成节点删除与引用安全：

- 新增三级内容节点删除能力，删除后会移除数据库记录、节点图片关联和 `contents/<content_id>.md`，并更新 `manifest.yml`、`INDEX.md`、`image_catalog.yml`。
- 二级模块节点删除改为级联删除其所有三级内容节点，删除模块 MD、子内容 MD 和相关节点图片关联，但保留图片资产。
- 新增图片资产删除能力，GUI 会显示图片引用节点列表；删除前二次确认，删除后移除图片文件、数据库图片记录和所有节点图片关联。
- 删除图片时会清理相关内容节点过程说明里的 `@image_id` / `@图片名` 引用，避免生成悬空图片引用。
- 删除节点不会删除图片资产；删除图片会重写相关节点 MD、`manifest.yml`、`INDEX.md` 和 `image_catalog.yml`。
- GUI 增加模块、内容、图片删除按钮与中英文确认文案，图片卡片显示当前引用列表。
- 单元测试已覆盖内容删除、模块级联删除、图片删除解除关联、清理 @ 引用、文件删除和索引更新。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm lint` 未通过：当前仍未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T012 — MD 预览与 GUI 组合显示

**状态**：DONE

### 要做什么

让 GUI 在查看节点时同时展示：

- 表单字段
- 关联图片
- 生成后的 MD 预览

图片与 MD 在实际文件结构中分离，但在 GUI 中组合展示。

### 暂不做什么

- 不做富文本编辑器。
- 不做复杂 diff。

### 验收标准

- 选择任意节点都能看到字段。
- 有关联图片时能一起显示。
- 能看到将写给 Agent 的 MD 预览。

### 验收结果

已完成 MD 预览与 GUI 组合显示：

- 右侧辅助面板现在按当前查看节点组合展示内容：优先显示选中的三级内容节点，其次显示选中的二级模块节点，最后显示游戏主节点。
- 关联截图面板不再展示全图库，而是只展示当前节点关联的图片；内容和模块使用 `imageIds`，游戏节点使用主图 ID 匹配图片资产。
- 关联图片卡片显示预览图、图片显示名、`@image_id` 和生成后的相对路径，便于与 MD 中的引用对照。
- MD 预览面板与关联截图面板使用同一个当前节点标题，展示当前节点将写给 Agent 的 Markdown 预览。
- 表单字段仍在中间详情区展示，可编辑字段、结构字段、关联图片选择和右侧 MD/图片预览可同时查看。
- 未引入富文本编辑器或复杂 diff，符合 T012 暂不做范围。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前仍未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T013 — API 配置页与 AI Provider 抽象

**状态**：DONE

### 要做什么

实现 API 配置：

- API Base URL
- API Key
- 模型名
- 启用/禁用 AI
- 测试连接按钮

实现 AI provider 接口和 mock provider。

### 暂不做什么

- 不做 AI 编辑功能。
- 不把 API key 写入 MD。
- 不要求真实 API key 才能测试。

### 验收标准

- 配置可保存到本地。
- mock provider 可用于后续测试。
- API key 不出现在导出的 MD 文件中。

### 验收结果

已完成 API 配置页与 AI Provider 抽象：

- 新增共享 API 配置 IPC 类型，包含保存配置输入、配置状态和连接测试结果。
- SQLite 服务新增默认 API 配置读写能力，保存 API Base URL、API Key、模型名和启用状态到本地 `api_configs` 表。
- 新增 `aiProviderService`，定义 `AiProvider` 接口，并实现 `mock://` mock provider 和 OpenAI-compatible provider 的连接测试入口。
- 新增 API IPC 与 preload 安全桥，renderer 可读取配置、保存配置并执行连接测试。
- GUI 新增中英文 API 配置区域，可编辑 API Base URL、API Key、模型名、启用/禁用 AI，并可使用 mock provider 测试连接；顶部 AI 状态会显示未配置、已保存未启用或已启用。
- 右侧 AI 面板显示当前 API 配置状态和最近一次 mock/真实 provider 测试结果，但仍不实现 AI 编辑功能，符合 T013 范围。
- API key 只保存在本地数据库，不写入导出的 Markdown、manifest、INDEX 或 image_catalog；文件导出测试已增加断言。
- 新增 mock provider 单元测试，测试不需要真实 API key。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前仍未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T014 — AI 字段级增加/修改/润色

**状态**：DONE

### 要做什么

实现 AI 辅助编辑：

- 增加内容
- 修改内容
- 润色

流程：

- 选择字段。
- 输入用户说明。
- AI 生成候选版本。
- 展示原文、新文、差异。
- 用户确认后覆盖字段。
- 更新最后编辑者。

### 暂不做什么

- 不做整节点自动创建。
- 不做子节点汇总。
- 不做批量 AI。

### 验收标准

- 三种模式都有明确提示词。
- AI 输出不会直接覆盖，必须确认。
- mock provider 下可测试完整流程。
- 确认后 MD 和 manifest 按需更新。

### 验收结果

已完成字段级 AI 增加/修改/润色：

- `AiProvider` 新增字段级候选生成接口，支持 `add`、`modify`、`polish` 三种模式，并为每种模式提供独立提示词约束。
- `mock://local` mock provider 可在不需要真实 API key 的情况下生成确定性候选，测试覆盖三种模式和提示词关键约束。
- API IPC 和 preload 新增 `generateAiFieldEdit`，只有保存并启用 API 配置后才会发起 AI 编辑请求。
- 右侧 AI 辅助面板可基于当前已保存节点选择可编辑文本字段、输入用户说明、生成候选版本，并展示原文、新文和逐行 diff。
- AI 输出不会直接覆盖字段；只有点击“确认覆盖”后才会写入当前字段。
- 确认覆盖复用现有游戏/模块/内容节点保存流程，因此会更新最后编辑者、对应 Markdown、`INDEX.md` 和 `manifest.yml`。
- 未实现整节点自动创建、子节点汇总或批量 AI，符合 T014 范围。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T015 — 自下而上汇总：三级到二级

**状态**：DONE

### 要做什么

实现根据模块下三级内容汇总更新二级模块。

汇总字段：

- 模块定位
- 系统规则
- 资源产出/消耗
- 玩家主要操作
- 乐趣点（主观）
- 主要问题（主观）
- 优化方向（主观）

流程：

- 用户在模块节点点击“从子节点汇总”。
- 系统收集该模块所有三级子节点。
- AI 生成候选父节点字段。
- 用户确认后覆盖。

### 暂不做什么

- 不做自动定时汇总。
- 不做一级游戏汇总。

### 验收标准

- 只补充为主，不随意删除已有内容。
- 输出需要预览和确认。
- mock provider 可测试。

### 验收结果

已完成三级内容到二级模块的自下而上汇总：

- `AiProvider` 新增模块汇总候选接口，支持根据当前模块和其所有三级内容节点生成 7 个二级模块字段候选。
- 汇总 prompt 明确要求以补充父节点为主、默认保留已有父节点内容、不随意删除信息、不编造游戏事实，并保持主观字段的主观性。
- `mock://local` mock provider 支持模块汇总，可在无真实 API key 情况下生成确定性候选并覆盖单元测试。
- API IPC 和 preload 新增 `generateAiModuleSummary`；main process 会从 SQLite 收集当前模块与所有子内容节点后再发起 AI 请求。
- 右侧 AI 辅助面板在选中已保存模块时提供“从子节点汇总”，展示每个目标字段的原文、新文和 diff。
- 用户确认后一次性覆盖模块定位、系统规则、资源产出/消耗、玩家主要操作、乐趣点、主要问题和优化方向，并复用现有模块保存流程更新最后编辑者、模块 MD、`INDEX.md` 和 `manifest.yml`。
- 未实现自动定时汇总或一级游戏汇总，符合 T015 范围。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T016 — 自下而上汇总：二级到一级

**状态**：DONE

### 要做什么

实现根据所有模块节点汇总更新游戏主节点。

汇总字段：

- 核心玩法
- 主要乐趣
- 主要优化方向
- 当前主要问题

流程：

- 用户在游戏节点点击“从模块汇总”。
- 系统收集所有二级模块。
- AI 生成候选游戏字段。
- 用户确认后覆盖。

### 暂不做什么

- 不做跨游戏汇总。
- 不做自动定时汇总。

### 验收标准

- 只补充为主。
- 不随意删除游戏主节点已有内容。
- 用户确认后覆盖。
- MD 和目录更新。

### 验收结果

已完成二级模块到一级游戏主节点的自下而上汇总：

- `AiProvider` 新增游戏汇总候选接口，支持根据当前游戏和所有二级模块节点生成 4 个一级游戏字段候选。
- 汇总字段包括核心玩法、主要乐趣、主要优化方向、当前主要问题。
- 汇总 prompt 明确要求以补充父节点为主、默认保留已有游戏主节点内容、不随意删除信息、不编造游戏事实，并保持主观字段的主观性。
- `mock://local` mock provider 支持游戏汇总，可在无真实 API key 情况下生成确定性候选并覆盖单元测试。
- API IPC 和 preload 新增 `generateAiGameSummary`；main process 会从 SQLite 收集当前游戏和所有二级模块节点后再发起 AI 请求。
- 右侧 AI 辅助面板在选中已保存游戏主节点时提供“从模块汇总”，展示每个目标字段的原文、新文和 diff。
- 用户确认后一次性覆盖核心玩法、主要乐趣、主要优化方向、当前主要问题，并复用现有游戏保存流程更新最后编辑者、`game.md`、`INDEX.md` 和 `manifest.yml`。
- 未实现跨游戏汇总或自动定时汇总，符合 T016 范围。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T017 — 从已有 game-context 文件夹重建索引

**状态**：DONE

### 要做什么

实现导入已有工作空间：

- 选择已有 `game-context/`。
- 读取 manifest。
- 如果 manifest 缺失，尝试扫描 MD frontmatter。
- 重建 SQLite 索引。
- 恢复 GUI 节点树。

### 暂不做什么

- 不做复杂冲突合并。
- 不做云同步。

### 验收标准

- 能导入本软件生成的工作空间。
- 能恢复游戏、模块、内容、图片关系。
- 缺失文件有明确错误提示。

### 验收结果

已完成已有 `game-context/` 工作空间导入与 SQLite 索引重建：

- 新增工作空间导入服务，可选择已有 `game-context/` 文件夹或其父目录。
- 导入时优先读取 `manifest.yml` 中记录的 game/module/content/image 路径；如果 `manifest.yml` 缺失或没有对应条目，会扫描 `games/<game_id>/game.md`、`modules/*.md`、`contents/*.md` 和 `image_catalog.yml`。
- Markdown 解析使用 YAML frontmatter 恢复结构字段，并从本软件生成的中文二级标题中恢复游戏、模块和内容正文字段。
- 新增 SQLite `replaceWorkspaceSnapshot`，可在事务中重建当前 workspace 的用户、游戏、模块、内容、图片和节点图片关联索引。
- 导入会补齐 frontmatter 和图片目录中引用到的本地用户 ID，避免外键缺失。
- GUI 新增“导入已有工作空间”入口，导入成功后会刷新用户、游戏、图片、模块、内容状态并恢复左侧节点树。
- 缺失引用文件、缺失 frontmatter、缺失必要字段会抛出明确错误路径或字段名。
- 单元测试覆盖：用本软件导出的 `game-context/` 重新导入，验证游戏、模块、内容、图片和图片关联能写回 SQLite 并恢复。
- 未实现复杂冲突合并、云同步或多游戏工作空间导入，符合 T017 范围。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T018 — UI 打磨：类 OpenWebUI + 类 XMind 节点管理

**状态**：DONE

### 要做什么

优化界面体验：

- 左侧树更接近 XMind 的清晰节点操作。
- 节点创建入口更便捷。
- 图片和 MD 组合显示更美观。
- 表单分组更清晰。
- 全局通知和错误提示更统一。

### 暂不做什么

- 不做大型设计系统。
- 不做复杂动画。

### 验收标准

- 新用户能直观看到“先建工作空间→建游戏→传图→建模块→建内容”的路径。
- 节点树管理高频操作不繁琐。
- 视觉风格干净稳定。

### 验收结果

已完成 UI 打磨：

- 左侧节点树改为可点击的层级按钮，支持从树上切换游戏、模块和内容节点，当前查看节点会显示明确状态。
- 左侧新增快捷操作区，可快速跳转到游戏、图片、模块和内容面板；模块和内容快捷入口会复用现有新建表单状态。
- 中间工作台新增“推荐路径”流程条，按工作空间、游戏、图片、模块、内容展示完成/当前/待处理状态，方便新用户理解使用路径。
- 更新中英文文案，去除早期占位说明，改为当前真实 MVP 流程描述。
- 模块、内容和游戏表单中的关联图片、账号状态、结构字段分组统一为浅底分组样式，层次更清晰。
- 右侧辅助面板、关联图片、MD 预览和通知样式统一为更稳定的工具面板视觉；通知增加状态色侧边条。
- 未引入大型设计系统或复杂动画，符合 T018 范围。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T019 — 示例工作空间与 Agent 可读性验证

**状态**：DONE

### 要做什么

创建一个小型示例工作空间，包含：

- 一个游戏节点
- 两个模块节点
- 两张图片
- 两个三级内容节点
- manifest
- INDEX
- 静态使用说明

并写一个验证说明：外部 Agent 应如何读取。

### 暂不做什么

- 不做真实业务数据。
- 不做 RAG。

### 验收标准

- 示例工作空间可生成。
- 文件路径正确。
- README 说明如何让 Codex/Claude Code 读取。
- 至少人工检查一次 MD 可读性。

### 验收结果

已完成示例工作空间与 Agent 可读性验证：

- 新增 `examples/sample-workspace/game-context/`，包含一个游戏节点 `starfall_workshop`、两个模块节点、两个三级内容节点和两张示例 SVG 图片资源。
- 示例包含 `manifest.yml`、`games/starfall_workshop/INDEX.md`、`image_catalog.yml`、节点 Markdown 和静态 `AGENTS.md`、`CLAUDE.md`、`USAGE.md`、`README.md`。
- 新增 `examples/sample-workspace/README.md`，说明 Codex 应先读 `AGENTS.md`、`manifest.yml`、`USAGE.md` 和 `INDEX.md`，Claude Code / WorkBuddy 应先读 `CLAUDE.md` 和 `manifest.yml`。
- README 已记录 2026-06-22 人工可读性检查：路径完整、Markdown frontmatter 可读、内容节点 `@image_id` 只引用已关联图片、图片资源可直接打开。
- 新增 `tests/unit/sampleWorkspace.test.ts`，验证示例 manifest、INDEX、节点 frontmatter、图片路径、README 读取说明和 `@image_id` 引用关系。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T020 — 打包与 MVP 收尾

**状态**：DONE

### 要做什么

完成 MVP 收尾：

- 修复已知关键 bug。
- 补充 README 使用说明。
- 确认构建命令。
- 确认本地数据路径。
- 确认不泄露 API key。
- 梳理未来计划。

### 暂不做什么

- 不做云服务。
- 不做 MCP/RAG。
- 不做自动玩游戏。

### 验收标准

- 应用可本地启动。
- 主要 MVP 流程可走通。
- 文档完整。
- `CURRENT_STATE.md` 记录最终状态。

### 验收结果

已完成 MVP 收尾：

- 补充 `README.md`，覆盖当前 MVP 能力、产品边界、依赖安装、开发启动、生产构建、已构建应用启动、本地数据路径、API/AI 安全、Agent 读取流程、已知限制和未来计划。
- 在 `package.json` 新增 `start` 脚本，支持 `corepack pnpm build` 后通过 `corepack pnpm start` 启动已构建 Electron 应用。
- 确认构建命令为 `corepack pnpm build`，当前输出到 `out/main`、`out/preload` 和 `out/renderer`；当前仓库生成可运行 Electron/Vite 产物，不生成签名安装包。
- 确认本地 SQLite 默认路径为 Electron `app.getPath('userData')/game-context-manager.sqlite3`；本机启动烟测路径为 `C:\Users\JT\AppData\Roaming\game-context-manager\game-context-manager.sqlite3`。
- 确认 API key 只保存到本地 SQLite；文件导出测试继续覆盖不写入 `game.md`、`manifest.yml`、`INDEX.md`、`image_catalog.yml` 和内容 MD。
- 复查当前已知问题，未发现必须阻塞 MVP 的新增关键 bug；`pnpm lint` 未配置、`node:sqlite` ExperimentalWarning 和真实 GUI 全流程人工烟测仍记录为后续风险。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；测试中 `node:sqlite` 仍会输出 ExperimentalWarning。
- `corepack pnpm lint` 未通过：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- 已用已构建产物执行短启动烟测：`corepack pnpm start` 进程保持运行 8 秒，日志确认 SQLite 初始化成功。

---

## T021 — 新版工作区标记、文件结构与导入基础

**状态**：DONE

### 要做什么

把工作区基础从旧版固定 `game-context/` 外层目录迁移为新版结构：

- 在用户选择的文件夹中写入唯一标记 `.game-context-manager.yml`。
- 创建主节点时，在所选文件夹中创建以主节点名称清洗后的主节点文件夹。
- 主节点文件写入 `<game_folder_name>/game.md`。
- 模块与内容文件目标路径调整为：
  - `<game_folder_name>/modules/<module_id>/module.md`
  - `<game_folder_name>/modules/<module_id>/contents/<content_id>.md`
- 增加程序自动分配 ID 的服务或工具，节点/图片创建时不再要求用户输入 ID。
- 导入工作区时识别唯一标记：无标记或多个标记都必须失败并给出明确错误。
- 更新 SQLite 工作区记录，以保存标记信息、主节点文件夹名和新版路径。
- 更新相关单元测试和 fixture。

### 暂不做什么

- 不重构完整 UI。
- 不实现拖拽/粘贴上传。
- 不实现 AI 弹窗新交互。
- 不实现右键打开文件夹。

### 验收标准

- 创建主节点时能生成 `.game-context-manager.yml` 和 `<game_folder_name>/game.md`。
- 模块、内容、图片路径符合新版结构。
- 创建节点和图片时 ID 由程序自动生成，创建输入类型和 GUI 状态不再暴露手填 ID。
- 导入时只有读取到一个合法标记才成功，无标记/多个标记失败。
- 旧版 `game-context/` 路径不再作为新建工作区的默认输出结构。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过或明确记录阻塞。

### 验收结果

已完成。

- 工作区创建改为在用户选择的文件夹根目录写入 `.game-context-manager.yml`，不再默认生成旧版 `game-context/` 外层目录。
- SQLite 工作区记录增加 marker 路径与主节点文件夹名；新建主节点后保存 `active_game_folder_name`，marker 回写 `main_node_id` 和 `main_node_folder_name`。
- 节点与图片创建改为程序自动分配顺序 ID：`game_001`、`module_001`、`content_001`、`image_001`。当前旧 UI 创建表单不再显示或提交手填节点 ID。
- 节点与图片文件路径迁移为新版结构：`<game_folder_name>/game.md`、`<game_folder_name>/modules/<module_id>/module.md`、`<game_folder_name>/modules/<module_id>/contents/<content_id>.md`、`<game_folder_name>/assets/images/...`。
- 导入工作区时递归扫描 `.game-context-manager.yml`：无合法 marker 会失败，多个合法 marker 会失败，恰好一个合法 marker 才允许导入；marker-only 空工作区也可导入。
- 已更新 SQLite、工作区导入、文件导出相关单元测试，覆盖新版 marker、路径和自动 ID。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm build` 已通过。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。

---

## T022 — 手动 Agent 文件导出与目录索引导出

**状态**：DONE

### 要做什么

把旧版实时自动目录更新改为用户主动导出：

- 新增或重构导出服务，支持手动导出根目录 `AGENTS.md` / `CLAUDE.md`。
- 新增或重构目录导出服务，点击导出时生成/更新：
  - 根目录 `manifest.yml`
  - 主节点文件夹内 `INDEX.md`
  - 主节点文件夹内 `image_catalog.yml`
- 节点保存、图片上传、图片关联、节点删除时不再实时重写目录索引文件。
- 在数据库或 UI 状态中记录“目录索引可能过期/需要导出”。
- 更新导入逻辑，使其能读取手动导出的索引，也能在索引缺失时从节点 Markdown 与图片目录重建。
- 更新文件导出测试，覆盖 API key 不进入任何导出文件。

### 暂不做什么

- 不做完整左侧 UI 导出按钮。
- 不做索引文件详情预览。

### 验收标准

- 主动调用导出 AGENTS/CLAUDE 后，文件生成在工作区根目录，与主节点文件夹同级。
- 主动调用导出当前目录后，`manifest.yml`、`INDEX.md`、`image_catalog.yml` 生成在新版目标路径。
- 保存节点或上传图片不会自动刷新目录索引。
- 测试覆盖目录过期状态或等价提示状态。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过或明确记录阻塞。

### 验收结果

已完成。

- 新增显式导出能力：`exportAgentInstructionFiles` 可在工作区根目录手动生成 `AGENTS.md` / `CLAUDE.md`；`exportDirectoryIndexFiles` 可手动生成根目录 `manifest.yml`、主节点文件夹内 `INDEX.md` 和 `image_catalog.yml`。
- 新增 `exportIpc.ts` 和 preload 安全桥：后续 UI 可主动调用“导出 AGENTS/CLAUDE”和“导出当前目录”。导出当前目录成功后会清除目录索引过期状态。
- 节点保存、模块/内容删除、图片上传、图片删除不再自动重写 `manifest.yml`、`INDEX.md`、`image_catalog.yml`；节点 Markdown 仍在保存时写入，图片删除后仍会重写受影响节点 Markdown 以清理 `@image_id` 引用。
- SQLite schema 升级到 v3，工作区增加 `directory_index_needs_export` 状态；节点、图片和关联变更会标记需要重新导出，手动目录导出后恢复为 false。
- 导入逻辑仍优先读取手动导出的 `manifest.yml` / `image_catalog.yml`，索引缺失时可从 `game.md`、模块/内容 Markdown 和 `assets/images` 目录重建，并把工作区标记为需要重新导出。
- 文件导出、SQLite、工作区导入测试已更新，覆盖保存节点不自动生成索引、主动导出生成目标文件、删除后索引保持旧内容直到再次导出、目录过期状态，以及导出文件不包含 API key。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T039 — 仅导出 AGENTS.md 并防止覆盖现有不同内容

**状态**：DONE

### 要做什么

- 停止创建、手动导出、导入识别和左侧展示 `CLAUDE.md`。
- 自动或手动生成前，若根目录已有内容不同于内置模板的 `AGENTS.md`，必须中止写入。
- 发生冲突时弹窗告知用户先手动删除现有 `AGENTS.md`，避免误覆盖。
- 同步 manifest、示例、测试和文档。

### 验收结果

已完成。

- `fileExportService` 现在只生成 `AGENTS.md`；同路径已有不同内容时抛出 `AGENTS_FILE_CONFLICT`，不写入文件。
- 创建主节点会在写入节点和数据库前预检该冲突；手动导出同样受保护。GUI 会弹出中英文提示，要求用户手动删除旧文件后再试。
- `CLAUDE.md` 已从可识别文件类型、文件树、manifest、工作区摘要和示例工作区中移除；历史工作区中的该文件不会被自动删除。
- 单元测试覆盖仅导出 `AGENTS.md` 以及冲突时保留用户原文件内容。
- `corepack pnpm typecheck` 和 `corepack pnpm test` 已通过。
- 修复冲突提示弹窗重复显示两个“知道了”按钮的问题；信息提示没有取消操作时只显示一个确认按钮。
- 内置导出的中文 `AGENTS.md` 已加入 UTF-8 读取提醒，并为英文导出和示例提供对应说明。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。

---

## T023 — 登录门槛、设置模型与 API 启用逻辑清理

**状态**：DONE

### 要做什么

实现应用级登录门槛和设置数据模型：

- 应用启动时读取本地用户状态和最近登录用户。
- 没有可恢复当前用户时，强制显示登录/创建用户弹窗；未登录时主体不可操作。
- 设置中支持退出当前账号；退出后回到主界面必须再次弹出登录弹窗。
- 设置中支持语言选择，下拉切换中文/英文。
- 设置中支持 API Base URL、API Key、模型名、测试连接。
- 从共享类型、SQLite、IPC、AI provider 和 UI 中移除“启用 AI 辅助”复选框/字段/状态文案。
- AI 功能默认可触发；若 API 未配置、配置不完整或连接失败，在用户点击 AI 功能时提示不可用。

### 暂不做什么

- 不做完整两栏布局。
- 不做 AI 新弹窗。
- 不做复杂权限角色。

### 验收标准

- 无用户或无最近登录用户时，必须先登录才能操作主体。
- 创建本地用户后可进入应用，并持久化最近登录状态。
- 退出账号后再次要求登录。
- 设置中可以切换语言，但主界面不再有语言切换按钮。
- API 配置不再包含 enabled/enabledState/启用 AI 等字段或文案。
- AI provider 测试不需要真实 API key，mock 仍可用。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过或明确记录阻塞。

### 验收结果

已完成。

- 应用启动会读取本地用户状态；只有存在 `last_login_at` 的最近登录用户才会自动恢复。无用户或退出后无可恢复用户时，前端强制显示本地用户登录/创建弹窗，主体被遮罩不可操作。
- 新增设置数据模型与 IPC：SQLite schema 升级到 v4，新增 `app_settings` 保存语言偏好；新增 `settingsIpc.ts` 支持读取/保存语言和退出账号。
- 设置弹窗支持中文/英文下拉切换、退出当前账号，以及 API Base URL、API Key、模型名保存和测试连接。主界面顶部不再提供语言切换按钮。
- 退出账号会清空所有用户最近登录状态和工作区当前用户；回到主界面后会再次弹出登录弹窗。
- 从共享类型、API 保存输入、SQLite 最终表结构、IPC、AI 调用判断、UI 表单和测试中移除了 AI `enabled` 字段/复选框/状态文案。
- AI 功能默认可点击；若 API 未配置或配置不完整，点击 AI 生成/汇总时提示 API 不可用。mock provider 配置仍不需要真实 API key。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T024 — 两栏主界面壳与空工作区节点树

**状态**：DONE

### 要做什么

重构主界面信息架构：

- 移除旧顶部状态栏、旧右侧常驻辅助面板、工作空间概览、快捷操作、推进路径等冗余区域。
- 主界面只保留左侧节点/文件树和右侧详情区。
- 左上角放置“导入”按钮。
- 左侧树在未打开工作区时显示灰色占位层级：创建主节点、创建模块节点、创建内容节点。
- 右侧在未选中节点时只显示“请选择一个节点来查看”。
- 左下角放置导出 AGENTS/CLAUDE、导出当前目录和设置入口。
- 已打开工作区时，左侧树显示真实主节点、模块节点、内容节点、图片库和已生成索引文件。
- UI 风格和配色保持当前方向，但布局层级必须符合 `DESIGN.md`。

### 暂不做什么

- 不实现所有详情表单重构。
- 不实现图片拖拽/粘贴。
- 不实现 AI 新弹窗。

### 验收标准

- 主界面没有旧三栏布局和旧右侧辅助面板。
- 未打开工作区时左侧是灰色占位树，右侧是空状态提示。
- 已打开工作区时左侧树层级与数据结构一致。
- 主界面不出现“本地游戏上下文工作区”“AI 已启用”“工作空间概览”“节点树”“快捷操作”“推进路径”等旧提示。
- 中英文 UI 不混排。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm build` 通过或明确记录阻塞。

### 验收结果

已完成。

- 主界面从旧顶部状态栏 + 三栏工作台 + 右侧常驻辅助面板，迁移为左侧节点/文件树和右侧详情区两栏结构。
- 左上角只保留导入入口；设置入口、导出 `AGENTS.md` / `CLAUDE.md`、导出当前目录入口已迁移到左下角。
- 未打开工作区时，左侧显示灰色占位层级：创建主节点、创建模块节点、创建内容节点；右侧只显示“请选择一个节点来查看”。
- 打开工作区后，左侧按层级显示真实游戏主节点、模块节点、模块下内容节点、与模块同级的图片库和图片条目；手动导出或导入识别到的 `AGENTS.md`、`CLAUDE.md`、`manifest.yml`、`INDEX.md`、`image_catalog.yml` 会显示为文件条目。
- 右侧详情区按左侧选中项只显示一个详情：游戏、模块、内容、图片库、单张图片或索引文件；不再显示旧右侧图片预览、MD 预览、AI 辅助和基础结构常驻面板。
- 已清理主界面旧提示文案：`本地游戏上下文工作区`、`AI 已启用`、`工作空间概览`、`节点树`、`快捷操作`、`推进路径`、`辅助面板` 不再出现在 `App.tsx`。
- 游戏主节点项目阶段下拉改为按当前语言单语显示；设置语言下拉在中文界面显示“中文/英文”，英文界面显示“Chinese/English”。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T025 — 节点创建弹窗、层级加号与自动选中

**状态**：DONE

### 要做什么

按新左侧树交互实现节点创建：

- 灰色主节点右侧 `+` 打开创建主节点弹窗。
- 主节点已创建后，主节点右侧 `+` 创建模块节点。
- 没有模块时，灰色创建模块节点右侧 `+` 创建模块节点。
- 模块节点右侧 `+` 创建该模块下的内容节点。
- 没有内容时，灰色创建内容节点右侧 `+` 创建内容节点。
- 创建弹窗只显示创建所需必填信息，选填字段留到详情页。
- 所有节点 ID 自动分配，不在弹窗中显示为可输入项。
- 创建成功后自动选中新节点，并在右侧显示对应详情。

### 暂不做什么

- 不重做全部详情字段样式。
- 不实现删除权限。
- 不实现 AI 功能新弹窗。

### 验收标准

- 创建主节点、模块节点、内容节点都通过弹窗完成。
- 弹窗不要求用户输入节点 ID。
- 创建后左侧树立即出现新节点并自动选中。
- 模块和内容的创建父子关系正确。
- 必填信息缺失时无法创建，并显示当前语言错误提示。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 或针对创建逻辑的单元测试通过。

### 验收结果

已完成。

- 左侧树支持层级 `+` 创建入口：未打开工作区时灰色主节点 `+` 打开创建主节点弹窗；已有主节点时主节点 `+` 打开创建模块弹窗；模块节点 `+` 和模块下灰色内容占位 `+` 打开对应父模块的内容创建弹窗。
- 创建弹窗只显示当前创建所需必填字段：主节点为游戏名称、游戏版本、项目阶段；模块为模块名称；内容为标题。弹窗不显示也不要求输入节点 ID。
- 未打开工作区时，主节点创建弹窗提交后会先让用户选择本地文件夹并创建工作区，再创建主节点；已有空工作区时直接在当前工作区创建主节点。
- 创建成功后会立即刷新左侧树数据、自动选中新建主节点/模块/内容，并在右侧显示对应详情。
- 旧详情页的未创建状态不再使用完整字段表单创建节点，而是提示使用左侧层级加号或按钮打开同一个创建弹窗；已选中节点的编辑保存能力保留给后续 T026 重构。
- 必填信息缺失时会在创建弹窗中显示当前语言错误提示。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T026 — 节点详情页、脏状态保存、图片关联与 MD 预览

**状态**：DONE

### 要做什么

重构游戏、模块、内容节点详情页：

- 选中一个节点时，右侧只显示该节点详情，不显示其他节点、图片库或全局辅助信息。
- 详情页区分结构字段和可编辑字段。
- 保存按钮只有在内容被修改后才可点击，保存成功后回到禁用状态。
- 主节点主图使用图片下拉框选择，下拉项显示图片名和预览图，并提供查看详情入口。
- 模块和内容详情的关联图片区域显示已关联图片名和预览图。
- 模块和内容详情的关联图片区域右侧 `+` 弹出未关联图片列表，列表显示图片名和预览图。
- 图片库为空时，关联图片区域显示“暂无图片”。
- 每个节点详情提供 MD 预览按钮，点击后在右侧详情区域临时打开预览栏。
- `@image_id` / `@图片名` 引用校验继续有效。

### 暂不做什么

- 不实现图片上传拖拽/粘贴。
- 不实现 AI 新弹窗。
- 不实现右键菜单。

### 验收标准

- 游戏、模块、内容详情都支持脏状态保存。
- 未修改时保存按钮禁用，修改后启用。
- 节点图片关联不再使用手填 ID 或普通复选框列表。
- MD 预览只通过详情页按钮出现，不作为常驻右栏。
- 保存后节点 MD 正确写入。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过或明确记录阻塞。

### 验收结果

已完成。

- 游戏、模块、内容节点详情页支持脏状态保存：当前表单与已保存节点一致时保存按钮禁用，修改字段或图片关联后启用，保存成功后回到禁用状态。
- 已选模块/内容详情不再显示同级节点下拉列表或新建入口，右侧保持为当前选中节点详情；结构字段仍以只读区域展示，可编辑字段在表单中编辑。
- 游戏主节点主图改为图片选择弹层：可选择“不使用主图”或图片库图片，图片项显示预览图、图片名和 ID，并提供查看图片详情入口，不再手填主图 ID。
- 模块和内容的关联图片区域不再使用普通复选框列表；已关联图片以预览卡片显示，可查看详情或取消关联，右侧 `+` 弹出未关联图片列表并显示预览图、图片名和 ID。
- 图片库为空时，关联图片区域显示暂无可关联图片提示。
- 游戏、模块、内容详情均提供 `MD 预览` 按钮，点击后仅在当前详情区域临时展开 Markdown 预览，再次点击关闭，不再作为常驻右栏。
- `@image_id` / `@图片名` 引用校验继续由 SQLite 服务层在内容节点保存时执行。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T027 — 左侧图片库、上传弹窗、拖拽与剪贴板粘贴

**状态**：DONE

### 要做什么

把图片功能融入左侧树和右侧详情：

- 左侧树中图片库与模块节点同级显示。
- 图片库和图片条目使用橙色视觉标识，区别于节点青色。
- 图片库右侧 `+` 打开上传图片弹窗。
- 上传弹窗包含必要信息和选择图片区域。
- 支持将图片拖拽到主界面左侧后自动打开上传弹窗并预填图片。
- 支持将图片拖拽到上传弹窗的选择图片区域。
- 支持在左侧栏右键粘贴或 `Ctrl+V` 粘贴剪贴板图片，并自动打开上传弹窗。
- 图片上传后左侧图片库下显示图片名和预览小图。
- 点击图片条目后，右侧显示图片详情和原图。

### 暂不做什么

- 不做 OCR。
- 不把图片发送给 AI。
- 不做批量上传。

### 验收标准

- 上传图片必须填写图片名。
- 图片文件名根据图片名清洗重写，原始文件名保存到元数据。
- 三种入口：按钮、拖拽、剪贴板粘贴都能进入同一个上传弹窗流程。
- 图片详情在右侧显示，不与节点详情混排。
- 图片路径符合新版工作区结构。
- `corepack pnpm typecheck` 通过。
- 无自动 E2E 时，`CURRENT_STATE.md` 记录图片上传、拖拽、粘贴人工烟测清单。

### 验收结果

已完成。

- 左侧树中的图片库继续与模块节点同级显示，并使用橙色视觉标识；图片库右侧 `+` 会打开统一上传图片弹窗。
- 图片条目使用橙色标识并显示图片名和预览小图；点击图片条目后，右侧只显示该图片详情和原图，不与节点详情混排。
- 上传图片流程迁入弹窗：弹窗包含图片名、备注和选择图片区域；图片名仍为必填，提交时由 main process 按图片名清洗并重写文件名，原始文件名保存到图片元数据。
- 支持三种入口进入同一个弹窗流程：点击图片库 `+`、将图片拖拽到左侧栏、通过左侧栏/非输入框 `Ctrl+V` 或左侧右键“粘贴图片”读取剪贴板图片。
- 上传弹窗的选择区域支持点击选择图片和拖拽图片，并会预览当前已选择图片。
- main process 图片上传 IPC 扩展为可接收 renderer 传入的 data URL 图片源；旧的未传 source 时系统文件选择逻辑仍保留为兼容路径。
- 图片仍保存到新版工作区结构 `<game_folder_name>/assets/images/<image_id>__<display_name>.<ext>`，并保持目录索引只在手动导出时更新。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- 未执行自动 E2E；图片上传、左侧拖拽、弹窗拖拽和剪贴板粘贴已在 `CURRENT_STATE.md` 记录人工烟测清单。

---

## T028 — 删除权限、确认弹窗与左侧右键菜单

**状态**：DONE

### 要做什么

完善节点/图片删除和右键操作：

- 每个节点右侧显示删除按钮或删除入口。
- 删除前弹出应用内确认/取消弹窗，不再依赖浏览器原生确认框。
- 只有当前用户与节点创建者一致时才能删除节点。
- 只有当前用户与图片上传者一致时才能删除图片。
- 删除模块时级联删除子内容节点，保留图片资产。
- 删除图片时显示引用列表并二次确认，删除后从相关节点取消关联。
- 删除后不自动重写目录索引，只标记目录需要重新导出或显示索引可能过期。
- 左侧右键菜单支持“粘贴”和“在文件夹中打开”。
- “在文件夹中打开”应打开当前选中节点、图片或索引文件所在目录并选中文件。

### 暂不做什么

- 不做回收站。
- 不做撤销。
- 不做历史恢复。

### 验收标准

- 非创建者/上传者不能删除对应资源。
- 删除确认使用应用内弹窗。
- 删除节点不会删除图片资产。
- 删除图片会解除相关节点关联并清理非法引用。
- 右键打开文件夹只允许打开当前工作区内已知路径。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过或明确记录阻塞。
- 无自动 E2E 时，`CURRENT_STATE.md` 记录右键菜单和系统文件夹打开人工烟测清单。

### 验收结果

已完成。

- 节点和图片删除入口改为应用内确认弹窗，不再依赖浏览器原生 `window.confirm`。
- 游戏、模块、内容节点和图片详情/列表都提供删除入口；删除按钮会按当前用户是否为创建者/上传者禁用，main process 删除 IPC 也会执行同样权限校验。
- 删除模块会级联删除其子内容节点、对应 Markdown 和节点图片关联，但保留图片资产。
- 删除内容会删除对应 Markdown 和节点图片关联，但保留图片资产。
- 删除图片会在确认弹窗中显示引用节点列表，删除后移除图片文件、取消所有节点关联，并清理内容中的非法 `@image_id` / `@图片名` 引用。
- 删除游戏主节点会删除游戏记录、模块/内容记录与 `game.md`，但通过 SQLite v5 迁移保留图片资产元数据和图片文件，避免节点删除误删图片资产。
- 删除后不会自动重写 `manifest.yml`、`INDEX.md`、`image_catalog.yml`，只标记目录索引需要手动重新导出，并在确认弹窗提示索引可能过期。
- 左侧右键菜单支持“粘贴图片”和“在文件夹中打开”；打开文件夹只接受 main process 根据当前工作区内已知节点、图片或索引文件解析出的路径，并校验目标路径仍位于当前工作区内。
- 新增共享类型、preload 桥接和 workspace IPC 支持 `openKnownWorkspaceItem`，通过 Electron `shell.showItemInFolder` 打开并选中文件。
- 单元测试已覆盖游戏删除后图片资产保留，以及游戏文件删除只移除 `game.md` 而不删除图片文件。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。

---

## T033 — 左侧主节点折叠边界修正

**状态**：DONE

### 要做什么

根据用户反馈，修正左侧游戏主节点折叠按钮的作用范围：

- 点击游戏主节点折叠按钮时，只折叠模块节点、内容节点和图片库。
- `AGENTS.md` / `CLAUDE.md` 文件分组不随游戏主节点折叠。
- `manifest.yml` / `INDEX.md` / `image_catalog.yml` 索引文件分组不随游戏主节点折叠。
- Agent 文件和索引文件继续使用各自分组的折叠按钮独立控制。

### 暂不做什么

- 不改文件导出结构。
- 不改节点、图片或索引文件 CRUD。
- 不改主界面整体布局。

### 验收标准

- 游戏主节点折叠后，模块节点、内容节点和图片库被隐藏。
- 游戏主节点折叠后，Agent 文件分组和索引文件分组仍显示。
- Agent 文件分组和索引文件分组仍可独立折叠/展开。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- `WorkspaceTree` 中 Agent 文件和索引文件分组已移出 `isGameCollapsed` 条件，不再随游戏主节点折叠隐藏。
- 游戏主节点折叠按钮现在只影响模块/内容区域和图片库区域；Agent 文件和索引文件继续由各自分组折叠状态控制。
- 主节点折叠按钮在已有主节点时可用，可收起模块占位/模块内容和图片库栏位。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。

---

## T034 — 刷新工作区时忽略过期索引中的缺失节点

**状态**：DONE

### 要做什么

根据用户反馈，修复右上角刷新工作区时，因为旧 `manifest.yml` / `image_catalog.yml` 仍引用已删除模块文件而导致刷新失败的问题。

需要包括：

- 刷新或重启恢复工作区时，如果手动导出的索引文件还引用已经不存在的模块、内容或图片文件，不应抛出硬错误。
- 缺失引用应记录为 warning，并把目录索引标记为需要重新导出。
- 刷新结果应以磁盘上实际存在的 Markdown 和图片文件为准。
- 过期 `manifest.yml` 中的旧图片关联不应重新关联到已经不存在的模块或内容节点。

### 暂不做什么

- 不自动重写 `manifest.yml`、`INDEX.md` 或 `image_catalog.yml`。
- 不恢复已被用户从文件夹中删除的节点文件。
- 不改变节点删除权限或导出文件结构。

### 验收标准

- 手动删除模块文件夹但不重新导出目录索引后，刷新工作区不再报 `Referenced file is missing`。
- 刷新后的模块和内容列表以现存文件为准，已删除模块不再显示。
- 目录索引被标记为需要重新导出。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- `workspaceService` 现在会把 `manifest.yml` 中缺失的游戏、模块、内容路径降级为 warning，并回退扫描工作区内实际存在的 Markdown 文件。
- 图片导入会跳过 `manifest.yml` 或 `image_catalog.yml` 中仍记录但磁盘上已不存在的图片文件，并记录 warning。
- 根据导入到的真实游戏、模块和内容节点过滤 `manifest.yml` 中的图片 `linked_nodes`，避免旧索引把已删除节点的图片关联重新写回数据库。
- 新增单元测试覆盖“导出目录索引后手动删除模块文件夹，再导入/刷新工作区”的场景；刷新结果为 0 个模块、0 个内容、图片仍保留，且目录索引需要重新导出。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T035 — 删除主节点时同步删除工作区唯一标记

**状态**：DONE

### 要做什么

根据用户反馈，删除游戏主节点时，除了删除主节点游戏上下文文件夹，还需要同步删除工作区根目录的 `.game-context-manager.yml`。

需要包括：

- 删除游戏主节点时删除当前工作区根目录下的 `.game-context-manager.yml`。
- 删除 marker 时必须校验路径位于当前工作区内，不允许删除任意外部文件。
- 应用重启恢复最近工作区时，如果最近工作区的 marker 已不存在，应跳过恢复，回到未打开工作区状态。
- 更新测试和文档记录。

### 暂不做什么

- 不删除用户手动导出的 `AGENTS.md`、`CLAUDE.md` 或 `manifest.yml`。
- 不实现回收站或撤销。
- 不改变创建主节点时必须重新选择工作区根目录的流程。

### 验收标准

- 删除主节点后，`<workspace>/.game-context-manager.yml` 不再存在。
- 删除主节点后，`<game_folder_name>/` 不再存在。
- 重启恢复最近工作区时，若 marker 已不存在，不抛错并停留在未打开工作区状态。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- `deleteGameNodeFiles` 删除主节点游戏上下文文件夹后，会同步删除当前工作区根目录的 `.game-context-manager.yml`。
- 新增工作区内文件删除校验，删除 marker 前会确认目标路径位于当前工作区内部。
- 最近工作区恢复时，如果记录中的 marker 已不存在，会直接返回未恢复状态，避免下次启动因缺少 `.game-context-manager.yml` 抛错。
- `fileExportService.test.ts` 已断言删除主节点文件后游戏目录、图片文件和 `.game-context-manager.yml` 都不存在。
- `DESIGN.md` 已更新删除游戏主节点规则，说明当前实现会一并删除工作区唯一标记。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T036 — 导出完成提示去重

**状态**：DONE

### 要做什么

根据用户反馈，左下角两个导出按钮执行完成时，界面左下角和右下角会同时显示导出完成提示，造成冗余。需要只保留左下角导出区提示，去掉右下角全局导出完成/失败提示。

需要包括：

- 导出 AGENTS/CLAUDE 完成或失败时，只显示左下角导出区提示。
- 导出当前目录完成或失败时，只显示左下角导出区提示。
- 保存、刷新、删除等其它非导出流程的右下角全局提示不受影响。
- 左下角导出提示仍约 2 秒后自动消失。

### 暂不做什么

- 不改导出文件结构。
- 不改导出 IPC 或文件生成服务。
- 不改其它操作的全局提示行为。

### 验收标准

- 点击“导出 AGENTS/CLAUDE”成功后，只出现左下角“导出完成”提示。
- 点击“导出当前目录”成功后，只出现左下角“导出完成”提示。
- 导出失败时，只出现左下角“导出失败”提示和错误详情。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- `App.tsx` 中导出完成收尾逻辑已改为只设置左下角 `exportStatus`，不再调用右下角全局 `showTransientNotice`。
- 导出成功和失败仍会在左下角导出区显示约 2 秒；失败详情继续显示在左下角导出失败提示中。
- 保存、刷新、删除文件等其它流程仍保留原有右下角全局提示。
- `DESIGN.md` 已同步说明导出成功或失败提示只在左下角导出区显示。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。

---

## T032 — AGENTS 与 CLAUDE 指令完整度对齐

**状态**：DONE

### 要做什么

根据用户反馈，`AGENTS.md` 和 `CLAUDE.md` 都需要是完整版下游 Agent 指令，不能让 `CLAUDE.md` 比 `AGENTS.md` 少关键规则。

需要包括：

- `CLAUDE.md` 与 `AGENTS.md` 保持同等完整章节。
- 差异仅保留在首段身份说明和必要措辞适配。
- 示例工作区同步更新。
- 测试覆盖 `CLAUDE.md` 的完整章节。

### 暂不做什么

- 不改 GUI 交互。
- 不改 `manifest.yml`、`INDEX.md` 或 `image_catalog.yml` 的结构。
- 不引入新的 Agent 类型。

### 验收标准

- 手动导出的英文和中文 `CLAUDE.md` 包含任务定位、读取顺序、上下文选择、结构化字段、常见任务处理方式、依据与不确定性、边界。
- 示例工作区 `CLAUDE.md` 为完整版。
- 单元测试覆盖 `CLAUDE.md` 的完整关键章节。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- `fileExportService` 生成的英文 `CLAUDE.md` 已扩展为与 `AGENTS.md` 同等完整的任务手册，包含 `Mission`、`Read Order`、`Context Selection`、`Structured Fields`、`Common Task Playbooks`、`Evidence And Uncertainty` 和 `Boundaries`。
- `fileExportService` 生成的中文 `CLAUDE.md` 已扩展为与 `AGENTS.md` 同等完整的任务手册，包含“任务定位”“读取顺序”“上下文选择规则”“结构化字段”“常见任务处理方式”“依据与不确定性”“边界”。
- 示例工作区 `examples/sample-workspace/CLAUDE.md` 已通过导出服务重新生成。
- `fileExportService.test.ts` 已新增对中文 `CLAUDE.md` 完整章节的断言。
- `sampleWorkspace.test.ts` 已新增对示例 `CLAUDE.md` 中 `Common Task Playbooks` 和 `Boundaries` 的断言。
- `DESIGN.md` 已明确 `AGENTS.md` 和 `CLAUDE.md` 必须是同等完整的任务手册，只在身份说明和必要措辞上适配不同 Agent。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。
- 未执行自动 E2E；右键菜单和系统文件夹打开人工烟测清单已记录到 `CURRENT_STATE.md`。

---

## T029 — 节点详情内 AI 编辑弹窗与父节点汇总

**状态**：DONE

### 要做什么

把 AI 功能从旧辅助面板迁入节点详情：

- 每个节点详情底部显示三个不同颜色按钮：AI 辅助增加、AI 辅助修改、AI 辅助润色。
- 点击按钮打开 AI 弹窗。
- 弹窗包含字段多选下拉框、已选字段 tag、用户指令输入框、生成按钮。
- 每个 tag 显示字段名和 `x` 删除入口。
- 生成后在同一弹窗下半部分展示结果，不覆盖原表单，不打开第二个弹窗。
- 结果只对比用户选择的字段。
- AI 输出解析为结构化字段数据，用户可编辑生成结果。
- 用户可取消、确认覆盖，或修改字段/指令再次生成。
- AI 修改模式必须确保只修改用户选择的字段。
- 模块节点详情底部提供“从子节点汇总”。
- 游戏主节点详情底部提供“从模块汇总”。
- 汇总使用同样的对比、编辑、取消、确认覆盖流程。
- API 未配置或连接失败时，点击 AI 功能提示不可用。

### 暂不做什么

- 不做整节点自动创建。
- 不做批量 AI。
- 不做自动定时汇总。

### 验收标准

- AI 增加/修改/润色均可在 mock provider 下走完整预览确认流程。
- 选择多字段时，结果区域展示所有被选字段的原文、新文和差异。
- 未确认前不会覆盖节点字段。
- 确认覆盖后更新最后编辑者并写入节点 MD。
- 模块汇总和游戏汇总使用同一确认逻辑。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过或明确记录阻塞。

### 验收结果

已完成。

- 游戏、模块、内容详情页底部新增三个不同颜色的 AI 辅助按钮：增加、修改、润色；游戏详情额外提供“从模块汇总”，模块详情额外提供“从子节点汇总”。
- 点击 AI 入口会打开节点详情内的应用弹窗；弹窗支持字段多选下拉、已选字段 tag、tag `x` 移除、用户指令输入和生成按钮。
- 字段级 AI 增加/修改/润色在 mock provider 下支持多字段生成；每个被选字段都会展示原文、新文和差异，且生成结果可在弹窗内编辑。
- 未点击“确认覆盖”前不会写回节点表单；确认后会通过现有节点保存 IPC 更新最后编辑者并写入对应节点 MD。
- AI 修改模式只对用户选择的字段发起生成和确认覆盖，不会改动未选择字段。
- 模块汇总和游戏汇总已迁入同一个弹窗流程，支持选择汇总字段、展示原文/新文/差异、编辑候选、取消或确认覆盖。
- API 未配置或配置不完整时，点击 AI 功能会在弹窗内提示不可用；真实 provider 连接或生成失败时会显示错误，不会覆盖节点字段。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。
- 未执行自动 E2E；AI 弹窗与确认覆盖流程已在 `CURRENT_STATE.md` 记录人工烟测清单。

---

## T030 — 语言与旧 UI 清理、示例迁移和完整烟测

**状态**：DONE

### 要做什么

完成本轮重构收尾：

- 清理所有旧版冗余文案和入口，包括但不限于：
  - 本地游戏上下文工作区
  - AI 已启用
  - 工作空间概览
  - 节点树作为面板标题
  - 快捷操作
  - 推进路径
  - 主界面 API 配置
  - 主界面语言切换
  - 右侧辅助面板
- 检查中英文文案表，确保同一 UI 状态不会中英文并列。
- 更新 `examples/sample-workspace/` 到新版工作区结构。
- 更新 README、示例 README、下游 AGENTS/CLAUDE 模板说明。
- 更新或补充测试，覆盖新版工作区结构、手动导出、API key 安全、示例 Agent 可读性。
- 执行完整可用检查和 GUI 人工烟测记录。

### 暂不做什么

- 不做 OS 安装包签名。
- 不做云同步或多人协作。
- 不做回收站/撤销。

### 验收标准

- 旧 UI 文案和旧辅助面板相关入口从主界面移除。
- 中文模式全中文，英文模式全英文。
- 示例工作区符合新版目标结构，并可被测试读取。
- Agent 读取说明与新版文件结构一致。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。
- `CURRENT_STATE.md` 包含完整 GUI 人工烟测清单与结果。

### 验收结果

已完成。

- 清理了当前代码和文案表中的旧 UI 概念残留：主界面不再使用旧“节点树 / 快捷操作 / Assistant panel / Local game context workspace”等旧式主界面文案。
- 工作区创建/导入摘要类型与 `workspaceService` 已移除旧 `USAGE.md`、工作区 README、`games/` 字段和死模板，当前只保留 marker、AGENTS、CLAUDE、manifest 等实际结构说明。
- `examples/sample-workspace/` 已迁移到新版 marker-based 结构：根目录包含 `.game-context-manager.yml`、`AGENTS.md`、`CLAUDE.md`、`manifest.yml`，主节点目录为 `starfall_workshop/`。
- 示例模块和内容已迁移到目标结构：`modules/<module_id>/module.md` 与 `modules/<module_id>/contents/<content_id>.md`。
- 示例 `manifest.yml`、`INDEX.md`、`image_catalog.yml`、示例 README、下游 `AGENTS.md` / `CLAUDE.md` 均已更新到新版路径和读取说明，不再依赖 `USAGE.md`。
- 根 `README.md` 已更新为当前 T030 后状态，移除“旧 MVP / 待迁移”的过期说明，并补充新版示例结构。
- `sampleWorkspace.test.ts` 已更新，覆盖新版示例 marker、manifest 路径、模块/内容嵌套路径、示例可被导入服务读取，以及示例文件不包含 API key。
- `domainTypes.test.ts` 已同步新版工作区路径示例。
- `AGENTS.md` 已更新示例目录说明，明确当前新建工作区、导入、测试和示例均以 marker-based 结构为准。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。
- 未执行自动 E2E；完整 GUI 人工烟测清单与当前命令级检查结果已记录到 `CURRENT_STATE.md`。

---

## T031 — 下游 Agent 指令与目录索引重构

**状态**：DONE

### 要做什么

根据用户指定方向，重构软件生成的 `AGENTS.md`、`CLAUDE.md`、`INDEX.md`、`manifest.yml` 和 `image_catalog.yml`，让下游 Agent 更适合处理游戏运营、测试、客服、评测、调优讨论、UI 预览图方向、市场/竞品/用户分析和游戏机制问答等任务。

需要包括：

- `AGENTS.md` 面向 Codex/通用 Agent，`CLAUDE.md` 面向 Claude Code / WorkBuddy 等 Claude 系 Agent。
- Agent 文件说明如何根据任务选择上下文：默认读取游戏主节点；内容节点任务读取父模块；图片/UI 任务读取相关图片；维度型问题优先查对应结构化字段。
- Agent 文件说明 @ 节点文件、@ 图片、图片反查、外部资料查询、依据标注、推测和未知信息处理规则。
- `INDEX.md` 或索引文件中加入三层节点结构化字段地图，说明主节点、模块节点、内容节点分别有哪些字段。
- `image_catalog.yml` 支持根据图片反查相关节点文件。
- 更新示例工作区和测试。

### 暂不做什么

- 不改 GUI 交互。
- 不引入联网能力或外部数据源。
- 不改变节点 CRUD、AI 调用或数据库 schema。

### 验收标准

- 手动导出的 `AGENTS.md` / `CLAUDE.md` 包含新的任务定位、上下文选择、图片读取、维度字段查询和依据/不确定性规则。
- 手动导出的 `INDEX.md` 包含三层节点字段地图。
- 手动导出的 `manifest.yml` 包含机器可读 `field_schema`。
- 手动导出的 `image_catalog.yml` 包含可反查节点文件的 `linked_node_files`。
- 示例工作区同步为新导出格式。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- 重构 `fileExportService` 生成的中英文 `AGENTS.md` 和 `CLAUDE.md` 模板，加入任务定位、读取顺序、上下文选择规则、结构化字段使用方式、常见任务处理方式、依据标注和不确定性规则。
- `INDEX.md` 新增“如何使用本索引 / How To Use This Index”和三层节点结构化字段地图，覆盖游戏主节点、模块节点、内容/阶段/体验节点的字段、位置和适用场景。
- `manifest.yml` 新增 `field_schema`、`task_context_entries`、`workspace.agents`、`workspace.claude` 和 `game.image_catalog`，并在图片条目中加入 `linked_node_files`。
- `image_catalog.yml` 保留 `linked_nodes`，并新增 `linked_node_files`，可直接列出图片关联节点的类型、ID、名称和路径；游戏主图也会加入图片反查关系。
- 示例工作区 `examples/sample-workspace/` 已用导出服务重新生成 Agent 文件、节点 Markdown、`manifest.yml`、`INDEX.md` 和 `image_catalog.yml`。
- 删除了 `workspaceService.ts` 中未使用的旧版下游 Agent 常量，避免后续误用旧模板。
- `fileExportService.test.ts` 已覆盖新 Agent 模板关键规则、字段地图、manifest `field_schema` 和图片 `linked_node_files`。
- `sampleWorkspace.test.ts` 已覆盖示例工作区的新 `field_schema`、`task_context_entries`、`linked_node_files` 和索引字段地图。
- `DESIGN.md` 已补充下游 Agent 指令、字段 schema 和图片反查字段的设计说明。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。

---

## T037 — Ctrl+S 保存与自动目录导出

**状态**：DONE

### 要做什么

根据用户明确指定，调整节点保存与目录导出工作流：

- 在任一游戏、模块、内容节点详情页中，`Ctrl+S` 视同点击保存按钮。
- 未做出改动时，`Ctrl+S` 无反应。
- 保存按钮可用且有改动时，`Ctrl+S` 完成保存。
- 每次保存或删除任一节点、文件、图片后，自动执行一次目录导出。
- 创建主节点时，自动执行一次 `AGENTS.md` / `CLAUDE.md` 导出。
- 将上述规则同步到 `DESIGN.md` 等相关文档。

### 暂不做什么

- 不新增可见快捷键说明入口。
- 不改变 AI 预览确认规则。
- 不改变导出文件的机器字段结构。

### 验收标准

- 节点详情中无改动时按 `Ctrl+S` 不触发保存。
- 节点详情中有改动时按 `Ctrl+S` 触发与保存按钮相同的保存流程。
- 游戏、模块、内容节点创建/保存后会自动更新 `manifest.yml`、`INDEX.md`、`image_catalog.yml`。
- 模块、内容、图片和已知导出文件删除后会自动更新目录索引。
- 创建游戏主节点后会自动生成或更新 `AGENTS.md` / `CLAUDE.md`。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- `App.tsx` 已增加节点详情页 `Ctrl+S` 监听：只在游戏、模块、内容详情中拦截保存快捷键；无改动或保存按钮不可用时不提交；有改动时调用对应保存流程。
- 新增 `exportWorkflowService.ts`，统一封装按当前 SQLite 状态导出目录索引和 Agent 文件的工作流。
- 游戏主节点创建成功后会自动导出 `AGENTS.md` / `CLAUDE.md`，并自动导出 `manifest.yml`、`INDEX.md`、`image_catalog.yml`；游戏主节点保存后会自动导出目录索引。
- 模块、内容、图片上传/删除和已知导出文件删除成功后，都会自动导出当前目录索引并清除 `directoryIndexNeedsExport` 状态。
- IPC 返回值已补充可选 `exportedPaths`，前端会把自动导出的文件路径合并进左侧文件树。
- 中文/英文界面文案已移除“需手动导出目录索引”的过期提示，改为自动同步目录索引。
- `DESIGN.md`、`AGENTS.md`、`README.md` 已同步新的 `Ctrl+S` 和自动导出规则。
- 新增 `tests/unit/exportWorkflowService.test.ts`，覆盖自动导出 helper 生成 Agent 文件、目录索引，并把工作区目录索引状态标记为已导出。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
- `git diff --check` 已通过；仅输出当前工作区 LF/CRLF 转换提示。

---

## T038 — 修复多行文本刷新或重启后被截断

**状态**：DONE

### 要做什么

根据用户反馈，任一文本框输入多行信息并保存后，刷新或关闭重启再恢复工作区时，只剩第一行，其余行丢失。需要修复工作区重新扫描 Markdown 时的多行字段读取问题。

需要包括：

- 保存到 Markdown 的多行字段在刷新/重启导入后保持完整。
- 覆盖游戏、模块、内容节点的 Markdown 正文字段。
- 增加回归测试，防止章节正文再次只读取第一行。

### 暂不做什么

- 不改变 GUI 表单交互。
- 不改变 Markdown 文件结构或 YAML frontmatter 字段。
- 不改变数据库 schema。

### 验收标准

- 多行游戏字段刷新/重启导入后不截断。
- 多行模块字段刷新/重启导入后不截断。
- 多行内容字段刷新/重启导入后不截断。
- `corepack pnpm typecheck` 通过。
- `corepack pnpm test` 通过。
- `corepack pnpm build` 通过。
- `corepack pnpm lint` 若仍未配置，明确记录。

### 验收结果

已完成。

- 修复 `workspaceService.ts` 的 Markdown 章节提取正则：章节正文现在会读取到下一个二级标题或文件末尾，不再把普通行尾当作章节结束。
- `workspaceService.test.ts` 已加入游戏、模块、内容节点多行字段导入断言，覆盖刷新/重启时从 Markdown 重建数据库快照的路径。
- `corepack pnpm exec tsx tests/unit/workspaceService.test.ts` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm typecheck` 已通过。
- `corepack pnpm test` 已通过；`node:sqlite` 仍输出 ExperimentalWarning。
- `corepack pnpm lint` 已执行但失败：当前尚未配置 lint 脚本。
- `corepack pnpm build` 已通过。
