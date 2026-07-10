import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { WORKSPACE_MARKER_FILE_NAME, createGameFolderName } from './workspaceService.js';
import {
  NodeType,
  PROJECT_STAGE_LABELS,
  type ContentNode,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
  type KnownWorkspaceItem,
  type AppLanguage,
  type WorkspaceConfig
} from '../../shared/index.js';

interface ExportGameNodeOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  users: LocalUser[];
  images?: ImageAsset[];
  modules?: ModuleNode[];
  contents?: ContentNode[];
  imageLinks?: NodeImageLink[];
  now?: Date;
}

interface ExportImageCatalogOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  users: LocalUser[];
  images: ImageAsset[];
  modules?: ModuleNode[];
  contents?: ContentNode[];
  imageLinks?: NodeImageLink[];
  now?: Date;
}

interface ExportModuleNodeOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  module: ModuleNode;
  modules: ModuleNode[];
  contents?: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface ExportContentNodeOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  content: ContentNode;
  modules: ModuleNode[];
  contents: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface DeleteModuleNodeFilesOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  moduleId: string;
  contentIds: string[];
  modules: ModuleNode[];
  contents?: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface DeleteGameNodeFilesOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
}

interface DeleteContentNodeFilesOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  contentId: string;
  moduleId: string;
  modules: ModuleNode[];
  contents: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface DeleteImageAssetFilesOptions {
  workspace: WorkspaceConfig;
  game?: GameNode;
  deletedImage: ImageAsset;
  modules: ModuleNode[];
  contents: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface ExportDirectoryIndexFilesOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  modules: ModuleNode[];
  contents: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  language?: AppLanguage;
  now?: Date;
}

interface ExportGameContextFilesOptions extends ExportDirectoryIndexFilesOptions {}

interface ExportAgentInstructionFilesOptions {
  workspace: WorkspaceConfig;
  language?: AppLanguage;
}

interface GameNodeExportPaths {
  gameFolderName: string;
  gameDirectoryPath: string;
  gameMarkdownPath: string;
  gameIndexPath: string;
  modulesDirectoryPath: string;
  imagesDirectoryPath: string;
  imageCatalogPath: string;
  manifestPath: string;
}

type FieldSchemaNodeType = 'game' | 'module' | 'content';

interface NodeFieldSchemaEntry {
  field: string;
  label: Record<AppLanguage, string>;
  location: Record<AppLanguage, string>;
  useFor: Record<AppLanguage, string>;
}

export function exportGameNodeFiles(options: ExportGameNodeOptions): string {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const markdown = renderGameMarkdown(options.game, options.users);

  ensureGameDirectories(paths);
  atomicWriteTextFile(paths.gameMarkdownPath, markdown);

  return markdown;
}

export function exportImageCatalogFiles(options: ExportImageCatalogOptions): void {
  exportDirectoryIndexFiles({
    workspace: options.workspace,
    game: options.game,
    users: options.users,
    modules: options.modules ?? [],
    contents: options.contents ?? [],
    images: options.images,
    imageLinks: options.imageLinks ?? [],
    now: options.now
  });
}

export function exportModuleNodeFiles(options: ExportModuleNodeOptions): string {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const markdown = renderModuleMarkdown(options.module, options.users, options.images);

  ensureGameDirectories(paths);
  atomicWriteTextFile(getModuleMarkdownPath(paths, options.module.id), markdown);

  return markdown;
}

export function exportContentNodeFiles(options: ExportContentNodeOptions): string {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const markdown = renderContentMarkdown(options.content, options.users, options.images);

  ensureGameDirectories(paths);
  atomicWriteTextFile(getContentMarkdownPath(paths, options.content.moduleId, options.content.id), markdown);

  return markdown;
}

export function exportAgentInstructionFiles(options: ExportAgentInstructionFilesOptions): string[] {
  const agentsPath = join(options.workspace.contextPath, 'AGENTS.md');
  const language = normalizeExportLanguage(options.language);
  const content = renderDownstreamAgentsMarkdown(language);

  assertAgentInstructionFileCanBeExported(options.workspace, language);

  atomicWriteTextFile(agentsPath, content);

  return [agentsPath];
}

export function assertAgentInstructionFileCanBeExported(workspace: WorkspaceConfig, language?: AppLanguage): void {
  const agentsPath = join(workspace.contextPath, 'AGENTS.md');
  const content = renderDownstreamAgentsMarkdown(normalizeExportLanguage(language));

  if (existsSync(agentsPath) && readFileSync(agentsPath, 'utf8') !== content) {
    throw new Error('AGENTS_FILE_CONFLICT');
  }
}

export function exportDirectoryIndexFiles(options: ExportDirectoryIndexFilesOptions): string[] {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const language = normalizeExportLanguage(options.language);

  ensureGameDirectories(paths);
  writeImageCatalog(
    paths.imageCatalogPath,
    paths.gameFolderName,
    options.game,
    options.images,
    options.modules,
    options.contents,
    generatedAt,
    options.imageLinks,
    language
  );
  atomicWriteTextFile(
    paths.gameIndexPath,
    renderGameIndexMarkdown(paths.gameFolderName, options.game, options.users, options.images, options.modules, options.contents, language)
  );
  writeUpdatedManifest(paths, options.game, generatedAt, options.images, options.modules, options.contents, options.imageLinks, language);

  return [paths.manifestPath, paths.gameIndexPath, paths.imageCatalogPath];
}

export function exportGameContextFiles(options: ExportGameContextFilesOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);

  ensureGameDirectories(paths);
  atomicWriteTextFile(paths.gameMarkdownPath, renderGameMarkdown(options.game, options.users));

  for (const module of options.modules) {
    atomicWriteTextFile(getModuleMarkdownPath(paths, module.id), renderModuleMarkdown(module, options.users, options.images));
  }

  for (const content of options.contents) {
    atomicWriteTextFile(getContentMarkdownPath(paths, content.moduleId, content.id), renderContentMarkdown(content, options.users, options.images));
  }

  exportDirectoryIndexFiles(options);
}

export function deleteModuleNodeFiles(options: DeleteModuleNodeFilesOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const moduleDirectoryPath = join(paths.modulesDirectoryPath, options.moduleId);

  removeDirectoryInsideWorkspace(options.workspace, moduleDirectoryPath);
}

export function deleteGameNodeFiles(options: DeleteGameNodeFilesOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);

  removeDirectoryInsideWorkspace(options.workspace, paths.gameDirectoryPath);
  removeFileInsideWorkspace(options.workspace, join(options.workspace.contextPath, WORKSPACE_MARKER_FILE_NAME));
}

export function deleteContentNodeFiles(options: DeleteContentNodeFilesOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const contentMarkdownPath = getContentMarkdownPath(paths, options.moduleId, options.contentId);

  if (existsSync(contentMarkdownPath)) {
    unlinkSync(contentMarkdownPath);
  }
}

export function deleteImageAssetFiles(options: DeleteImageAssetFilesOptions): void {
  const imagePath = join(options.workspace.contextPath, options.deletedImage.relativePath);

  if (existsSync(imagePath)) {
    unlinkSync(imagePath);
  }

  if (!options.game) {
    return;
  }

  const paths = getGameNodeExportPaths(options.workspace, options.game);

  ensureGameDirectories(paths);
  atomicWriteTextFile(paths.gameMarkdownPath, renderGameMarkdown(options.game, options.users));

  for (const module of options.modules) {
    atomicWriteTextFile(getModuleMarkdownPath(paths, module.id), renderModuleMarkdown(module, options.users, options.images));
  }

  for (const content of options.contents) {
    atomicWriteTextFile(getContentMarkdownPath(paths, content.moduleId, content.id), renderContentMarkdown(content, options.users, options.images));
  }
}

function removeDirectoryInsideWorkspace(workspace: WorkspaceConfig, directoryPath: string): void {
  const workspaceRoot = resolve(workspace.contextPath);
  const targetPath = resolve(directoryPath);
  const relativePath = relative(workspaceRoot, targetPath);

  if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Refusing to delete a directory outside the current workspace.');
  }

  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }
}

