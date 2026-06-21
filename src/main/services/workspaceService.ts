import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import {
  NodeType,
  ProjectStage,
  type ContentNode,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
  type WorkspaceConfig,
  type WorkspaceCreationSummary,
  type WorkspaceImportSummary
} from '../../shared/index.js';
import type { WorkspaceImportSnapshot } from './sqliteService.js';

export const WORKSPACE_CONTEXT_DIR_NAME = 'game-context';
export const WORKSPACE_SCHEMA_VERSION = 1;

interface CreateWorkspaceStructureOptions {
  selectedDirectory: string;
  now?: Date;
}

interface CreatePathResult {
  path: string;
  created: boolean;
}

interface ImportedWorkspaceData {
  summary: WorkspaceImportSummary;
  snapshot: WorkspaceImportSnapshot;
}

interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

interface ManifestModuleEntry {
  path?: string;
}

interface ManifestContentEntry {
  path?: string;
}

interface ManifestImageEntry {
  name?: string;
  path?: string;
  file_type?: string;
  linked_nodes?: string[];
}

interface ImageCatalogEntry {
  name?: string;
  original_file_name?: string;
  path?: string;
  file_type?: string;
  game_id?: string;
  uploader_id?: string;
  updated_at?: string;
  notes?: string | null;
  linked_nodes?: string[];
}

export function createWorkspaceStructure(
  options: CreateWorkspaceStructureOptions
): WorkspaceCreationSummary {
  const rootPath = resolve(options.selectedDirectory);
  const contextPath = join(rootPath, WORKSPACE_CONTEXT_DIR_NAME);
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const workspaceId = createWorkspaceId(contextPath);
  const createdPaths: string[] = [];
  const existingPaths: string[] = [];

  for (const directoryPath of [contextPath, join(contextPath, 'games')]) {
    const result = ensureDirectory(directoryPath);
    pushPathResult(rootPath, result, createdPaths, existingPaths);
  }

  const manifest = createInitialManifest(timestamp);
  const files = {
    agentsPath: join(contextPath, 'AGENTS.md'),
    claudePath: join(contextPath, 'CLAUDE.md'),
    usagePath: join(contextPath, 'USAGE.md'),
    readmePath: join(contextPath, 'README.md'),
    manifestPath: join(contextPath, 'manifest.yml'),
    gamesPath: join(contextPath, 'games')
  };

  const fileResults = [
    writeTextFileIfMissing(files.agentsPath, DOWNSTREAM_AGENTS_MD),
    writeTextFileIfMissing(files.claudePath, DOWNSTREAM_CLAUDE_MD),
    writeTextFileIfMissing(files.usagePath, DOWNSTREAM_USAGE_MD),
    writeTextFileIfMissing(files.readmePath, WORKSPACE_README_MD),
    writeTextFileIfMissing(files.manifestPath, stringify(manifest))
  ];

  for (const result of fileResults) {
    pushPathResult(rootPath, result, createdPaths, existingPaths);
  }

  return {
    id: workspaceId,
    rootPath,
    contextPath,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    files,
    createdPaths,
    existingPaths
  };
}

