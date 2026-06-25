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

export const WORKSPACE_MARKER_FILE_NAME = '.game-context-manager.yml';
export const WORKSPACE_GENERATOR_ID = 'game-context-manager';
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

interface WorkspaceMarker {
  schema_version?: number;
  workspace_id?: string;
  generator?: string;
  created_at?: string;
  updated_at?: string;
  main_node_id?: string | null;
  main_node_folder_name?: string | null;
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
  const contextPath = rootPath;
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const workspaceId = createWorkspaceId(contextPath);
  const createdPaths: string[] = [];
  const existingPaths: string[] = [];
  const markerPath = join(contextPath, WORKSPACE_MARKER_FILE_NAME);

  for (const directoryPath of [contextPath]) {
    const result = ensureDirectory(directoryPath);
    pushPathResult(rootPath, result, createdPaths, existingPaths);
  }

  const files = {
    agentsPath: join(contextPath, 'AGENTS.md'),
    claudePath: join(contextPath, 'CLAUDE.md'),
    manifestPath: join(contextPath, 'manifest.yml'),
    markerPath
  };

  const marker = createWorkspaceMarker({
    workspaceId,
    createdAt: timestamp,
    updatedAt: timestamp
  });
  const fileResults = [writeTextFileIfMissing(markerPath, stringify(marker))];

  for (const result of fileResults) {
    pushPathResult(rootPath, result, createdPaths, existingPaths);
  }

  return {
    id: workspaceId,
    rootPath,
    contextPath,
    markerPath,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    files,
    createdPaths,
    existingPaths
  };
}