function removeFileInsideWorkspace(workspace: WorkspaceConfig, filePath: string): void {
  const workspaceRoot = resolve(workspace.contextPath);
  const targetPath = resolve(filePath);
  const relativePath = relative(workspaceRoot, targetPath);

  if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Refusing to delete a file outside the current workspace.');
  }

  if (existsSync(targetPath)) {
    unlinkSync(targetPath);
  }
}

export function readGameMarkdownPreview(workspace: WorkspaceConfig, game: GameNode, users: LocalUser[]): string {
  const paths = getGameNodeExportPaths(workspace, game);

  if (existsSync(paths.gameMarkdownPath)) {
    return readFileSync(paths.gameMarkdownPath, 'utf8');
  }

  return renderGameMarkdown(game, users);
}

export function readModuleMarkdownPreview(
  workspace: WorkspaceConfig,
  game: GameNode,
  module: ModuleNode,
  users: LocalUser[],
  images: ImageAsset[]
): string {
  const paths = getGameNodeExportPaths(workspace, game);
  const moduleMarkdownPath = getModuleMarkdownPath(paths, module.id);

  if (existsSync(moduleMarkdownPath)) {
    return readFileSync(moduleMarkdownPath, 'utf8');
  }

  return renderModuleMarkdown(module, users, images);
}

export function readContentMarkdownPreview(
  workspace: WorkspaceConfig,
  game: GameNode,
  content: ContentNode,
  users: LocalUser[],
  images: ImageAsset[]
): string {
  const paths = getGameNodeExportPaths(workspace, game);
  const contentMarkdownPath = getContentMarkdownPath(paths, content.moduleId, content.id);

  if (existsSync(contentMarkdownPath)) {
    return readFileSync(contentMarkdownPath, 'utf8');
  }

  return renderContentMarkdown(content, users, images);
}

export function resolveKnownWorkspaceItemFilePath(options: {
  workspace: WorkspaceConfig;
  game?: GameNode;
  modules: ModuleNode[];
  contents: ContentNode[];
  images: ImageAsset[];
  item: KnownWorkspaceItem;
}): string {
  const item = options.item;

  switch (item.kind) {
    case 'indexFile': {
      if (item.fileName === 'AGENTS.md' || item.fileName === 'manifest.yml') {
        return join(options.workspace.contextPath, item.fileName);
      }

      const game = requireKnownGame(options.game);
      const paths = getGameNodeExportPaths(options.workspace, game);

      return item.fileName === 'INDEX.md' ? paths.gameIndexPath : paths.imageCatalogPath;
    }
    case 'game': {
      const game = requireKnownGame(options.game);
      const paths = getGameNodeExportPaths(options.workspace, game);

      return paths.gameMarkdownPath;
    }
    case 'module': {
      const game = requireKnownGame(options.game);
      const paths = getGameNodeExportPaths(options.workspace, game);
      const module = options.modules.find((module) => module.id === item.id);

      if (!module) {
        throw new Error(`Module node not found: ${item.id}`);
      }

      return getModuleMarkdownPath(paths, module.id);
    }
    case 'content': {
      const game = requireKnownGame(options.game);
      const paths = getGameNodeExportPaths(options.workspace, game);
      const content = options.contents.find((content) => content.id === item.id);

      if (!content) {
        throw new Error(`Content node not found: ${item.id}`);
      }

      return getContentMarkdownPath(paths, content.moduleId, content.id);
    }
    case 'image': {
      const image = options.images.find((image) => image.id === item.id);

      if (!image) {
        throw new Error(`Image asset not found: ${item.id}`);
      }

      return join(options.workspace.contextPath, image.relativePath);
    }
  }
}

export function renderGameMarkdown(game: GameNode, users: LocalUser[]): string {
  const creator = findUserDisplayName(users, game.creatorId);
  const lastEditor = findUserDisplayName(users, game.lastEditorId);
  const frontmatter = stringify({
    node_type: game.nodeType,
    node_id: game.id,
    game_name: game.gameName,
    game_version: game.gameVersion,
    project_stage: game.projectStage,
    cover_image: game.coverImageId ?? null,
    creator,
    creator_id: game.creatorId,
    last_editor: lastEditor,
    last_editor_id: game.lastEditorId,
    created_at: game.createdAt,
    updated_at: game.updatedAt
  }).trimEnd();

  const sections = [
    ['项目阶段', PROJECT_STAGE_LABELS[game.projectStage].zh],
    ['游戏类型', game.gameGenre],
    ['核心玩法', game.coreGameplay],
    ['主要乐趣', game.mainFun],
    ['目标用户', game.targetUsers],
    ['当前运营目标', game.currentOperationGoal],
    ['当前主要问题', game.currentMainProblems],
    ['主要优化方向', game.mainOptimizationDirections],
    ['主图ID', game.coverImageId]
  ]
    .map(([title, body]) => `## ${title}\n\n${body ?? ''}`)
    .join('\n\n');

  return `---\n${frontmatter}\n---\n\n# ${game.gameName}\n\n${sections}\n`;
}

export function renderModuleMarkdown(module: ModuleNode, users: LocalUser[], images: ImageAsset[]): string {
  const creator = findUserDisplayName(users, module.creatorId);
  const lastEditor = findUserDisplayName(users, module.lastEditorId);
  const moduleImages = images.filter((image) => module.imageIds.includes(image.id));
  const frontmatter = stringify({
    node_type: module.nodeType,
    node_id: module.id,
    game_id: module.gameId,
    game_version: module.gameVersion,
    module_name: module.moduleName,
    creator,
    creator_id: module.creatorId,
    last_editor: lastEditor,
    last_editor_id: module.lastEditorId,
    created_at: module.createdAt,
    updated_at: module.updatedAt,
    images: module.imageIds
  }).trimEnd();
  const imageSection =
    moduleImages.length > 0
      ? moduleImages.map((image) => `- @${image.id}: ${image.displayName}`).join('\n')
      : '';
  const sections = [
    ['模块定位', module.modulePositioning],
    ['系统规则', module.systemRules],
    ['资源产出/消耗', module.resourceFlow],
    ['关联截图', imageSection],
    ['玩家主要操作', module.playerMainActions],
    ['乐趣点', module.subjectiveFun],
    ['主要问题', module.subjectiveProblems],
    ['优化方向', module.subjectiveOptimizationDirections]
  ]
    .map(([title, body]) => `## ${title}\n\n${body ?? ''}`)
    .join('\n\n');

  return `---\n${frontmatter}\n---\n\n# ${module.moduleName}\n\n${sections}\n`;
}

export function renderContentMarkdown(content: ContentNode, users: LocalUser[], images: ImageAsset[]): string {
  const creator = findUserDisplayName(users, content.creatorId);
  const lastEditor = findUserDisplayName(users, content.lastEditorId);
  const contentImages = images.filter((image) => content.imageIds.includes(image.id));
  const frontmatter = stringify({
    node_type: content.nodeType,
    node_id: content.id,
    game_id: content.gameId,
    game_version: content.gameVersion,
    module_id: content.moduleId,
    title: content.title,
    creator,
    creator_id: content.creatorId,
    last_editor: lastEditor,
    last_editor_id: content.lastEditorId,
    created_at: content.createdAt,
    updated_at: content.updatedAt,
    account_day: content.accountDay ?? null,
    cumulative_payment_amount: content.cumulativePaymentAmount ?? null,
    max_mainline_progress: content.maxMainlineProgress ?? null,
    character_level: content.characterLevel ?? null,
    images: content.imageIds
  }).trimEnd();
  const accountStatus = [
    `- 创角天数：${content.accountDay ?? ''}`,
    `- 累计付费金额：${content.cumulativePaymentAmount ?? ''}`,
    `- 最大主线通关数：${content.maxMainlineProgress ?? ''}`,
    `- 角色等级：${content.characterLevel ?? ''}`
  ].join('\n');
  const imageSection =
    contentImages.length > 0
      ? contentImages.map((image) => `- @${image.id}: ${image.displayName}`).join('\n')
      : '';
  const sections = [
    ['账号状态', accountStatus],
    ['关联截图', imageSection],
    ['过程说明', content.processDescription],
    ['乐趣点', content.subjectiveFun],
    ['已知问题', content.subjectiveKnownProblems],
    ['优化方向', content.subjectiveOptimizationDirections]
  ]
    .map(([title, body]) => `## ${title}\n\n${body ?? ''}`)
    .join('\n\n');

  return `---\n${frontmatter}\n---\n\n# ${content.title}\n\n${sections}\n`;
}