export function importWorkspaceFromDirectory(selectedDirectory: string, currentUserId?: string, now = new Date()): ImportedWorkspaceData {
  const contextPath = resolveContextPath(selectedDirectory);
  const rootPath = dirname(contextPath);
  const timestamp = now.toISOString();
  const workspaceId = createWorkspaceId(contextPath);
  const manifestPath = join(contextPath, 'manifest.yml');
  const manifest = readYamlFile(manifestPath);
  const warnings: string[] = [];

  if (!existsSync(join(contextPath, 'games'))) {
    throw new Error(`Invalid game-context workspace: missing ${join(contextPath, 'games')}`);
  }

  if (!existsSync(manifestPath)) {
    warnings.push('manifest.yml is missing; scanned Markdown frontmatter instead.');
  }

  const gameMarkdownPath = findGameMarkdownPath(contextPath, manifest);
  const game = parseGameNode(gameMarkdownPath, timestamp);
  const modulePaths = findNodeMarkdownPaths(contextPath, manifest, 'modules', game.id);
  const contentPaths = findNodeMarkdownPaths(contextPath, manifest, 'contents', game.id);
  const modules = modulePaths.map((filePath) => parseModuleNode(filePath, game, timestamp));
  const contents = contentPaths.map((filePath) => parseContentNode(filePath, game, timestamp));
  const images = parseImages(contextPath, game, manifest, timestamp);
  const imageLinks = buildImageLinks(game, modules, contents, images, manifest);
  const users = collectImportedUsers(game, modules, contents, images, currentUserId, timestamp);
  const workspace: WorkspaceConfig = {
    id: workspaceId,
    rootPath,
    contextPath,
    activeGameId: game.id,
    currentUserId: currentUserId ?? users[0]?.id,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const summary: WorkspaceImportSummary = {
    id: workspace.id,
    rootPath,
    contextPath,
    schemaVersion: workspace.schemaVersion,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    files: {
      agentsPath: join(contextPath, 'AGENTS.md'),
      claudePath: join(contextPath, 'CLAUDE.md'),
      usagePath: join(contextPath, 'USAGE.md'),
      readmePath: join(contextPath, 'README.md'),
      manifestPath,
      gamesPath: join(contextPath, 'games')
    },
    createdPaths: [],
    existingPaths: getExistingWorkspacePaths(rootPath, contextPath),
    imported: {
      gameCount: 1,
      moduleCount: modules.length,
      contentCount: contents.length,
      imageCount: images.length
    },
    warnings
  };

  return {
    summary,
    snapshot: {
      workspace,
      users,
      game,
      modules,
      contents,
      images,
      imageLinks
    }
  };
}

function createWorkspaceId(contextPath: string): string {
  const hash = createHash('sha256').update(resolve(contextPath).toLowerCase()).digest('hex');
  return `workspace_${hash.slice(0, 16)}`;
}

function resolveContextPath(selectedDirectory: string): string {
  const selectedPath = resolve(selectedDirectory);

  if (basename(selectedPath) === WORKSPACE_CONTEXT_DIR_NAME) {
    return selectedPath;
  }

  const nestedContextPath = join(selectedPath, WORKSPACE_CONTEXT_DIR_NAME);

  if (existsSync(nestedContextPath)) {
    return nestedContextPath;
  }

  throw new Error(`Select an existing ${WORKSPACE_CONTEXT_DIR_NAME} folder or its parent folder.`);
}

function readYamlFile(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) {
    return {};
  }

  const parsed = parse(readFileSync(filePath, 'utf8'));

  return isRecord(parsed) ? parsed : {};
}

function findGameMarkdownPath(contextPath: string, manifest: Record<string, unknown>): string {
  const manifestGame = isRecord(manifest.game) ? manifest.game : undefined;
  const manifestPath = stringValue(manifestGame?.path);

  if (manifestPath) {
    return requireFile(contextPath, manifestPath);
  }

  const gamesPath = join(contextPath, 'games');
  const gameMarkdownPaths = listDirectories(gamesPath)
    .map((gameDirectory) => join(gameDirectory, 'game.md'))
    .filter((filePath) => existsSync(filePath));

  if (gameMarkdownPaths.length === 0) {
    throw new Error(`No game.md found under ${gamesPath}`);
  }

  if (gameMarkdownPaths.length > 1) {
    throw new Error(`Multiple game.md files found; MVP import supports one game workspace only: ${gameMarkdownPaths.join(', ')}`);
  }

  return gameMarkdownPaths[0];
}

function findNodeMarkdownPaths(
  contextPath: string,
  manifest: Record<string, unknown>,
  key: 'modules' | 'contents',
  gameId: string
): string[] {
  const manifestEntries = isRecord(manifest[key]) ? Object.values(manifest[key]) : [];
  const manifestPaths = manifestEntries
    .map((entry) => stringValue((entry as ManifestModuleEntry | ManifestContentEntry).path))
    .filter((filePath): filePath is string => Boolean(filePath));

  if (manifestPaths.length > 0) {
    return manifestPaths.map((filePath) => requireFile(contextPath, filePath));
  }

  const directoryName = key === 'modules' ? 'modules' : 'contents';
  const directoryPath = join(contextPath, 'games', gameId, directoryName);

  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => join(directoryPath, fileName))
    .sort((left, right) => left.localeCompare(right));
}

function requireFile(contextPath: string, relativePath: string): string {
  const filePath = join(contextPath, relativePath);

  if (!existsSync(filePath)) {
    throw new Error(`Referenced file is missing: ${filePath}`);
  }

  return filePath;
}

