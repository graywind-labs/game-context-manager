# CURRENT_STATE.md

# Game Context Manager 当前开发状态

更新时间：2026-06-18

## 1. 当前阶段

T001 项目脚手架初始化已完成。

当前仓库已经具备最小可运行的 Electron + React + TypeScript + Vite + Tailwind 桌面应用壳。

已创建的基础内容包括：

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `.npmrc`
- TypeScript 配置
- Electron main process 入口
- Electron preload 入口
- React renderer 入口
- Tailwind/PostCSS 样式入口
- `README.md`
- `scripts/dev.cjs`

## 2. 当前产品定位

Game Context Manager 仍保持本地优先定位。

它只负责管理游戏相关上下文，包括：

- 写入
- 规整
- 查看
- 编辑
- 删除
- 图片管理
- 节点关联
- AI 辅助编辑
- 自下而上汇总
- 导出 agent 可用 MD/manifest 文件

它不负责：

- 数据分析
- 生图
- 给运营建议
- 做 RAG
- 做 MCP
- 自动玩游戏
- 联网公共项目空间

## 3. 当前技术决策

T001 已落地：

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- pnpm / Corepack

后续任务仍会继续落地：

- SQLite
- Node filesystem APIs
- Markdown + YAML frontmatter
- OpenAI-compatible API provider abstraction

## 4. 当前文件状态

当前已经存在基础代码项目结构：

```text
src/
  main/
    index.ts
  preload/
    index.ts
  renderer/
    index.html
    src/
      main.tsx
      App.tsx
      styles/
        index.css
```

当前 GUI 是最小壳：

- 顶部显示 `Game Context Manager`
- 左侧显示节点树占位
- 中间显示项目名和脚手架状态
- 右侧显示上下文面板占位

尚未实现数据库、节点模型、文件生成、AI 或复杂 UI。

## 5. 已完成任务

```text
T001 — 项目脚手架初始化
```

验收摘要：

- `pnpm install` 已通过。
- `pnpm dev` 已通过烟测，Electron 进程可启动，renderer dev server 位于 `http://localhost:5173/`。
- 窗口内容包含 `Game Context Manager`。
- `pnpm typecheck` 已通过。
- `pnpm build` 已通过，产物输出到 `out/`。

## 6. 当前 TODO

下一个任务为：

```text
T002 — 领域模型与 TypeScript 类型定义
```

## 7. 最近一次测试结果

本次运行过的命令与结果：

```text
corepack pnpm install
通过。

corepack pnpm typecheck
通过。

corepack pnpm build
通过。

corepack pnpm dev
通过烟测：Vite dev server 启动，Electron 进程启动；烟测后已主动关闭相关进程。

corepack pnpm test
未通过：当前尚未配置 test 脚本。

corepack pnpm lint
未通过：当前尚未配置 lint 脚本。
```

环境备注：

- 当前 shell 中裸 `pnpm` 仍未进入 PATH，因此使用 Corepack 等价命令 `corepack pnpm ...` 完成验证。
- 当前 Codex 环境存在 `ELECTRON_RUN_AS_NODE=1`，会导致 Electron 以 Node 模式启动；已通过 `scripts/dev.cjs` 在运行 `pnpm dev` 时清理该变量。
- Electron 从 GitHub 下载运行时曾遇到 `ECONNRESET`，已在 `.npmrc` 配置 Electron 下载镜像以提高安装稳定性。

## 8. 已知问题与风险

1. `pnpm test` 尚未配置，后续引入单元测试时需要补充。
2. `pnpm lint` 尚未配置，后续需要决定 ESLint/Prettier 规则。
3. SQLite 依赖在 Electron 中可能需要处理 native module 构建问题，T003 时重点验证。
4. Windows 本地文件路径、中文文件名、图片重命名需要后续重点测试。
5. AI API 配置必须避免写入导出的 agent-facing 文件。
6. 用户希望 GUI 比较美观，后期 T018 需要单独打磨。
7. 工作空间当前设计为一个 workspace 一个游戏主节点；未来多项目空间暂不实现。

## 9. 下一步指令

下次让 Codex 工作时，请让它：

1. 阅读 `AGENTS.md`。
2. 阅读本文件全文。
3. 阅读 `TASK.md`，找到最前面的 TODO。
4. 阅读 `DESIGN.md` 中与 T002 相关的领域模型章节。
5. 只执行 T002。
6. 完成后运行可用测试。
7. 回写 `TASK.md` 和 `CURRENT_STATE.md`。
