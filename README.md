# Game Context Manager

Game Context Manager is a local-first desktop GUI for creating, organizing, editing, and exporting game project context in files that ordinary agents can read.

游戏上下文管理器是一个本地优先的桌面 GUI 软件，用于创建、规整、编辑并导出普通 Agent 可直接读取的游戏项目上下文文件。

## Development

## 开发

Install dependencies:

```bash
pnpm install
```

Run the desktop app in development mode:

```bash
pnpm dev
```

Run TypeScript checks:

```bash
pnpm typecheck
```

Build the Electron/Vite output:

```bash
pnpm build
```

Run type-level unit tests:

```bash
pnpm test
```

## MVP Boundary

The app manages local game context and exports Markdown, YAML, static usage docs, indexes, and referenced image assets. It does not perform game analytics, image generation, RAG, MCP hosting, cloud collaboration, automatic optimization suggestions, or automatic gameplay.

## MVP 边界

本应用只管理本地游戏上下文，并导出 Markdown、YAML、静态使用说明、目录索引和被引用的图片资源。它不做游戏数据分析、生图、RAG、MCP 服务、云端协作、自动优化建议或自动玩游戏。