function parseGameNode(filePath: string, fallbackTimestamp: string): GameNode {
  const parsed = parseMarkdownWithFrontmatter(filePath);
  const nodeId = requiredString(parsed.frontmatter.node_id, `game node_id in ${filePath}`);
  const gameName = requiredString(parsed.frontmatter.game_name, `game_name in ${filePath}`);
  const createdAt = stringValue(parsed.frontmatter.created_at) ?? stringValue(parsed.frontmatter.updated_at) ?? fallbackTimestamp;
  const updatedAt = stringValue(parsed.frontmatter.updated_at) ?? createdAt;

  return {
    nodeType: NodeType.Game,
    id: nodeId,
    gameName,
    gameVersion: requiredString(parsed.frontmatter.game_version, `game_version in ${filePath}`),
    projectStage: parseProjectStage(parsed.frontmatter.project_stage),
    gameGenre: optionalSection(parsed.body, '游戏类型'),
    coreGameplay: optionalSection(parsed.body, '核心玩法'),
    mainFun: optionalSection(parsed.body, '主要乐趣'),
    targetUsers: optionalSection(parsed.body, '目标用户'),
    currentOperationGoal: optionalSection(parsed.body, '当前运营目标'),
    currentMainProblems: optionalSection(parsed.body, '当前主要问题'),
    mainOptimizationDirections: optionalSection(parsed.body, '主要优化方向'),
    notes: optionalSection(parsed.body, '补充说明'),
    coverImageId: optionalString(parsed.frontmatter.cover_image) ?? optionalSection(parsed.body, '主图ID'),
    creatorId: requiredString(parsed.frontmatter.creator_id, `creator_id in ${filePath}`),
    lastEditorId: requiredString(parsed.frontmatter.last_editor_id, `last_editor_id in ${filePath}`),
    createdAt,
    updatedAt
  };
}

function parseModuleNode(filePath: string, game: GameNode, fallbackTimestamp: string): ModuleNode {
  const parsed = parseMarkdownWithFrontmatter(filePath);
  const createdAt = stringValue(parsed.frontmatter.created_at) ?? stringValue(parsed.frontmatter.updated_at) ?? fallbackTimestamp;
  const updatedAt = stringValue(parsed.frontmatter.updated_at) ?? createdAt;

  return {
    nodeType: NodeType.Module,
    id: requiredString(parsed.frontmatter.node_id, `module node_id in ${filePath}`),
    gameId: stringValue(parsed.frontmatter.game_id) ?? game.id,
    gameVersion: stringValue(parsed.frontmatter.game_version) ?? game.gameVersion,
    moduleName: requiredString(parsed.frontmatter.module_name, `module_name in ${filePath}`),
    modulePositioning: optionalSection(parsed.body, '模块定位'),
    systemRules: optionalSection(parsed.body, '系统规则'),
    resourceFlow: optionalSection(parsed.body, '资源产出/消耗'),
    imageIds: stringArrayValue(parsed.frontmatter.images),
    playerMainActions: optionalSection(parsed.body, '玩家主要操作'),
    subjectiveFun: optionalSection(parsed.body, '乐趣点（主观）'),
    subjectiveProblems: optionalSection(parsed.body, '主要问题（主观）'),
    subjectiveOptimizationDirections: optionalSection(parsed.body, '优化方向（主观）'),
    creatorId: requiredString(parsed.frontmatter.creator_id, `creator_id in ${filePath}`),
    lastEditorId: requiredString(parsed.frontmatter.last_editor_id, `last_editor_id in ${filePath}`),
    createdAt,
    updatedAt
  };
}