function renderGameIndexMarkdown(
  gameFolderName: string,
  game: GameNode,
  users: LocalUser[],
  images: ImageAsset[],
  modules: ModuleNode[],
  contents: ContentNode[],
  language: AppLanguage
): string {
  const text = EXPORT_TEXT[language];
  const lastEditor = findUserDisplayName(users, game.lastEditorId);
  const moduleSection =
    modules.length > 0
      ? modules
          .map((module) => `- \`${module.id}\` ${module.moduleName}: [modules/${module.id}/module.md](modules/${module.id}/module.md)`)
          .join('\n')
      : text.noModules;
  const contentSection =
    contents.length > 0
      ? contents
          .map((content) =>
            `- \`${content.id}\` ${content.title} (${content.moduleId}): [modules/${content.moduleId}/contents/${content.id}.md](modules/${content.moduleId}/contents/${content.id}.md)`
          )
          .join('\n')
      : text.noContents;
  const imageSection =
    images.length > 0
      ? images
          .map((image) => {
            const gameRelativePrefix = `${gameFolderName}/`;
            const indexRelativePath = image.relativePath.startsWith(gameRelativePrefix)
              ? image.relativePath.slice(gameRelativePrefix.length)
              : image.relativePath;

            return `- \`${image.id}\` ${image.displayName}: [${indexRelativePath}](${indexRelativePath})`;
          })
          .join('\n')
      : text.noImages;
  const projectStageLabel = PROJECT_STAGE_LABELS[game.projectStage][language];

  return `# ${text.indexTitle(game.gameName)}

${text.indexGenerated}

## ${text.indexUsageSection}

${text.indexUsage}

## ${text.gameSection}

- ${text.nodeId}: \`${game.id}\`
- ${text.version}: \`${game.gameVersion}\`
- ${text.projectStage}: \`${projectStageLabel}\`
- ${text.gameNode}: [game.md](game.md)
- ${text.lastEditor}: ${lastEditor}
- ${text.updatedAt}: ${game.updatedAt}

## ${text.modulesSection}

${moduleSection}

## ${text.contentsSection}

${contentSection}

## ${text.imagesSection}

${imageSection}

## ${text.fieldSchemaSection}

${renderFieldSchemaMarkdown(language)}
`;
}

function getGameNodeExportPaths(workspace: WorkspaceConfig, game: GameNode): GameNodeExportPaths {
  const gameFolderName = workspace.activeGameFolderName ?? createGameFolderName(game.gameName);
  const gameDirectoryPath = join(workspace.contextPath, gameFolderName);

  return {
    gameFolderName,
    gameDirectoryPath,
    gameMarkdownPath: join(gameDirectoryPath, 'game.md'),
    gameIndexPath: join(gameDirectoryPath, 'INDEX.md'),
    modulesDirectoryPath: join(gameDirectoryPath, 'modules'),
    imagesDirectoryPath: join(gameDirectoryPath, 'assets', 'images'),
    imageCatalogPath: join(gameDirectoryPath, 'image_catalog.yml'),
    manifestPath: join(workspace.contextPath, 'manifest.yml')
  };
}

function ensureGameDirectories(paths: GameNodeExportPaths): void {
  for (const directoryPath of [
    paths.gameDirectoryPath,
    paths.modulesDirectoryPath,
    paths.imagesDirectoryPath
  ]) {
    mkdirSync(directoryPath, { recursive: true });
  }
}

function writeImageCatalog(
  imageCatalogPath: string,
  gameFolderName: string,
  game: GameNode,
  images: ImageAsset[],
  modules: ModuleNode[],
  contents: ContentNode[],
  generatedAt: string,
  imageLinks: NodeImageLink[],
  language: AppLanguage
): void {
  const text = EXPORT_TEXT[language];

  atomicWriteTextFile(
    imageCatalogPath,
    stringify({
      generated_at: generatedAt,
      language,
      description: text.imageCatalogDescription,
      images: Object.fromEntries(
        images.map((image) => [
          image.id,
          {
            name: image.displayName,
            original_file_name: image.originalFileName,
            path: image.relativePath,
            file_type: image.fileType,
            game_id: image.gameId,
            uploader_id: image.uploaderId,
            updated_at: image.updatedAt,
            notes: image.notes ?? null,
            linked_nodes: getLinkedNodesForImage(imageLinks, image.id, game),
            linked_node_files: getLinkedNodeFileEntries(gameFolderName, game, modules, contents, imageLinks, image.id)
          }
        ])
      )
    })
  );
}

function writeUpdatedManifest(
  paths: GameNodeExportPaths,
  game: GameNode,
  generatedAt: string,
  images: ImageAsset[],
  modules: ModuleNode[],
  contents: ContentNode[],
  imageLinks: NodeImageLink[],
  language: AppLanguage
): void {
  const text = EXPORT_TEXT[language];
  const manifest = readManifest(paths.manifestPath);
  manifest.workspace = {
    ...(isRecord(manifest.workspace) ? manifest.workspace : {}),
    generated_at: generatedAt,
    language,
    agents: 'AGENTS.md',
    description: text.manifestDescription
  };
  manifest.game = {
    node_id: game.id,
    name: game.gameName,
    version: game.gameVersion,
    project_stage: game.projectStage,
    project_stage_label: PROJECT_STAGE_LABELS[game.projectStage][language],
    path: `${paths.gameFolderName}/game.md`,
    index: `${paths.gameFolderName}/INDEX.md`,
    image_catalog: `${paths.gameFolderName}/image_catalog.yml`
  };
  manifest.modules = Object.fromEntries(
    modules.map((module) => [
      module.id,
      {
        name: module.moduleName,
        game_id: module.gameId,
        game_version: module.gameVersion,
        path: `${paths.gameFolderName}/modules/${module.id}/module.md`,
        images: module.imageIds,
        updated_at: module.updatedAt
      }
    ])
  );
  manifest.contents = Object.fromEntries(
    contents.map((content) => [
      content.id,
      {
        title: content.title,
        game_id: content.gameId,
        game_version: content.gameVersion,
        module_id: content.moduleId,
        path: `${paths.gameFolderName}/modules/${content.moduleId}/contents/${content.id}.md`,
        images: content.imageIds,
        updated_at: content.updatedAt
      }
    ])
  );
  manifest.images = Object.fromEntries(
    images.map((image) => [
      image.id,
      {
        name: image.displayName,
        path: image.relativePath,
        file_type: image.fileType,
        linked_nodes: getLinkedNodesForImage(imageLinks, image.id, game),
        linked_node_files: getLinkedNodeFileEntries(paths.gameFolderName, game, modules, contents, imageLinks, image.id)
      }
    ])
  );
  manifest.field_schema = buildManifestFieldSchema(language);
  manifest.relations = {
    ...(isRecord(manifest.relations) ? manifest.relations : {}),
    node_images: Object.fromEntries(
      getNodeImageRelationEntries(game, imageLinks).map((link) => [
        `${link.nodeType}:${link.nodeId}:${link.imageId}`,
        `${link.nodeType}:${link.nodeId}->${link.imageId}`
      ])
    )
  };
  manifest.task_context_entries = {
    start_here: 'AGENTS.md',
    manifest: 'manifest.yml',
    game_folder: `${paths.gameFolderName}/`,
    game_index: `${paths.gameFolderName}/INDEX.md`,
    image_catalog: `${paths.gameFolderName}/image_catalog.yml`
  };

  atomicWriteTextFile(paths.manifestPath, stringify(manifest));
}

