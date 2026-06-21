# TASK.md

# Game Context Manager 开发任务表

规则：

- Codex 每次只执行最前面的一个 `TODO` 任务。
- 完成后必须把该任务状态改为 `DONE`。
- 完成后必须填写该任务的 `验收结果`。
- 完成后必须更新 `CURRENT_STATE.md`。
- 后一任务必须建立在前一任务基础上，不要跳步。
- 如果任务无法完成，保持 `TODO`，在 `验收结果` 和 `CURRENT_STATE.md` 记录阻塞原因。

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
- `corepack pnpm lint` 未通过：当前仍未配置 lint 脚本。

---

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

**状态**：TODO

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

空。

---

## T019 — 示例工作空间与 Agent 可读性验证

**状态**：TODO

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

空。

---

## T020 — 打包与 MVP 收尾

**状态**：TODO

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

空。