function parseContentNode(filePath: string, game: GameNode, fallbackTimestamp: string): ContentNode {
  const parsed = parseMarkdownWithFrontmatter(filePath);
  const createdAt = stringValue(parsed.frontmatter.created_at) ?? stringValue(parsed.frontmatter.updated_at) ?? fallbackTimestamp;
  const updatedAt = stringValue(parsed.frontmatter.updated_at) ?? createdAt;

  return {
    nodeType: NodeType.Content,
    id: requiredString(parsed.frontmatter.node_id, `content node_id in ${filePath}`),
    gameId: stringValue(parsed.frontmatter.game_id) ?? game.id,
    gameVersion: stringValue(parsed.frontmatter.game_version) ?? game.gameVersion,
    moduleId: requiredString(parsed.frontmatter.module_id, `module_id in ${filePath}`),
    title: requiredString(parsed.frontmatter.title, `title in ${filePath}`),
    imageIds: stringArrayValue(parsed.frontmatter.images),
    accountDay: optionalString(parsed.frontmatter.account_day),
    cumulativePaymentAmount: optionalString(parsed.frontmatter.cumulative_payment_amount),
    maxMainlineProgress: optionalString(parsed.frontmatter.max_mainline_progress),
    characterLevel: optionalString(parsed.frontmatter.character_level),
    processDescription: optionalSection(parsed.body, '过程说明'),
    subjectiveFun: optionalSection(parsed.body, '乐趣点（主观）'),
    subjectiveKnownProblems: optionalSection(parsed.body, '已知问题（主观）'),
    subjectiveOptimizationDirections: optionalSection(parsed.body, '优化方向（主观）'),
    creatorId: requiredString(parsed.frontmatter.creator_id, `creator_id in ${filePath}`),
    lastEditorId: requiredString(parsed.frontmatter.last_editor_id, `last_editor_id in ${filePath}`),
    createdAt,
    updatedAt
  };
}

function parseMarkdownWithFrontmatter(filePath: string): ParsedMarkdown {
  const markdown = readFileSync(filePath, 'utf8');
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    throw new Error(`Markdown file is missing YAML frontmatter: ${filePath}`);
  }

  const parsed = parse(match[1]);

  if (!isRecord(parsed)) {
    throw new Error(`YAML frontmatter is not an object: ${filePath}`);
  }

  return {
    frontmatter: parsed,
    body: markdown.slice(match[0].length)
  };
}

function parseImages(
  contextPath: string,
  game: GameNode,
  manifest: Record<string, unknown>,
  fallbackTimestamp: string
): ImageAsset[] {
  const catalogPath = join(contextPath, 'games', game.id, 'image_catalog.yml');
  const catalog = readYamlFile(catalogPath);
  const catalogImages = isRecord(catalog.images) ? catalog.images : {};
  const manifestImages = isRecord(manifest.images) ? manifest.images : {};
  const imageIds = new Set([...Object.keys(catalogImages), ...Object.keys(manifestImages)]);

  return [...imageIds].sort((left, right) => left.localeCompare(right)).map((imageId) => {
    const catalogEntry = isRecord(catalogImages[imageId]) ? catalogImages[imageId] as ImageCatalogEntry : {};
    const manifestEntry = isRecord(manifestImages[imageId]) ? manifestImages[imageId] as ManifestImageEntry : {};
    const relativePath = stringValue(catalogEntry.path) ?? stringValue(manifestEntry.path);

    if (!relativePath) {
      throw new Error(`Image ${imageId} is missing path in manifest or image_catalog.yml.`);
    }

    return {
      id: imageId,
      displayName: stringValue(catalogEntry.name) ?? stringValue(manifestEntry.name) ?? imageId,
      originalFileName: stringValue(catalogEntry.original_file_name) ?? basename(relativePath),
      relativePath,
      fileType: stringValue(catalogEntry.file_type) ?? stringValue(manifestEntry.file_type) ?? fileTypeFromPath(relativePath),
      gameId: stringValue(catalogEntry.game_id) ?? game.id,
      uploaderId: stringValue(catalogEntry.uploader_id) ?? game.creatorId,
      updatedAt: stringValue(catalogEntry.updated_at) ?? fallbackTimestamp,
      notes: optionalString(catalogEntry.notes)
    };
  });
}

function buildImageLinks(
  game: GameNode,
  modules: ModuleNode[],
  contents: ContentNode[],
  images: ImageAsset[],
  manifest: Record<string, unknown>
): NodeImageLink[] {
  const imageIds = new Set(images.map((image) => image.id));
  const links = new Map<string, NodeImageLink>();

  if (game.coverImageId && imageIds.has(game.coverImageId)) {
    addImageLink(links, NodeType.Game, game.id, game.coverImageId);
  }

  for (const module of modules) {
    for (const imageId of module.imageIds) {
      if (imageIds.has(imageId)) {
        addImageLink(links, NodeType.Module, module.id, imageId);
      }
    }
  }

  for (const content of contents) {
    for (const imageId of content.imageIds) {
      if (imageIds.has(imageId)) {
        addImageLink(links, NodeType.Content, content.id, imageId);
      }
    }
  }

  const manifestImages = isRecord(manifest.images) ? manifest.images : {};
  for (const [imageId, entry] of Object.entries(manifestImages)) {
    if (!imageIds.has(imageId) || !isRecord(entry)) {
      continue;
    }

    for (const linkedNode of stringArrayValue((entry as ManifestImageEntry).linked_nodes)) {
      const [nodeType, nodeId] = linkedNode.split(':');

      if (isNodeType(nodeType) && nodeId) {
        addImageLink(links, nodeType, nodeId, imageId);
      }
    }
  }

  return [...links.values()].sort((left, right) =>
    `${left.nodeType}:${left.nodeId}:${left.imageId}`.localeCompare(`${right.nodeType}:${right.nodeId}:${right.imageId}`)
  );
}

