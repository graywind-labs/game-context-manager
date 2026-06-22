# Sample Game Context Workspace

This example is a small, fake workspace for verifying that Game Context Manager exports are readable without opening the GUI.

## What Is Included

- One game node: `starfall_workshop`
- Two module nodes: `core_loop`, `upgrade_shop`
- Two content nodes: `day1_lobby_first_loop`, `day2_upgrade_pressure`
- Two image assets under `game-context/games/starfall_workshop/assets/images/`
- `manifest.yml`, per-game `INDEX.md`, `image_catalog.yml`, and static downstream instructions

## How Codex Should Read It

1. Open `game-context/AGENTS.md`.
2. Open `game-context/manifest.yml` and use the paths under `game`, `modules`, `contents`, and `images`.
3. Open `game-context/USAGE.md` for the general reading workflow.
4. Open `game-context/games/starfall_workshop/INDEX.md` for a human-readable per-game table of contents.
5. Read only the module/content Markdown needed for the current task, and resolve `@image_id` references through `manifest.yml` or `image_catalog.yml`.

## How Claude Code / WorkBuddy Should Read It

1. Open `game-context/CLAUDE.md`.
2. Read `game-context/manifest.yml`.
3. Load `game-context/games/starfall_workshop/game.md` first.
4. Use the per-game `INDEX.md` to decide which module and content files are relevant.

## Manual Readability Check

Checked on 2026-06-22:

- `manifest.yml` points to every game, module, content, and image file in this example.
- Every Markdown node has YAML frontmatter and readable section headings.
- Content files use `@image_id` references only for images listed in their own `images` frontmatter.
- The two SVG image assets can be opened directly from their manifest paths.
