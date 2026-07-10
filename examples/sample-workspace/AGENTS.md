# AGENTS.md

This file is for Codex and other general agents opened at the root of a Game Context Manager workspace.

## Mission

Use the structured game context in this workspace to help with game operation, testing, customer support, review, tuning discussion, project evaluation, market or competitor research, user analysis, UI direction, preview-image planning, and questions about the packaged game experience.

Work from a player/operator/reviewer perspective. This workspace is not a source-code development repo unless the user separately provides code.

Note: Read documents using UTF-8; PowerShell's default encoding may otherwise produce garbled text.

## Read Order

1. Open `manifest.yml`.
2. Open the game node from `manifest.game.path`. The game node is default context for every game-related task.
3. Open the per-game `INDEX.md` from `manifest.game.index` to see available modules, content nodes, images, and the structured field map.
4. Select only the module/content/image files relevant to the task, then read those Markdown files with their YAML frontmatter.
5. Use `image_catalog.yml` when a task mentions UI, screenshots, visual style, `@image_id`, or a specific image.

## Context Selection

- Always read the game node first.
- If the task is about a module, read that module node plus the game node.
- If the task is about a content/experience node, read that content node, its parent module node, and the game node.
- If the user explicitly @mentions a node file or image file, read the mentioned file first, then read parent/related files needed to answer well.
- If the user @mentions an image or asks about a specific image, look it up in `image_catalog.yml`; use `linked_node_files` when present, or `linked_nodes` plus `manifest.yml` as a fallback, then read the related node files.
- If the task is not about UI, screen layout, visual style, or image contents, you usually do not need to open image files.
- If the task is about UI optimization, visual problems, or preview-image generation, read the relevant image(s), the module role, the intended experience/fun, and one or two broader images that anchor the game's style.
- If the task asks about a dimension rather than a named module, scan the structured fields across nodes first. Examples: gameplay mechanics, fun points, target users, current major problems, optimization directions, or the day-2 experience of a user who paid 6 yuan.

## Structured Fields

`manifest.yml` contains a machine-readable `field_schema`. `INDEX.md` contains the same field map in human-readable form. Use it to decide which fields can answer the task before reading every file in full.

Useful patterns:

- Mechanics/rules: start with game `coreGameplay`, then module `systemRules`, `resourceFlow`, and content `processDescription`.
- Fun/experience: use game `mainFun`, module/content `subjectiveFun`, and the relevant process or operation fields.
- Problems/tuning: use game `currentMainProblems` and `mainOptimizationDirections`, then module/content problem and optimization fields.
- Audience/market: use game `targetUsers`, genre, core loop, operation goal, and representative modules before external research.
- Account-state questions: use content `accountDay`, `cumulativePaymentAmount`, `maxMainlineProgress`, `characterLevel`, and `processDescription`.

## Common Task Playbooks

- Game-mechanism Q&A: answer from the game node, relevant module rules, and relevant content process. Quote file paths or node IDs used.
- Operation/testing review: identify the relevant stage, module, and content fields; separate observed context from inferred risk.
- Customer-support style answers: explain the mechanic from player-facing context only; avoid inventing backend or source-code details.
- UI optimization or preview-image direction: read the related image, its linked nodes, parent module, and game-level style/context before proposing changes.
- Market, competitor, or user analysis: first understand the whole game from top to bottom through the game node and module list, inspect one or two important images when visual positioning matters, then use web research if your environment supports it and the task requires current external information.

## Evidence And Uncertainty

- When the answer is based on workspace context or external research, name the exact files, node IDs, images, or web sources used.
- When you infer something from context, say which references support the inference.
- If there is no explicit reference and no reliable inference path, say that you do not know. Do not fabricate game facts.
- If `manifest.yml`, `INDEX.md`, or `image_catalog.yml` is stale or missing, say so and ask the user to export the current directory from Game Context Manager.

## Boundaries

- Do not require the GUI to understand this workspace.
- Do not treat this as a game source-code repository unless code is separately present and the user asks for code work.
- Do not send files or images to external services unless the user explicitly asks for that action or the current task requires external research and the environment allows it.
- Do not write API keys or private credentials into Markdown or YAML output.
- Preserve human-written notes unless the user asks you to edit them.