function addImageLink(links: Map<string, NodeImageLink>, nodeType: NodeType, nodeId: string, imageId: string): void {
  links.set(`${nodeType}:${nodeId}:${imageId}`, {
    nodeType,
    nodeId,
    imageId
  });
}

function collectImportedUsers(
  game: GameNode,
  modules: ModuleNode[],
  contents: ContentNode[],
  images: ImageAsset[],
  currentUserId: string | undefined,
  fallbackTimestamp: string
): LocalUser[] {
  const users = new Map<string, LocalUser>();

  addImportedUser(users, game.creatorId, game.creatorId, game.createdAt);
  addImportedUser(users, game.lastEditorId, game.lastEditorId, game.updatedAt);

  for (const module of modules) {
    addImportedUser(users, module.creatorId, module.creatorId, module.createdAt);
    addImportedUser(users, module.lastEditorId, module.lastEditorId, module.updatedAt);
  }

  for (const content of contents) {
    addImportedUser(users, content.creatorId, content.creatorId, content.createdAt);
    addImportedUser(users, content.lastEditorId, content.lastEditorId, content.updatedAt);
  }

  for (const image of images) {
    addImportedUser(users, image.uploaderId, image.uploaderId, image.updatedAt);
  }

  if (currentUserId) {
    addImportedUser(users, currentUserId, currentUserId, fallbackTimestamp);
  }

  return [...users.values()];
}

function addImportedUser(users: Map<string, LocalUser>, userId: string, displayName: string, timestamp: string): void {
  if (!userId || users.has(userId)) {
    return;
  }

  users.set(userId, {
    id: userId,
    displayName,
    createdAt: timestamp,
    lastLoginAt: timestamp
  });
}

function getExistingWorkspacePaths(rootPath: string, contextPath: string): string[] {
  return [
    contextPath,
    join(contextPath, 'AGENTS.md'),
    join(contextPath, 'CLAUDE.md'),
    join(contextPath, 'USAGE.md'),
    join(contextPath, 'README.md'),
    join(contextPath, 'manifest.yml'),
    join(contextPath, 'games')
  ]
    .filter((filePath) => existsSync(filePath))
    .map((filePath) => relative(rootPath, filePath).replaceAll('\\', '/'));
}

function listDirectories(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath)
    .map((fileName) => join(directoryPath, fileName))
    .filter((filePath) => statSync(filePath).isDirectory())
    .sort((left, right) => left.localeCompare(right));
}

function extractSection(body: string, title: string): string | undefined {
  const escapedTitle = title.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = body.match(new RegExp(`^##\\s+${escapedTitle}\\s*\\r?\\n([\\s\\S]*?)(?=^##\\s+|\\s*$)`, 'm'));

  return match?.[1]?.trim();
}

function optionalSection(body: string, title: string): string | undefined {
  const value = extractSection(body, title);

  return value ? value : undefined;
}

function parseProjectStage(value: unknown): ProjectStage {
  const stage = stringValue(value);

  switch (stage) {
    case ProjectStage.Planning:
    case '立项':
      return ProjectStage.Planning;
    case ProjectStage.Testing:
    case '测试':
      return ProjectStage.Testing;
    case ProjectStage.Live:
    case '上线':
      return ProjectStage.Live;
    case ProjectStage.PreClosure:
    case '预备结项':
      return ProjectStage.PreClosure;
    default:
      return ProjectStage.Testing;
  }
}

function requiredString(value: unknown, label: string): string {
  const text = stringValue(value);

  if (!text) {
    throw new Error(`Missing required ${label}.`);
  }

  return text;
}

function optionalString(value: unknown): string | undefined {
  const text = stringValue(value);

  return text ? text : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function stringArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => stringValue(item)).filter((item): item is string => Boolean(item)))];
}

