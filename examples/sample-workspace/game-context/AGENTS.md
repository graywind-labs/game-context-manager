# AGENTS.md

This file is for agents reading this generated game context workspace.

## How To Read This Workspace

1. Open `manifest.yml` first.
2. Use the manifest to find the game node, module nodes, content nodes, images, and relation indexes.
3. Read `USAGE.md` for the general workflow before making task-specific assumptions.
4. Treat Markdown files plus YAML frontmatter as the source of truth for agent-facing context.
5. Respect manual `@image_id` references in node content. They point to images listed in the manifest and image catalog.

## Boundaries

- Do not require the GUI to understand this workspace.
- Do not send files or images to external services unless the user explicitly asks for that.
- Do not write API keys or private credentials into Markdown or YAML output.
- Preserve human-written notes unless the user asks you to edit them.