function getModuleMarkdownPath(paths: GameNodeExportPaths, moduleId: string): string {
  return join(paths.modulesDirectoryPath, moduleId, 'module.md');
}

function requireKnownGame(game: GameNode | undefined): GameNode {
  if (!game) {
    throw new Error('Game node not found for this workspace.');
  }

  return game;
}

function getContentMarkdownPath(paths: GameNodeExportPaths, moduleId: string, contentId: string): string {
  return join(paths.modulesDirectoryPath, moduleId, 'contents', `${contentId}.md`);
}

function getNodeImageRelationEntries(game: GameNode, imageLinks: NodeImageLink[]): NodeImageLink[] {
  const relations = [...imageLinks];

  if (game.coverImageId) {
    relations.push({
      nodeType: NodeType.Game,
      nodeId: game.id,
      imageId: game.coverImageId
    });
  }

  const seen = new Set<string>();
  return relations.filter((link) => {
    const key = `${link.nodeType}:${link.nodeId}:${link.imageId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getLinkedNodesForImage(imageLinks: NodeImageLink[], imageId: string, game: GameNode): string[] {
  return getNodeImageRelationEntries(game, imageLinks)
    .filter((link) => link.imageId === imageId)
    .map((link) => `${link.nodeType}:${link.nodeId}`);
}

function getLinkedNodeFileEntries(
  gameFolderName: string,
  game: GameNode,
  modules: ModuleNode[],
  contents: ContentNode[],
  imageLinks: NodeImageLink[],
  imageId: string
): Array<{ node_type: NodeType; node_id: string; name: string; path: string }> {
  return getNodeImageRelationEntries(game, imageLinks)
    .filter((link) => link.imageId === imageId)
    .map((link) => {
      if (link.nodeType === NodeType.Game && link.nodeId === game.id) {
        return {
          node_type: NodeType.Game,
          node_id: game.id,
          name: game.gameName,
          path: `${gameFolderName}/game.md`
        };
      }

      if (link.nodeType === NodeType.Module) {
        const module = modules.find((candidate) => candidate.id === link.nodeId);

        if (module) {
          return {
            node_type: NodeType.Module,
            node_id: module.id,
            name: module.moduleName,
            path: `${gameFolderName}/modules/${module.id}/module.md`
          };
        }
      }

      if (link.nodeType === NodeType.Content) {
        const content = contents.find((candidate) => candidate.id === link.nodeId);

        if (content) {
          return {
            node_type: NodeType.Content,
            node_id: content.id,
            name: content.title,
            path: `${gameFolderName}/modules/${content.moduleId}/contents/${content.id}.md`
          };
        }
      }

      return undefined;
    })
    .filter((entry): entry is { node_type: NodeType; node_id: string; name: string; path: string } => Boolean(entry));
}

function readManifest(manifestPath: string): Record<string, unknown> {
  if (!existsSync(manifestPath)) {
    return {};
  }

  const parsed = parse(readFileSync(manifestPath, 'utf8'));
  return isRecord(parsed) ? parsed : {};
}

function findUserDisplayName(users: LocalUser[], userId: string): string {
  return users.find((user) => user.id === userId)?.displayName ?? userId;
}

function atomicWriteTextFile(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${process.pid}.${Date.now()}.tmp`);

  writeFileSync(temporaryPath, content, 'utf8');
  renameSync(temporaryPath, filePath);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeExportLanguage(language: AppLanguage | undefined): AppLanguage {
  return language === 'en' ? 'en' : 'zh';
}

function renderFieldSchemaMarkdown(language: AppLanguage): string {
  const text = EXPORT_TEXT[language];

  return `${text.fieldSchemaIntro}

${renderFieldSchemaTable('game', language)}

${renderFieldSchemaTable('module', language)}

${renderFieldSchemaTable('content', language)}`;
}

function renderFieldSchemaTable(nodeType: FieldSchemaNodeType, language: AppLanguage): string {
  const text = EXPORT_TEXT[language];
  const rows = NODE_FIELD_SCHEMA[nodeType]
    .map((field) => `| \`${field.field}\` | ${field.label[language]} | ${field.location[language]} | ${field.useFor[language]} |`)
    .join('\n');

  return `### ${text.fieldSchemaNodeTitles[nodeType]}

| ${text.fieldColumn} | ${text.fieldLabelColumn} | ${text.fieldLocationColumn} | ${text.fieldUseForColumn} |
|---|---|---|---|
${rows}`;
}

function buildManifestFieldSchema(
  language: AppLanguage
): Record<FieldSchemaNodeType, Array<{ field: string; label: string; location: string; use_for: string }>> {
  return {
    game: NODE_FIELD_SCHEMA.game.map((field) => localizeFieldSchemaEntry(field, language)),
    module: NODE_FIELD_SCHEMA.module.map((field) => localizeFieldSchemaEntry(field, language)),
    content: NODE_FIELD_SCHEMA.content.map((field) => localizeFieldSchemaEntry(field, language))
  };
}

function localizeFieldSchemaEntry(
  field: NodeFieldSchemaEntry,
  language: AppLanguage
): { field: string; label: string; location: string; use_for: string } {
  return {
    field: field.field,
    label: field.label[language],
    location: field.location[language],
    use_for: field.useFor[language]
  };
}

function renderDownstreamAgentsMarkdown(language: AppLanguage): string {
  if (language === 'en') {
    return `# AGENTS.md

This file is for Codex and other general agents opened at the root of a Game Context Manager workspace.

## Mission

Use the structured game context in this workspace to help with game operation, testing, customer support, review, tuning discussion, project evaluation, market or competitor research, user analysis, UI direction, preview-image planning, and questions about the packaged game experience.

Work from a player/operator/reviewer perspective. This workspace is not a source-code development repo unless the user separately provides code.

Note: Read documents using UTF-8; PowerShell's default encoding may otherwise produce garbled text.

## Read Order

1. Open \`manifest.yml\`.
2. Open the game node from \`manifest.game.path\`. The game node is default context for every game-related task.
3. Open the per-game \`INDEX.md\` from \`manifest.game.index\` to see available modules, content nodes, images, and the structured field map.
4. Select only the module/content/image files relevant to the task, then read those Markdown files with their YAML frontmatter.
5. Use \`image_catalog.yml\` when a task mentions UI, screenshots, visual style, \`@image_id\`, or a specific image.

## Context Selection

- Always read the game node first.
- If the task is about a module, read that module node plus the game node.
- If the task is about a content/experience node, read that content node, its parent module node, and the game node.
- If the user explicitly @mentions a node file or image file, read the mentioned file first, then read parent/related files needed to answer well.
- If the user @mentions an image or asks about a specific image, look it up in \`image_catalog.yml\`; use \`linked_node_files\` when present, or \`linked_nodes\` plus \`manifest.yml\` as a fallback, then read the related node files.
- If the task is not about UI, screen layout, visual style, or image contents, you usually do not need to open image files.
- If the task is about UI optimization, visual problems, or preview-image generation, read the relevant image(s), the module role, the intended experience/fun, and one or two broader images that anchor the game's style.
- If the task asks about a dimension rather than a named module, scan the structured fields across nodes first. Examples: gameplay mechanics, fun points, target users, current major problems, optimization directions, or the day-2 experience of a user who paid 6 yuan.

## Structured Fields

\`manifest.yml\` contains a machine-readable \`field_schema\`. \`INDEX.md\` contains the same field map in human-readable form. Use it to decide which fields can answer the task before reading every file in full.

Useful patterns:

- Mechanics/rules: start with game \`coreGameplay\`, then module \`systemRules\`, \`resourceFlow\`, and content \`processDescription\`.
- Fun/experience: use game \`mainFun\`, module/content \`subjectiveFun\`, and the relevant process or operation fields.
- Problems/tuning: use game \`currentMainProblems\` and \`mainOptimizationDirections\`, then module/content problem and optimization fields.
- Audience/market: use game \`targetUsers\`, genre, core loop, operation goal, and representative modules before external research.
- Account-state questions: use content \`accountDay\`, \`cumulativePaymentAmount\`, \`maxMainlineProgress\`, \`characterLevel\`, and \`processDescription\`.

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
- If \`manifest.yml\`, \`INDEX.md\`, or \`image_catalog.yml\` is stale or missing, say so and ask the user to export the current directory from Game Context Manager.

## Boundaries

- Do not require the GUI to understand this workspace.
- Do not treat this as a game source-code repository unless code is separately present and the user asks for code work.
- Do not send files or images to external services unless the user explicitly asks for that action or the current task requires external research and the environment allows it.
- Do not write API keys or private credentials into Markdown or YAML output.
- Preserve human-written notes unless the user asks you to edit them.
`;
  }

  return `# AGENTS.md

本文件供 Codex 和其他通用 Agent 在游戏上下文管理器生成的工作区根目录中使用。

## 任务定位

利用本工作区沉淀的结构化游戏上下文，帮助用户处理游戏运营、测试、客服、评测、调优讨论、立项/结项、市场/竞品/用户分析、UI 优化方向、预览图规划、游戏机制问答等围绕一个“已封装游戏体验”的问题。

默认站在玩家、运营、测试、客服、评测者和产品调优视角理解游戏。除非用户另外提供源码并明确要求，否则不要把本工作区当成游戏程序源码仓库。

注意：读取文档须使用UTF-8编码，否则PowerShell 默认编码会读成乱码。

## 读取顺序

1. 先打开 \`manifest.yml\`。
2. 读取 \`manifest.game.path\` 指向的游戏主节点。所有游戏相关任务默认都需要游戏主节点作为总上下文。
3. 读取 \`manifest.game.index\` 指向的单游戏 \`INDEX.md\`，了解模块、内容、图片以及结构化字段地图。
4. 根据任务只选择相关的模块、内容和图片文件，再读取这些 Markdown 文件及其 YAML frontmatter。
5. 当任务涉及 UI、画面、视觉风格、\`@image_id\` 或具体图片时，读取 \`image_catalog.yml\`。

## 上下文选择规则

- 永远先读取游戏主节点。
- 如果任务相关于某个模块节点，读取该模块节点和游戏主节点。
- 如果任务相关于某个内容/阶段/体验节点，读取该内容节点、其父模块节点和游戏主节点。
- 如果用户在指令里明确 @ 了某个节点文件或图片文件，先读被 @ 的文件，再补读父节点或相关节点。
- 如果用户 @ 了某张图片或围绕某张图片提问，先在 \`image_catalog.yml\` 中查询；优先使用 \`linked_node_files\`，没有时用 \`linked_nodes\` 配合 \`manifest.yml\` 反查相关节点文件。
- 如果任务和前端 UI、画面、视觉风格、截图内容无关，通常不需要读取图片文件。
- 如果任务涉及 UI 优化、画面问题或生成某个优化方向的预览图，需要读取相关图片、图片所在模块的作用、要突出的体验/乐趣，以及一两张能锚定整体风格的重要图片。
- 如果任务没有限定在某个模块，而是询问某个维度，例如玩法机制、游戏乐趣、目标用户、当前主要问题、优化方向，或“付费 6 元用户第二天体验”，优先横向查阅各模块/内容节点的对应结构化字段。

## 结构化字段

\`manifest.yml\` 包含机器可读的 \`field_schema\`；\`INDEX.md\` 包含同一份字段地图的人类可读版本。先用字段地图判断哪些字段最可能回答问题，再决定是否全文读取节点文件。

常用查找路径：

- 机制/规则：先看游戏 \`coreGameplay\`，再看模块 \`systemRules\`、\`resourceFlow\` 和内容 \`processDescription\`。
- 乐趣/体验：看游戏 \`mainFun\`，模块和内容的 \`subjectiveFun\`，并结合过程说明或玩家主要操作。
- 问题/调优：看游戏 \`currentMainProblems\`、\`mainOptimizationDirections\`，再看模块/内容的问题与优化方向字段。
- 用户/市场：看游戏 \`targetUsers\`、游戏类型、核心玩法、运营目标和代表性模块，再决定是否需要外部资料。
- 账号阶段问题：看内容节点的 \`accountDay\`、\`cumulativePaymentAmount\`、\`maxMainlineProgress\`、\`characterLevel\` 和 \`processDescription\`。

## 常见任务处理方式

- 游戏机制问答：基于游戏主节点、相关模块规则和相关内容过程回答，并列出用到的文件路径或节点 ID。
- 运营/测试评审：先定位项目阶段、模块和内容字段；区分上下文中明确写到的问题与自己推断出的风险。
- 客服式解答：只使用玩家可感知的上下文解释机制，不编造后台实现或源码细节。
- UI 优化或预览图方向：读取相关图片、图片关联节点、父模块和游戏层整体风格后，再提出优化方向或预览图描述。
- 竞品、市场或用户分析：先自上而下读取游戏主节点和模块列表，把握游戏全貌；必要时参考一两张重要图片；如果任务需要当前外部信息且运行环境支持联网，再进行网络查询。

## 依据与不确定性

- 如果回答或执行任务是根据工作区上下文或外部资料完成的，在结果中说明使用了哪些文件、节点 ID、图片或网页来源。
- 如果没有明确结论但可以从上下文合理推测，要说明推测依据。
- 如果没有明确参考，也没有可靠推测依据，应直接说明“不知道”或“当前上下文不足”，不要编造游戏事实。
- 如果 \`manifest.yml\`、\`INDEX.md\` 或 \`image_catalog.yml\` 缺失或看起来过期，明确指出并让用户在游戏上下文管理器中手动导出当前目录。

## 边界

- 不要要求打开 GUI 才能理解本工作区。
- 除非用户另外提供源码并明确要求，否则不要把本工作区当成游戏程序开发仓库。
- 除非用户明确要求，或当前任务需要外部研究且运行环境允许，不要把文件或图片发送给外部服务。
- 不要把 API key 或私密凭证写入 Markdown、YAML、索引或示例输出。
- 除非用户要求编辑，否则保留人类编写的原始说明。
`;
}

function renderDownstreamClaudeMarkdown(language: AppLanguage): string {
  if (language === 'en') {
    return `# CLAUDE.md

This file is for Claude-family agents such as Claude Code or WorkBuddy when they are opened at the root of this Game Context Manager workspace.

## Mission

Use the structured game context in this workspace to help with game operation, testing, customer support, review, tuning discussion, project evaluation, market or competitor research, user analysis, UI direction, preview-image planning, and questions about the packaged game experience.

Work from a player/operator/reviewer perspective. This workspace is not a source-code development repo unless the user separately provides code.

## Read Order

1. Open \`manifest.yml\`.
2. Open the game node from \`manifest.game.path\`. The game node is default context for every game-related task.
3. Open the per-game \`INDEX.md\` from \`manifest.game.index\` to see available modules, content nodes, images, and the structured field map.
4. Select only the module/content/image files relevant to the task, then read those Markdown files with their YAML frontmatter.
5. Use \`image_catalog.yml\` when a task mentions UI, screenshots, visual style, \`@image_id\`, or a specific image.

## Context Selection

- Always read the game node first.
- If the task is about a module, read that module node plus the game node.
- If the task is about a content/experience node, read that content node, its parent module node, and the game node.
- If the user explicitly @mentions a node file or image file, read the mentioned file first, then read parent/related files needed to answer well.
- If the user @mentions an image or asks about a specific image, look it up in \`image_catalog.yml\`; use \`linked_node_files\` when present, or \`linked_nodes\` plus \`manifest.yml\` as a fallback, then read the related node files.
- If the task is not about UI, screen layout, visual style, or image contents, you usually do not need to open image files.
- If the task is about UI optimization, visual problems, or preview-image generation, read the relevant image(s), the module role, the intended experience/fun, and one or two broader images that anchor the game's style.
- If the task asks about a dimension rather than a named module, scan the structured fields across nodes first. Examples: gameplay mechanics, fun points, target users, current major problems, optimization directions, or the day-2 experience of a user who paid 6 yuan.

## Structured Fields

\`manifest.yml\` contains a machine-readable \`field_schema\`. \`INDEX.md\` contains the same field map in human-readable form. Use it to decide which fields can answer the task before reading every file in full.

Useful patterns:

- Mechanics/rules: start with game \`coreGameplay\`, then module \`systemRules\`, \`resourceFlow\`, and content \`processDescription\`.
- Fun/experience: use game \`mainFun\`, module/content \`subjectiveFun\`, and the relevant process or operation fields.
- Problems/tuning: use game \`currentMainProblems\` and \`mainOptimizationDirections\`, then module/content problem and optimization fields.
- Audience/market: use game \`targetUsers\`, genre, core loop, operation goal, and representative modules before external research.
- Account-state questions: use content \`accountDay\`, \`cumulativePaymentAmount\`, \`maxMainlineProgress\`, \`characterLevel\`, and \`processDescription\`.

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
- If \`manifest.yml\`, \`INDEX.md\`, or \`image_catalog.yml\` is stale or missing, say so and ask the user to export the current directory from Game Context Manager.

## Boundaries

- Do not require the GUI to understand this workspace.
- Do not treat this as a game source-code repository unless code is separately present and the user asks for code work.
- Do not send files or images to external services unless the user explicitly asks for that action or the current task requires external research and the environment allows it.
- Do not write API keys or private credentials into Markdown or YAML output.
- Preserve human-written notes unless the user asks you to edit them.
`;
  }

  return `# CLAUDE.md

本文件供 Claude Code、WorkBuddy 等 Claude 系 Agent 在游戏上下文管理器生成的工作区根目录中使用。

## 任务定位

利用本工作区沉淀的结构化游戏上下文，帮助用户处理游戏运营、测试、客服、评测、调优讨论、立项/结项、市场/竞品/用户分析、UI 优化方向、预览图规划、游戏机制问答等围绕一个“已封装游戏体验”的问题。

默认站在玩家、运营、测试、客服、评测者和产品调优视角理解游戏。除非用户另外提供源码并明确要求，否则不要把本工作区当成游戏程序源码仓库。

## 读取顺序

1. 先打开 \`manifest.yml\`。
2. 读取 \`manifest.game.path\` 指向的游戏主节点。所有游戏相关任务默认都需要游戏主节点作为总上下文。
3. 读取 \`manifest.game.index\` 指向的单游戏 \`INDEX.md\`，了解模块、内容、图片以及结构化字段地图。
4. 根据任务只选择相关的模块、内容和图片文件，再读取这些 Markdown 文件及其 YAML frontmatter。
5. 当任务涉及 UI、画面、视觉风格、\`@image_id\` 或具体图片时，读取 \`image_catalog.yml\`。

## 上下文选择规则

- 永远先读取游戏主节点。
- 如果任务相关于某个模块节点，读取该模块节点和游戏主节点。
- 如果任务相关于某个内容/阶段/体验节点，读取该内容节点、其父模块节点和游戏主节点。
- 如果用户在指令里明确 @ 了某个节点文件或图片文件，先读被 @ 的文件，再补读父节点或相关节点。
- 如果用户 @ 了某张图片或围绕某张图片提问，先在 \`image_catalog.yml\` 中查询；优先使用 \`linked_node_files\`，没有时用 \`linked_nodes\` 配合 \`manifest.yml\` 反查相关节点文件。
- 如果任务和前端 UI、画面、视觉风格、截图内容无关，通常不需要读取图片文件。
- 如果任务涉及 UI 优化、画面问题或生成某个优化方向的预览图，需要读取相关图片、图片所在模块的作用、要突出的体验/乐趣，以及一两张能锚定整体风格的重要图片。
- 如果任务没有限定在某个模块，而是询问某个维度，例如玩法机制、游戏乐趣、目标用户、当前主要问题、优化方向，或“付费 6 元用户第二天体验”，优先横向查阅各模块/内容节点的对应结构化字段。

## 结构化字段

\`manifest.yml\` 包含机器可读的 \`field_schema\`；\`INDEX.md\` 包含同一份字段地图的人类可读版本。先用字段地图判断哪些字段最可能回答问题，再决定是否全文读取节点文件。

常用查找路径：

- 机制/规则：先看游戏 \`coreGameplay\`，再看模块 \`systemRules\`、\`resourceFlow\` 和内容 \`processDescription\`。
- 乐趣/体验：看游戏 \`mainFun\`，模块和内容的 \`subjectiveFun\`，并结合过程说明或玩家主要操作。
- 问题/调优：看游戏 \`currentMainProblems\`、\`mainOptimizationDirections\`，再看模块/内容的问题与优化方向字段。
- 用户/市场：看游戏 \`targetUsers\`、游戏类型、核心玩法、运营目标和代表性模块，再决定是否需要外部资料。
- 账号阶段问题：看内容节点的 \`accountDay\`、\`cumulativePaymentAmount\`、\`maxMainlineProgress\`、\`characterLevel\` 和 \`processDescription\`。

## 常见任务处理方式

- 游戏机制问答：基于游戏主节点、相关模块规则和相关内容过程回答，并列出用到的文件路径或节点 ID。
- 运营/测试评审：先定位项目阶段、模块和内容字段；区分上下文中明确写到的问题与自己推断出的风险。
- 客服式解答：只使用玩家可感知的上下文解释机制，不编造后台实现或源码细节。
- UI 优化或预览图方向：读取相关图片、图片关联节点、父模块和游戏层整体风格后，再提出优化方向或预览图描述。
- 竞品、市场或用户分析：先自上而下读取游戏主节点和模块列表，把握游戏全貌；必要时参考一两张重要图片；如果任务需要当前外部信息且运行环境支持联网，再进行网络查询。

## 依据与不确定性

- 如果回答或执行任务是根据工作区上下文或外部资料完成的，在结果中说明使用了哪些文件、节点 ID、图片或网页来源。
- 如果没有明确结论但可以从上下文合理推测，要说明推测依据。
- 如果没有明确参考，也没有可靠推测依据，应直接说明“不知道”或“当前上下文不足”，不要编造游戏事实。
- 如果 \`manifest.yml\`、\`INDEX.md\` 或 \`image_catalog.yml\` 缺失或看起来过期，明确指出并让用户在游戏上下文管理器中手动导出当前目录。

## 边界

- 不要要求打开 GUI 才能理解本工作区。
- 除非用户另外提供源码并明确要求，否则不要把本工作区当成游戏程序开发仓库。
- 除非用户明确要求，或当前任务需要外部研究且运行环境允许，不要把文件或图片发送给外部服务。
- 不要把 API key 或私密凭证写入 Markdown、YAML、索引或示例输出。
- 除非用户要求编辑，否则保留人类编写的原始说明。
`;
}

const NODE_FIELD_SCHEMA: Record<FieldSchemaNodeType, NodeFieldSchemaEntry[]> = {
  game: [
    fieldSchema('nodeType', '节点类型', 'Node type', 'YAML frontmatter: node_type', 'YAML frontmatter: node_type', '判断这是游戏主节点。', 'Identify this file as the game node.'),
    fieldSchema('id', '节点 ID', 'Node ID', 'YAML frontmatter: node_id', 'YAML frontmatter: node_id', '引用、反查和路径定位。', 'Reference, lookup, and path targeting.'),
    fieldSchema('gameName', '游戏名称', 'Game name', 'YAML frontmatter: game_name；H1 标题', 'YAML frontmatter: game_name; H1 title', '确认当前游戏对象。', 'Identify the game being discussed.'),
    fieldSchema('gameVersion', '游戏版本', 'Game version', 'YAML frontmatter: game_version；索引版本', 'YAML frontmatter: game_version; index version', '判断上下文对应的项目版本。', 'Understand which project version the context describes.'),
    fieldSchema('projectStage', '项目阶段', 'Project stage', 'YAML frontmatter: project_stage；正文“项目阶段”', 'YAML frontmatter: project_stage; body section "项目阶段"', '判断立项、测试、上线或预备结项语境。', 'Understand planning, testing, live, or pre-closure context.'),
    fieldSchema('gameGenre', '游戏类型', 'Game genre', '正文“游戏类型”', 'Body section "游戏类型"', '竞品、市场和用户分析的基础分类。', 'Base classification for competitor, market, and user analysis.'),
    fieldSchema('coreGameplay', '核心玩法', 'Core gameplay', '正文“核心玩法”', 'Body section "核心玩法"', '理解游戏核心循环和机制问答。', 'Understand the core loop and answer mechanic questions.'),
    fieldSchema('mainFun', '主要乐趣', 'Main fun', '正文“主要乐趣”', 'Body section "主要乐趣"', '判断体验亮点和调优取舍。', 'Identify experiential strengths and tuning tradeoffs.'),
    fieldSchema('targetUsers', '目标用户', 'Target users', '正文“目标用户”', 'Body section "目标用户"', '用户分析、市场定位和客服口径。', 'User analysis, market positioning, and support tone.'),
    fieldSchema('currentOperationGoal', '当前运营目标', 'Current operation goal', '正文“当前运营目标”', 'Body section "当前运营目标"', '运营、测试和阶段性评估任务。', 'Operation, testing, and milestone evaluation tasks.'),
    fieldSchema('currentMainProblems', '当前主要问题', 'Current major problems', '正文“当前主要问题”', 'Body section "当前主要问题"', '定位全局风险和优先问题。', 'Locate global risks and priority problems.'),
    fieldSchema('mainOptimizationDirections', '主要优化方向', 'Main optimization directions', '正文“主要优化方向”', 'Body section "主要优化方向"', '提出调优方向、评审建议和结项总结。', 'Suggest tuning direction, review advice, and closure summaries.'),
    fieldSchema('coverImageId', '主图 ID', 'Cover image ID', 'YAML frontmatter: cover_image；正文“主图ID”', 'YAML frontmatter: cover_image; body section "主图ID"', '寻找代表性画面或视觉锚点。', 'Find representative visuals or style anchors.'),
    fieldSchema('creatorId', '创建者', 'Creator', 'YAML frontmatter: creator / creator_id', 'YAML frontmatter: creator / creator_id', '溯源上下文创建者。', 'Trace who created the context.'),
    fieldSchema('lastEditorId', '最后编辑者', 'Last editor', 'YAML frontmatter: last_editor / last_editor_id', 'YAML frontmatter: last_editor / last_editor_id', '判断最近维护者。', 'Identify the latest maintainer.'),
    fieldSchema('createdAt', '创建时间', 'Created at', 'YAML frontmatter: created_at', 'YAML frontmatter: created_at', '判断上下文创建时间。', 'Understand when the context was created.'),
    fieldSchema('updatedAt', '更新时间', 'Updated at', 'YAML frontmatter: updated_at；索引更新时间', 'YAML frontmatter: updated_at; index updated time', '判断内容新旧和索引是否可能过期。', 'Judge freshness and possible stale indexes.')
  ],
  module: [
    fieldSchema('nodeType', '节点类型', 'Node type', 'YAML frontmatter: node_type', 'YAML frontmatter: node_type', '判断这是模块节点。', 'Identify this file as a module node.'),
    fieldSchema('id', '节点 ID', 'Node ID', 'YAML frontmatter: node_id', 'YAML frontmatter: node_id', '模块引用、反查和路径定位。', 'Module reference, lookup, and path targeting.'),
    fieldSchema('gameId', '所属游戏', 'Game ID', 'YAML frontmatter: game_id', 'YAML frontmatter: game_id', '确认所属游戏主节点。', 'Find the parent game node.'),
    fieldSchema('gameVersion', '游戏版本快照', 'Game version snapshot', 'YAML frontmatter: game_version', 'YAML frontmatter: game_version', '判断模块记录时的版本。', 'Understand the version captured for this module.'),
    fieldSchema('moduleName', '模块名称', 'Module name', 'YAML frontmatter: module_name；H1 标题', 'YAML frontmatter: module_name; H1 title', '定位系统模块。', 'Locate the game system module.'),
    fieldSchema('modulePositioning', '模块定位', 'Module positioning', '正文“模块定位”', 'Body section "模块定位"', '理解模块在游戏中的作用和体验目标。', 'Understand the module role and intended experience.'),
    fieldSchema('systemRules', '系统规则', 'System rules', '正文“系统规则”', 'Body section "系统规则"', '回答机制、条件、限制和规则问题。', 'Answer mechanics, conditions, limits, and rules.'),
    fieldSchema('resourceFlow', '资源产出/消耗', 'Resource output/consumption', '正文“资源产出/消耗”', 'Body section "资源产出/消耗"', '分析经济循环、消耗压力和产出路径。', 'Analyze economy loops, sinks, pressure, and sources.'),
    fieldSchema('imageIds', '关联截图', 'Linked images', 'YAML frontmatter: images；正文“关联截图”', 'YAML frontmatter: images; body section "关联截图"', '判断是否需要读取相关 UI/画面。', 'Decide whether related UI or screenshots are needed.'),
    fieldSchema('playerMainActions', '玩家主要操作', 'Player main actions', '正文“玩家主要操作”', 'Body section "玩家主要操作"', '理解玩家实际操作流程。', 'Understand player-facing actions and flow.'),
    fieldSchema('subjectiveFun', '乐趣点', 'Fun points', '正文“乐趣点”', 'Body section "乐趣点"', '分析模块体验亮点。', 'Analyze experiential strengths in the module.'),
    fieldSchema('subjectiveProblems', '主要问题', 'Main problems', '正文“主要问题”', 'Body section "主要问题"', '定位模块级问题和测试风险。', 'Locate module-level issues and testing risks.'),
    fieldSchema('subjectiveOptimizationDirections', '优化方向', 'Optimization directions', '正文“优化方向”', 'Body section "优化方向"', '生成模块调优、UI 优化或评审建议。', 'Generate module tuning, UI direction, or review advice.'),
    fieldSchema('creatorId', '创建者', 'Creator', 'YAML frontmatter: creator / creator_id', 'YAML frontmatter: creator / creator_id', '溯源上下文创建者。', 'Trace who created the context.'),
    fieldSchema('lastEditorId', '最后编辑者', 'Last editor', 'YAML frontmatter: last_editor / last_editor_id', 'YAML frontmatter: last_editor / last_editor_id', '判断最近维护者。', 'Identify the latest maintainer.'),
    fieldSchema('createdAt', '创建时间', 'Created at', 'YAML frontmatter: created_at', 'YAML frontmatter: created_at', '判断上下文创建时间。', 'Understand when the context was created.'),
    fieldSchema('updatedAt', '更新时间', 'Updated at', 'YAML frontmatter: updated_at', 'YAML frontmatter: updated_at', '判断内容新旧和索引是否可能过期。', 'Judge freshness and possible stale indexes.')
  ],
  content: [
    fieldSchema('nodeType', '节点类型', 'Node type', 'YAML frontmatter: node_type', 'YAML frontmatter: node_type', '判断这是内容/阶段/体验节点。', 'Identify this file as a content, stage, or experience node.'),
    fieldSchema('id', '节点 ID', 'Node ID', 'YAML frontmatter: node_id', 'YAML frontmatter: node_id', '内容引用、反查和路径定位。', 'Content reference, lookup, and path targeting.'),
    fieldSchema('gameId', '所属游戏', 'Game ID', 'YAML frontmatter: game_id', 'YAML frontmatter: game_id', '确认所属游戏主节点。', 'Find the parent game node.'),
    fieldSchema('gameVersion', '游戏版本快照', 'Game version snapshot', 'YAML frontmatter: game_version', 'YAML frontmatter: game_version', '判断内容记录时的版本。', 'Understand the version captured for this content node.'),
    fieldSchema('moduleId', '所属模块', 'Module ID', 'YAML frontmatter: module_id', 'YAML frontmatter: module_id', '找到必须读取的父模块节点。', 'Find the parent module that must be read.'),
    fieldSchema('title', '标题', 'Title', 'YAML frontmatter: title；H1 标题', 'YAML frontmatter: title; H1 title', '定位具体阶段、体验片段或流程。', 'Locate the specific stage, experience slice, or flow.'),
    fieldSchema('imageIds', '关联截图', 'Linked images', 'YAML frontmatter: images；正文“关联截图”', 'YAML frontmatter: images; body section "关联截图"', '判断是否需要读取具体 UI/画面。', 'Decide whether specific UI or screenshots are needed.'),
    fieldSchema('accountDay', '创角天数', 'Account day', 'YAML frontmatter: account_day；正文“账号状态”', 'YAML frontmatter: account_day; body section "账号状态"', '回答第几天体验和留存阶段问题。', 'Answer day-based experience and retention-stage questions.'),
    fieldSchema('cumulativePaymentAmount', '累计付费金额', 'Cumulative payment amount', 'YAML frontmatter: cumulative_payment_amount；正文“账号状态”', 'YAML frontmatter: cumulative_payment_amount; body section "账号状态"', '回答付费档位体验和压力问题。', 'Answer payment-tier experience and pressure questions.'),
    fieldSchema('maxMainlineProgress', '最大主线通关数', 'Max mainline progress', 'YAML frontmatter: max_mainline_progress；正文“账号状态”', 'YAML frontmatter: max_mainline_progress; body section "账号状态"', '判断主线进度阶段。', 'Understand the player mainline progress stage.'),
    fieldSchema('characterLevel', '角色等级', 'Character level', 'YAML frontmatter: character_level；正文“账号状态”', 'YAML frontmatter: character_level; body section "账号状态"', '判断角色成长阶段。', 'Understand the character growth stage.'),
    fieldSchema('processDescription', '过程说明', 'Process description', '正文“过程说明”', 'Body section "过程说明"', '还原玩家流程、图片引用和体验细节。', 'Reconstruct player flow, image references, and experience details.'),
    fieldSchema('subjectiveFun', '乐趣点', 'Fun points', '正文“乐趣点”', 'Body section "乐趣点"', '分析具体体验片段的亮点。', 'Analyze strengths in the specific experience slice.'),
    fieldSchema('subjectiveKnownProblems', '已知问题', 'Known problems', '正文“已知问题”', 'Body section "已知问题"', '定位具体阶段的问题和测试风险。', 'Locate issues and testing risks in the specific stage.'),
    fieldSchema('subjectiveOptimizationDirections', '优化方向', 'Optimization directions', '正文“优化方向”', 'Body section "优化方向"', '生成阶段级调优建议、预览图方向或总结。', 'Generate stage-level tuning advice, preview direction, or summaries.'),
    fieldSchema('creatorId', '创建者', 'Creator', 'YAML frontmatter: creator / creator_id', 'YAML frontmatter: creator / creator_id', '溯源上下文创建者。', 'Trace who created the context.'),
    fieldSchema('lastEditorId', '最后编辑者', 'Last editor', 'YAML frontmatter: last_editor / last_editor_id', 'YAML frontmatter: last_editor / last_editor_id', '判断最近维护者。', 'Identify the latest maintainer.'),
    fieldSchema('createdAt', '创建时间', 'Created at', 'YAML frontmatter: created_at', 'YAML frontmatter: created_at', '判断上下文创建时间。', 'Understand when the context was created.'),
    fieldSchema('updatedAt', '更新时间', 'Updated at', 'YAML frontmatter: updated_at', 'YAML frontmatter: updated_at', '判断内容新旧和索引是否可能过期。', 'Judge freshness and possible stale indexes.')
  ]
};

function fieldSchema(
  field: string,
  zhLabel: string,
  enLabel: string,
  zhLocation: string,
  enLocation: string,
  zhUseFor: string,
  enUseFor: string
): NodeFieldSchemaEntry {
  return {
    field,
    label: {
      zh: zhLabel,
      en: enLabel
    },
    location: {
      zh: zhLocation,
      en: enLocation
    },
    useFor: {
      zh: zhUseFor,
      en: enUseFor
    }
  };
}

const EXPORT_TEXT = {
  zh: {
    indexTitle: (gameName: string) => `${gameName} 索引`,
    indexGenerated: '本文件由游戏上下文管理器自动生成。',
    indexUsageSection: '如何使用本索引',
    indexUsage:
      '先读取工作区根目录的 `manifest.yml` 和游戏主节点 `game.md`。按任务相关性选择模块、内容和图片；如果问题是横向维度问题，优先使用下方字段地图定位相关字段。',
    gameSection: '游戏',
    nodeId: '节点 ID',
    version: '版本',
    projectStage: '项目阶段',
    gameNode: '游戏主节点',
    lastEditor: '最后编辑者',
    updatedAt: '更新时间',
    modulesSection: '模块',
    contentsSection: '内容',
    imagesSection: '图片',
    fieldSchemaSection: '结构化字段地图',
    fieldSchemaIntro:
      '节点正文使用 Markdown 标题承载字段，YAML frontmatter 承载稳定 ID、关系、版本和图片引用。下表说明每层节点可查询的字段以及适合回答的问题。',
    fieldSchemaNodeTitles: {
      game: '游戏主节点字段',
      module: '模块节点字段',
      content: '内容/阶段/体验节点字段'
    },
    fieldColumn: '字段',
    fieldLabelColumn: '含义',
    fieldLocationColumn: '位置',
    fieldUseForColumn: '适合用于',
    noModules: '暂无模块节点。',
    noContents: '暂无内容节点。',
    noImages: '暂无图片资源。图片元数据会记录在 [image_catalog.yml](image_catalog.yml)。',
    manifestDescription: '游戏上下文管理器生成的机器可读目录；字段名保持英文以便 Agent 和工具稳定解析。',
    imageCatalogDescription: '游戏上下文管理器生成的图片目录；字段名保持英文以便 Agent 和工具稳定解析。'
  },
  en: {
    indexTitle: (gameName: string) => `${gameName} Index`,
    indexGenerated: 'This file is automatically generated by Game Context Manager.',
    indexUsageSection: 'How To Use This Index',
    indexUsage:
      'Read root `manifest.yml` and `game.md` first. Select module, content, and image files by task relevance. For cross-cutting dimension questions, use the field map below before reading every file in full.',
    gameSection: 'Game',
    nodeId: 'Node ID',
    version: 'Version',
    projectStage: 'Project stage',
    gameNode: 'Game node',
    lastEditor: 'Last editor',
    updatedAt: 'Updated at',
    modulesSection: 'Modules',
    contentsSection: 'Contents',
    imagesSection: 'Images',
    fieldSchemaSection: 'Structured Field Map',
    fieldSchemaIntro:
      'Node bodies store fields under Markdown headings. YAML frontmatter stores stable IDs, relations, versions, and image references. This map explains which fields exist at each node layer and what they are useful for.',
    fieldSchemaNodeTitles: {
      game: 'Game Node Fields',
      module: 'Module Node Fields',
      content: 'Content/Stage/Experience Node Fields'
    },
    fieldColumn: 'Field',
    fieldLabelColumn: 'Meaning',
    fieldLocationColumn: 'Location',
    fieldUseForColumn: 'Use for',
    noModules: 'No module nodes yet.',
    noContents: 'No content nodes yet.',
    noImages: 'No image assets yet. Image metadata will be tracked in [image_catalog.yml](image_catalog.yml).',
    manifestDescription: 'Machine-readable directory generated by Game Context Manager. Field names stay in English for stable agent and tool parsing.',
    imageCatalogDescription: 'Image catalog generated by Game Context Manager. Field names stay in English for stable agent and tool parsing.'
  }
} as const;