function fileTypeFromPath(filePath: string): string {
  const extension = extname(filePath).replace(/^\./, '').toLowerCase();

  return extension || 'unknown';
}

function isNodeType(value: string): value is NodeType {
  return value === NodeType.Game || value === NodeType.Module || value === NodeType.Content;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureDirectory(directoryPath: string): CreatePathResult {
  if (existsSync(directoryPath)) {
    return {
      path: directoryPath,
      created: false
    };
  }

  mkdirSync(directoryPath, { recursive: true });

  return {
    path: directoryPath,
    created: true
  };
}

function writeTextFileIfMissing(filePath: string, content: string): CreatePathResult {
  if (existsSync(filePath)) {
    return {
      path: filePath,
      created: false
    };
  }

  atomicWriteTextFile(filePath, content);

  return {
    path: filePath,
    created: true
  };
}

function atomicWriteTextFile(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = join(
    dirname(filePath),
    `.${basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  writeFileSync(temporaryPath, content, 'utf8');
  renameSync(temporaryPath, filePath);
}

function pushPathResult(
  rootPath: string,
  result: CreatePathResult,
  createdPaths: string[],
  existingPaths: string[]
): void {
  const relativePath = relative(rootPath, result.path).replaceAll('\\', '/');

  if (result.created) {
    createdPaths.push(relativePath);
  } else {
    existingPaths.push(relativePath);
  }
}

function createInitialManifest(generatedAt: string): Record<string, unknown> {
  return {
    workspace: {
      schema_version: WORKSPACE_SCHEMA_VERSION,
      generated_at: generatedAt,
      usage: 'USAGE.md',
      agents: 'AGENTS.md',
      claude: 'CLAUDE.md'
    },
    game: null,
    modules: {},
    contents: {},
    images: {},
    relations: {
      node_images: {}
    },
    task_context_entries: {
      start_here: 'USAGE.md',
      manifest: 'manifest.yml',
      games: 'games/'
    }
  };
}

const DOWNSTREAM_AGENTS_MD = `# AGENTS.md

This file is for agents reading this generated game context workspace.

## How To Read This Workspace

1. Open \`manifest.yml\` first.
2. Use the manifest to find the game node, module nodes, content nodes, images, and relation indexes.
3. Read \`USAGE.md\` for the general workflow before making task-specific assumptions.
4. Treat Markdown files plus YAML frontmatter as the source of truth for agent-facing context.
5. Respect manual \`@image_id\` references in node content. They point to images listed in the manifest and image catalog.

## Boundaries

- Do not require the GUI to understand this workspace.
- Do not send files or images to external services unless the user explicitly asks for that.
- Do not write API keys or private credentials into Markdown or YAML output.
- Preserve human-written notes unless the user asks you to edit them.
`;

const DOWNSTREAM_CLAUDE_MD = `# CLAUDE.md

This workspace contains local, agent-readable game context.

Start with \`manifest.yml\`, then read \`USAGE.md\`. Use the manifest paths to load the game, module, content, and image context needed for the current task.

When content mentions \`@image_id\`, resolve the image through \`manifest.yml\` or the per-game \`image_catalog.yml\` when it exists.

Do not assume missing nodes exist. If a referenced file is missing, report the missing path clearly instead of inventing context.
`;

const DOWNSTREAM_USAGE_MD = `# Game Context Workspace Usage

This folder is generated by Game Context Manager for humans and agents.

## Recommended Reading Order

1. Read \`manifest.yml\`.
2. Read the game node path listed under \`game.path\` when a game exists.
3. Read relevant module files under \`modules\`.
4. Read relevant content files under \`contents\`.
5. Resolve screenshots and other images through \`images\` and any per-game \`image_catalog.yml\`.

## File Roles

- \`manifest.yml\`: machine-readable live directory.
- \`AGENTS.md\`: generic instructions for Codex-style agents.
- \`CLAUDE.md\`: generic instructions for Claude Code and compatible tools.
- \`USAGE.md\`: general workflow for any reader.
- \`games/\`: generated game context files and image assets.

## Image References

Node Markdown may refer to images with \`@image_id\`. Keep those references intact unless the user asks you to edit the node.
`;

const WORKSPACE_README_MD = `# Game Context Workspace

This is a local game context workspace generated by Game Context Manager.

The workspace is intentionally plain files: Markdown, YAML, and image assets. Agents can read it without opening the GUI.

Start with \`manifest.yml\` and \`USAGE.md\`.
`;