export function importWorkspaceFromDirectory(selectedDirectory: string, currentUserId?: string, now = new Date()): ImportedWorkspaceData {
  const markerPath = resolveSingleWorkspaceMarkerPath(selectedDirectory);
  const contextPath = dirname(markerPath);
  const rootPath = contextPath;
  const timestamp = now.toISOString();
  const marker = readWorkspaceMarker(markerPath);
  const workspaceId = marker.workspace_id ?? createWorkspaceId(contextPath);
  const manifestPath = join(contextPath, 'manifest.yml');
  const manifest = readYamlFile(manifestPath);
  const warnings: string[] = [];

  if (!existsSync(manifestPath)) {
    warnings.push('manifest.yml is missing; scanned Markdown frontmatter instead.');
  }

  const markerGameFolderName = stringValue(marker.main_node_folder_name);
  const gameMarkdownPath = findOptionalGameMarkdownPath(contextPath, manifest, markerGameFolderName, warnings);
  const gameFolderName = gameMarkdownPath ? basename(dirname(gameMarkdownPath)) : undefined;

  if (gameFolderName && !existsSync(join(contextPath, gameFolderName, 'INDEX.md'))) {
    warnings.push('INDEX.md is missing; scanned node Markdown files instead.');
  }

  if (gameFolderName && !existsSync(join(contextPath, gameFolderName, 'image_catalog.yml'))) {
    warnings.push('image_catalog.yml is missing; scanned image files and node frontmatter instead.');
  }

  const game = gameMarkdownPath ? parseGameNode(gameMarkdownPath, timestamp) : undefined;
  const modulePaths = game && gameFolderName ? findNodeMarkdownPaths(contextPath, manifest, 'modules', gameFolderName, warnings) : [];
  const contentPaths = game && gameFolderName ? findNodeMarkdownPaths(contextPath, manifest, 'contents', gameFolderName, warnings) : [];
  const modules = game ? modulePaths.map((filePath) => parseModuleNode(filePath, game, timestamp)) : [];
  const contents = game ? contentPaths.map((filePath) => parseContentNode(filePath, game, timestamp)) : [];
  const images = game && gameFolderName ? parseImages(contextPath, gameFolderName, game, manifest, timestamp, warnings) : [];
  const imageLinks = game ? buildImageLinks(game, modules, contents, images, manifest) : [];
  const users = collectImportedUsers(game, modules, contents, images, currentUserId, timestamp);
  const workspace: WorkspaceConfig = {
    id: workspaceId,
    rootPath,
    contextPath,
    markerPath,
    activeGameId: game?.id,
    activeGameFolderName: gameFolderName,
    currentUserId: currentUserId ?? users[0]?.id,
    directoryIndexNeedsExport: warnings.some(isDirectoryIndexWarning),
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const summary: WorkspaceImportSummary = {
    id: workspace.id,
    rootPath,
    contextPath,
    markerPath,
    schemaVersion: workspace.schemaVersion,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    files: {
      agentsPath: join(contextPath, 'AGENTS.md'),
      claudePath: join(contextPath, 'CLAUDE.md'),
      manifestPath,
      markerPath
    },
    createdPaths: [],
    existingPaths: getExistingWorkspacePaths(rootPath, contextPath, gameFolderName),
    imported: {
      gameCount: game ? 1 : 0,
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

export function writeWorkspaceMarker(workspace: WorkspaceConfig, game?: GameNode, now = new Date()): void {
  const markerPath = workspace.markerPath ?? join(workspace.contextPath, WORKSPACE_MARKER_FILE_NAME);
  const existingMarker = existsSync(markerPath) ? readWorkspaceMarker(markerPath) : undefined;
  const timestamp = now.toISOString();
  const marker = createWorkspaceMarker({
    workspaceId: workspace.id,
    createdAt: stringValue(existingMarker?.created_at) ?? workspace.createdAt,
    updatedAt: timestamp,
    mainNodeId: game?.id ?? workspace.activeGameId,
    mainNodeFolderName: workspace.activeGameFolderName
  });

  atomicWriteTextFile(markerPath, stringify(marker));
}

export function createGameFolderName(gameName: string): string {
  const folderName = `${gameName.trim()}游戏上下文`
    .trim()
    .replaceAll(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^\.+|\.+$/g, '')
    .replaceAll(/^-+|-+$/g, '');

  return folderName || '游戏上下文';
}

function createWorkspaceId(contextPath: string): string {
  const hash = createHash('sha256').update(resolve(contextPath).toLowerCase()).digest('hex');
  return `workspace_${hash.slice(0, 16)}`;
}

function createWorkspaceMarker(input: {
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  mainNodeId?: string;
  mainNodeFolderName?: string;
}): WorkspaceMarker {
  return {
    schema_version: WORKSPACE_SCHEMA_VERSION,
    workspace_id: input.workspaceId,
    generator: WORKSPACE_GENERATOR_ID,
    created_at: input.createdAt,
    updated_at: input.updatedAt,
    main_node_id: input.mainNodeId ?? null,
    main_node_folder_name: input.mainNodeFolderName ?? null
  };
}

function resolveSingleWorkspaceMarkerPath(selectedDirectory: string): string {
  const selectedPath = resolve(selectedDirectory);
  const markerPaths = findWorkspaceMarkerPaths(selectedPath).filter((filePath) => {
    try {
      readWorkspaceMarker(filePath);
      return true;
    } catch {
      return false;
    }
  });

  if (markerPaths.length === 0) {
    throw new Error('No valid .game-context-manager.yml marker was found in the selected folder.');
  }

  if (markerPaths.length > 1) {
    throw new Error(`Multiple game context workspace markers were found: ${markerPaths.join(', ')}`);
  }

  return markerPaths[0];
}

function findWorkspaceMarkerPaths(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  const stats = statSync(directoryPath);

  if (!stats.isDirectory()) {
    return [];
  }

  const markerPaths: string[] = [];

  for (const entryName of readdirSync(directoryPath)) {
    const entryPath = join(directoryPath, entryName);
    const entryStats = statSync(entryPath);

    if (entryStats.isFile() && entryName === WORKSPACE_MARKER_FILE_NAME) {
      markerPaths.push(entryPath);
      continue;
    }

    if (entryStats.isDirectory()) {
      markerPaths.push(...findWorkspaceMarkerPaths(entryPath));
    }
  }

  return markerPaths.sort((left, right) => left.localeCompare(right));
}

function readWorkspaceMarker(markerPath: string): WorkspaceMarker {
  const parsed = parse(readFileSync(markerPath, 'utf8'));

  if (!isRecord(parsed)) {
    throw new Error(`Workspace marker is not a YAML object: ${markerPath}`);
  }

  const marker = parsed as WorkspaceMarker;

  if (marker.schema_version !== WORKSPACE_SCHEMA_VERSION) {
    throw new Error(`Unsupported workspace marker schema version in ${markerPath}`);
  }

  if (marker.generator !== WORKSPACE_GENERATOR_ID) {
    throw new Error(`Unsupported workspace marker generator in ${markerPath}`);
  }

  if (!stringValue(marker.workspace_id)) {
    throw new Error(`Workspace marker is missing workspace_id: ${markerPath}`);
  }

  return marker;
}

function readYamlFile(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) {
    return {};
  }

  const parsed = parse(readFileSync(filePath, 'utf8'));

  return isRecord(parsed) ? parsed : {};
}

function findGameMarkdownPath(
  contextPath: string,
  manifest: Record<string, unknown>,
  markerGameFolderName: string | undefined,
  warnings: string[]
): string {
  const manifestGame = isRecord(manifest.game) ? manifest.game : undefined;
  const manifestPath = stringValue(manifestGame?.path);

  if (manifestPath) {
    const manifestGamePath = resolveExistingReferencedFile(contextPath, manifestPath);

    if (manifestGamePath) {
      return manifestGamePath;
    }

    warnings.push(`manifest.yml references missing game file: ${manifestPath}; scanned workspace instead.`);
  }

  if (markerGameFolderName) {
    const markerGamePath = resolveExistingReferencedFile(contextPath, `${markerGameFolderName}/game.md`);

    if (markerGamePath) {
      return markerGamePath;
    }

    warnings.push(`Workspace marker references missing game file: ${markerGameFolderName}/game.md; scanned workspace instead.`);
  }

  const gameMarkdownPaths = listDirectories(contextPath)
    .map((gameDirectory) => join(gameDirectory, 'game.md'))
    .filter((filePath) => existsSync(filePath));

  if (gameMarkdownPaths.length === 0) {
    throw new Error(`No game.md found under ${contextPath}`);
  }

  if (gameMarkdownPaths.length > 1) {
    throw new Error(`Multiple game.md files found; MVP import supports one game workspace only: ${gameMarkdownPaths.join(', ')}`);
  }

  return gameMarkdownPaths[0];
}

function findOptionalGameMarkdownPath(
  contextPath: string,
  manifest: Record<string, unknown>,
  markerGameFolderName: string | undefined,
  warnings: string[]
): string | undefined {
  try {
    return findGameMarkdownPath(contextPath, manifest, markerGameFolderName, warnings);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No game.md found under')) {
      return undefined;
    }

    throw error;
  }
}

function findNodeMarkdownPaths(
  contextPath: string,
  manifest: Record<string, unknown>,
  key: 'modules' | 'contents',
  gameFolderName: string,
  warnings: string[]
): string[] {
  const manifestEntries = isRecord(manifest[key]) ? Object.values(manifest[key]) : [];
  const manifestPaths = manifestEntries
    .map((entry) => stringValue((entry as ManifestModuleEntry | ManifestContentEntry).path))
    .filter((filePath): filePath is string => Boolean(filePath));
  const nodePaths = new Set<string>();

  for (const manifestPath of manifestPaths) {
    const filePath = resolveExistingReferencedFile(contextPath, manifestPath);

    if (filePath) {
      nodePaths.add(filePath);
    } else {
      warnings.push(`manifest.yml references missing ${key.slice(0, -1)} file: ${manifestPath}; scanned Markdown files instead.`);
    }
  }

  const modulesDirectoryPath = join(contextPath, gameFolderName, 'modules');

  if (!existsSync(modulesDirectoryPath)) {
    return [...nodePaths].sort((left, right) => left.localeCompare(right));
  }

  if (key === 'modules') {
    for (const filePath of listDirectories(modulesDirectoryPath)
      .map((moduleDirectory) => join(moduleDirectory, 'module.md'))
      .filter((filePath) => existsSync(filePath))
      .sort((left, right) => left.localeCompare(right))) {
      nodePaths.add(filePath);
    }

    return [...nodePaths].sort((left, right) => left.localeCompare(right));
  }

  for (const filePath of listDirectories(modulesDirectoryPath)
    .flatMap((moduleDirectory) => {
      const contentsDirectoryPath = join(moduleDirectory, 'contents');

      if (!existsSync(contentsDirectoryPath)) {
        return [];
      }

      return readdirSync(contentsDirectoryPath)
        .filter((fileName) => fileName.endsWith('.md'))
        .map((fileName) => join(contentsDirectoryPath, fileName));
    })
    .sort((left, right) => left.localeCompare(right))) {
    nodePaths.add(filePath);
  }

  return [...nodePaths].sort((left, right) => left.localeCompare(right));
}

function resolveExistingReferencedFile(contextPath: string, relativePath: string): string | undefined {
  const filePath = join(contextPath, relativePath);

  if (!existsSync(filePath)) {
    return undefined;
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
    subjectiveFun: optionalSectionAny(parsed.body, ['乐趣点', '乐趣点（主观）']),
    subjectiveProblems: optionalSectionAny(parsed.body, ['主要问题', '主要问题（主观）']),
    subjectiveOptimizationDirections: optionalSectionAny(parsed.body, ['优化方向', '优化方向（主观）']),
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
    subjectiveFun: optionalSectionAny(parsed.body, ['乐趣点', '乐趣点（主观）']),
    subjectiveKnownProblems: optionalSectionAny(parsed.body, ['已知问题', '已知问题（主观）']),
    subjectiveOptimizationDirections: optionalSectionAny(parsed.body, ['优化方向', '优化方向（主观）']),
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
  gameFolderName: string,
  game: GameNode,
  manifest: Record<string, unknown>,
  fallbackTimestamp: string,
  warnings: string[]
): ImageAsset[] {
  const catalogPath = join(contextPath, gameFolderName, 'image_catalog.yml');
  const catalog = readYamlFile(catalogPath);
  const catalogImages = isRecord(catalog.images) ? catalog.images : {};
  const manifestImages = isRecord(manifest.images) ? manifest.images : {};
  const imageFiles = findImageFiles(contextPath, gameFolderName);
  const imageIds = new Set([...Object.keys(catalogImages), ...Object.keys(manifestImages), ...imageFiles.keys()]);

  return [...imageIds].sort((left, right) => left.localeCompare(right)).flatMap((imageId) => {
    const catalogEntry = isRecord(catalogImages[imageId]) ? catalogImages[imageId] as ImageCatalogEntry : {};
    const manifestEntry = isRecord(manifestImages[imageId]) ? manifestImages[imageId] as ManifestImageEntry : {};
    const fallbackImage = imageFiles.get(imageId);
    const relativePath = stringValue(catalogEntry.path) ?? stringValue(manifestEntry.path) ?? fallbackImage?.relativePath;

    if (!relativePath) {
      throw new Error(`Image ${imageId} is missing path in manifest or image_catalog.yml.`);
    }

    if (!existsSync(join(contextPath, relativePath))) {
      warnings.push(`image_catalog.yml or manifest.yml references missing image file: ${relativePath}; skipped missing image.`);
      return [];
    }

    return {
      id: imageId,
      displayName: stringValue(catalogEntry.name) ?? stringValue(manifestEntry.name) ?? fallbackImage?.displayName ?? imageId,
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

function findImageFiles(contextPath: string, gameFolderName: string): Map<string, { displayName: string; relativePath: string }> {
  const imagesDirectoryPath = join(contextPath, gameFolderName, 'assets', 'images');
  const images = new Map<string, { displayName: string; relativePath: string }>();

  if (!existsSync(imagesDirectoryPath)) {
    return images;
  }

  for (const fileName of readdirSync(imagesDirectoryPath).sort((left, right) => left.localeCompare(right))) {
    const filePath = join(imagesDirectoryPath, fileName);

    if (!statSync(filePath).isFile()) {
      continue;
    }

    const extension = extname(fileName).toLowerCase();

    if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension)) {
      continue;
    }

    const baseName = basename(fileName, extension);
    const separatorIndex = baseName.indexOf('__');
    const imageId = separatorIndex > 0 ? baseName.slice(0, separatorIndex) : baseName;
    const displayName = separatorIndex > 0 ? baseName.slice(separatorIndex + 2) : imageId;
    const relativePath = `${gameFolderName}/assets/images/${fileName}`;

    images.set(imageId, {
      displayName,
      relativePath
    });
  }

  return images;
}

function buildImageLinks(
  game: GameNode,
  modules: ModuleNode[],
  contents: ContentNode[],
  images: ImageAsset[],
  manifest: Record<string, unknown>
): NodeImageLink[] {
  const imageIds = new Set(images.map((image) => image.id));
  const nodeKeys = new Set<string>([
    `${NodeType.Game}:${game.id}`,
    ...modules.map((module) => `${NodeType.Module}:${module.id}`),
    ...contents.map((content) => `${NodeType.Content}:${content.id}`)
  ]);
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

      if (isNodeType(nodeType) && nodeId && nodeKeys.has(`${nodeType}:${nodeId}`)) {
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
  game: GameNode | undefined,
  modules: ModuleNode[],
  contents: ContentNode[],
  images: ImageAsset[],
  currentUserId: string | undefined,
  fallbackTimestamp: string
): LocalUser[] {
  const users = new Map<string, LocalUser>();

  if (game) {
    addImportedUser(users, game.creatorId, game.creatorId, game.createdAt);
    addImportedUser(users, game.lastEditorId, game.lastEditorId, game.updatedAt);
  }

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

function getExistingWorkspacePaths(rootPath: string, contextPath: string, gameFolderName?: string): string[] {
  return [
    contextPath,
    join(contextPath, WORKSPACE_MARKER_FILE_NAME),
    join(contextPath, 'AGENTS.md'),
    join(contextPath, 'CLAUDE.md'),
    join(contextPath, 'manifest.yml'),
    ...(gameFolderName
      ? [
          join(contextPath, gameFolderName, 'INDEX.md'),
          join(contextPath, gameFolderName, 'image_catalog.yml')
        ]
      : [])
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

function optionalSectionAny(body: string, titles: string[]): string | undefined {
  for (const title of titles) {
    const value = optionalSection(body, title);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
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

function isDirectoryIndexWarning(warning: string): boolean {
  return warning.includes('manifest.yml') || warning.includes('INDEX.md') || warning.includes('image_catalog.yml');
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
