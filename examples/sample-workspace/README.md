# Sample Game Context Workspace

This example is a small, fake workspace for verifying that Game Context Manager exports are readable without opening the GUI.

## What Is Included

- Workspace marker: `.game-context-manager.yml`
- One game node: `starfall_workshop`
- Two module nodes: `core_loop`, `upgrade_shop`
- Two content nodes: `day1_lobby_first_loop`, `day2_upgrade_pressure`
- Two image assets under `starfall_workshop/assets/images/`
- `manifest.yml`, per-game `INDEX.md`, `image_catalog.yml`, and static downstream instructions

## How Codex Should Read It

1. Open `AGENTS.md`.
2. Open `manifest.yml` and use the paths under `game`, `modules`, `contents`, and `images`.
3. Use `manifest.yml` `field_schema` and `starfall_workshop/INDEX.md` for the structured field map.
4. Read only the module/content Markdown needed for the current task.
5. Resolve `@image_id` references through `manifest.yml` or `image_catalog.yml`; for image-centered questions, use `linked_node_files` to find related node files.

## Manual Readability Check

Checked on 2026-06-23:

- `.game-context-manager.yml` identifies the workspace and main node folder.
- `manifest.yml` points to every game, module, content, and image file in this example, and includes `field_schema`.
- Every Markdown node has YAML frontmatter and readable section headings.
- Content files use `@image_id` references only for images listed in their own `images` frontmatter.
- `image_catalog.yml` includes `linked_node_files` for image-to-node lookup.
- The two SVG image assets can be opened directly from their manifest paths.
