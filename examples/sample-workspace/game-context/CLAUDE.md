# CLAUDE.md

This workspace contains local, agent-readable game context.

Start with `manifest.yml`, then read `USAGE.md`. Use the manifest paths to load the game, module, content, and image context needed for the current task.

When content mentions `@image_id`, resolve the image through `manifest.yml` or the per-game `image_catalog.yml` when it exists.

Do not assume missing nodes exist. If a referenced file is missing, report the missing path clearly instead of inventing context.
