# Game Context Manager

Game Context Manager（游戏上下文管理器）是一个本地优先的桌面 GUI 软件，用来按节点管理给人类和 Agent 双方阅读的游戏上下文，并在节点详情中提供 AI 辅助增加、修改、润色和汇总能力。

当前仓库已完成两栏 UI、唯一标记工作区、自动目录索引导出、节点详情 AI 弹窗、删除确认和示例工作区迁移。后续开发仍以 `DESIGN.md` 和 `TASK.md` 为准。

## 目标产品形态

主界面只保留左右两部分：

- 左侧：导入、节点/文件树、图片库、导出按钮、设置入口。
- 右侧：当前选中节点、图片或索引文件的详情与操作。

核心行为：

- 无最近登录用户时，必须先弹出本地用户登录/创建弹窗。
- 未打开工作区时，左侧显示灰色分级占位节点，右侧提示选择节点。
- 左上角“导入”用于导入带唯一标记的本软件工作区。
- 灰色主节点 `+` 用于创建主节点和新工作区；每次创建主节点都需要重新选择工作区根目录，所选文件夹是 Agent 运行根目录，主节点游戏上下文文件夹会作为其子文件夹生成。
- 节点 ID 和图片 ID 由程序自动分配，用户不手动填写。
- 选中一个节点时，右侧只显示该节点详情。
- 保存按钮只在内容被修改后启用。
- 在节点详情中按 `Ctrl+S` 等同点击保存；没有修改时无反应。
- 图片库在左侧树中与模块节点同级，支持上传、拖拽、粘贴和详情查看。
- API、语言、退出账号只在设置里管理。
- 不再提供“启用 AI 辅助”复选框；AI 默认可用，但 API 未配置或连接失败时提示不可用。
- `AGENTS.md` / `CLAUDE.md` 会在创建主节点时自动导出，也可由用户主动重新导出。
- `manifest.yml`、`INDEX.md`、`image_catalog.yml` 会在保存或删除节点、文件、图片后自动生成或更新，也可由用户主动重新导出。

## 目标工作区结构

```text
<selected-folder>/
  .game-context-manager.yml
  AGENTS.md
  CLAUDE.md
  manifest.yml

  <game_folder_name>/                 # 以“主节点名称 + 游戏上下文”清洗后生成，例如：使命防线游戏上下文
    game.md
    INDEX.md
    image_catalog.yml
    assets/
      images/
        <image_id>__<display_name>.<ext>
    modules/
      <module_id>/
        module.md
        contents/
          <content_id>.md
```

`AGENTS.md`、`CLAUDE.md` 会在创建主节点时自动导出，也可手动重新导出；`manifest.yml`、`INDEX.md` 和 `image_catalog.yml` 会在保存或删除节点、文件、图片后自动导出，也可手动重新导出。节点 Markdown 在保存节点时写入。

## 产品边界

本应用只管理本地游戏上下文，并导出 Markdown、YAML、目录索引和被引用的图片资源。它不做游戏数据分析、生图、RAG、MCP 服务、云端协作、自动优化建议或自动玩游戏。

API key 只保存在本地 SQLite 中，不得写入 Markdown、manifest、INDEX、image_catalog、示例文件或任何 agent-facing 输出。

## 开发命令

安装依赖：

```bash
corepack pnpm install
```

开发启动：

```bash
corepack pnpm dev
```

类型检查：

```bash
corepack pnpm typecheck
```

单元测试：

```bash
corepack pnpm test
```

生产构建：

```bash
corepack pnpm build
```

启动已构建应用：

```bash
corepack pnpm start
```

`pnpm lint` 尚未配置。

## 本地数据

GUI 的编辑索引和设置保存在本地 SQLite：

```text
Electron app.getPath('userData')/game-context-manager.sqlite3
```

已验证 Windows 开发机路径：

```text
C:\Users\JT\AppData\Roaming\game-context-manager\game-context-manager.sqlite3
```

## Agent 读取方式

外部 Agent 不应依赖 GUI。目标读取顺序：

1. 读取工作区根目录的 `AGENTS.md` 或 `CLAUDE.md`。
2. 读取 `manifest.yml`。
3. 读取主节点文件夹中的 `game.md`。
4. 根据 `INDEX.md` 选择相关模块和内容文件，并使用其中的结构化字段地图判断哪些字段最相关。
5. 通过 `manifest.yml` 的 `field_schema` 了解三层节点字段；通过 `manifest.yml` 或 `image_catalog.yml` 解析图片路径和 `@image_id` 引用。
6. 如果任务围绕某张图片，优先使用 `image_catalog.yml` 的 `linked_node_files` 反查关联节点文件。

## 示例工作区

`examples/sample-workspace/` 是新版 marker-based 示例：

```text
examples/sample-workspace/
  .game-context-manager.yml
  AGENTS.md
  CLAUDE.md
  manifest.yml
  starfall_workshop/
    game.md
    INDEX.md
    image_catalog.yml
    assets/images/
    modules/<module_id>/module.md
    modules/<module_id>/contents/<content_id>.md
```

示例不包含 API key，可直接用于验证普通 Agent 是否能按 manifest 和 Markdown frontmatter 读取上下文。

## 当前已知差距

- SQLite 当前使用 Electron/Node `node:sqlite`，测试时会输出 ExperimentalWarning。
- 当前没有回收站、撤销栈、云同步、多人工作区、RAG、MCP 服务或自动玩游戏。
