import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';
import {
  PROJECT_STAGE_LABELS,
  type ContentNode,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
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

interface DeleteContentNodeFilesOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  contentId: string;
  modules: ModuleNode[];
  contents: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface DeleteImageAssetFilesOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  deletedImage: ImageAsset;
  modules: ModuleNode[];
  contents: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface ExportGameContextFilesOptions {
  workspace: WorkspaceConfig;
  game: GameNode;
  modules: ModuleNode[];
  contents: ContentNode[];
  users: LocalUser[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
  now?: Date;
}

interface GameNodeExportPaths {
  gameDirectoryPath: string;
  gameMarkdownPath: string;
  gameIndexPath: string;
  modulesDirectoryPath: string;
  contentsDirectoryPath: string;
  imagesDirectoryPath: string;
  imageCatalogPath: string;
  manifestPath: string;
}

export function exportGameNodeFiles(options: ExportGameNodeOptions): string {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const markdown = renderGameMarkdown(options.game, options.users);
  const images = options.images ?? [];
  const modules = options.modules ?? [];
  const contents = options.contents ?? [];
  const imageLinks = options.imageLinks ?? [];

  ensureGameDirectories(paths);
  atomicWriteTextFile(paths.gameMarkdownPath, markdown);
  writeImageCatalog(paths.imageCatalogPath, images, generatedAt, imageLinks);
  atomicWriteTextFile(paths.gameIndexPath, renderGameIndexMarkdown(options.game, options.users, images, modules, contents));
  writeUpdatedManifest(paths, options.game, generatedAt, images, modules, contents, imageLinks);

  return markdown;
}

export function exportImageCatalogFiles(options: ExportImageCatalogOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const modules = options.modules ?? [];
  const contents = options.contents ?? [];
  const imageLinks = options.imageLinks ?? [];

  ensureGameDirectories(paths);
  writeImageCatalog(paths.imageCatalogPath, options.images, generatedAt, imageLinks);
  atomicWriteTextFile(paths.gameIndexPath, renderGameIndexMarkdown(options.game, options.users, options.images, modules, contents));
  writeUpdatedManifest(paths, options.game, generatedAt, options.images, modules, contents, imageLinks);
}

export function exportModuleNodeFiles(options: ExportModuleNodeOptions): string {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const markdown = renderModuleMarkdown(options.module, options.users, options.images);
  const contents = options.contents ?? [];

  ensureGameDirectories(paths);
  atomicWriteTextFile(getModuleMarkdownPath(paths, options.module.id), markdown);
  writeImageCatalog(paths.imageCatalogPath, options.images, generatedAt, options.imageLinks);
  atomicWriteTextFile(paths.gameIndexPath, renderGameIndexMarkdown(options.game, options.users, options.images, options.modules, contents));
  writeUpdatedManifest(paths, options.game, generatedAt, options.images, options.modules, contents, options.imageLinks);

  return markdown;
}

export function exportContentNodeFiles(options: ExportContentNodeOptions): string {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const markdown = renderContentMarkdown(options.content, options.users, options.images);

  ensureGameDirectories(paths);
  atomicWriteTextFile(getContentMarkdownPath(paths, options.content.id), markdown);
  writeImageCatalog(paths.imageCatalogPath, options.images, generatedAt, options.imageLinks);
  atomicWriteTextFile(paths.gameIndexPath, renderGameIndexMarkdown(options.game, options.users, options.images, options.modules, options.contents));
  writeUpdatedManifest(paths, options.game, generatedAt, options.images, options.modules, options.contents, options.imageLinks);

  return markdown;
}

export function exportGameContextFiles(options: ExportGameContextFilesOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();

  ensureGameDirectories(paths);
  atomicWriteTextFile(paths.gameMarkdownPath, renderGameMarkdown(options.game, options.users));

  for (const module of options.modules) {
    atomicWriteTextFile(getModuleMarkdownPath(paths, module.id), renderModuleMarkdown(module, options.users, options.images));
  }

  for (const content of options.contents) {
    atomicWriteTextFile(getContentMarkdownPath(paths, content.id), renderContentMarkdown(content, options.users, options.images));
  }

  writeImageCatalog(paths.imageCatalogPath, options.images, generatedAt, options.imageLinks);
  atomicWriteTextFile(paths.gameIndexPath, renderGameIndexMarkdown(options.game, options.users, options.images, options.modules, options.contents));
  writeUpdatedManifest(paths, options.game, generatedAt, options.images, options.modules, options.contents, options.imageLinks);
}

export function deleteModuleNodeFiles(options: DeleteModuleNodeFilesOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const moduleMarkdownPath = getModuleMarkdownPath(paths, options.moduleId);

  if (existsSync(moduleMarkdownPath)) {
    unlinkSync(moduleMarkdownPath);
  }

  for (const contentId of options.contentIds) {
    const contentMarkdownPath = getContentMarkdownPath(paths, contentId);

    if (existsSync(contentMarkdownPath)) {
      unlinkSync(contentMarkdownPath);
    }
  }

  writeImageCatalog(paths.imageCatalogPath, options.images, generatedAt, options.imageLinks);
  atomicWriteTextFile(
    paths.gameIndexPath,
    renderGameIndexMarkdown(options.game, options.users, options.images, options.modules, options.contents ?? [])
  );
  writeUpdatedManifest(paths, options.game, generatedAt, options.images, options.modules, options.contents ?? [], options.imageLinks);
}

export function deleteContentNodeFiles(options: DeleteContentNodeFilesOptions): void {
  const paths = getGameNodeExportPaths(options.workspace, options.game);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const contentMarkdownPath = getContentMarkdownPath(paths, options.contentId);

  if (existsSync(contentMarkdownPath)) {
    unlinkSync(contentMarkdownPath);
  }

  writeImageCatalog(paths.imageCatalogPath, options.images, generatedAt, options.imageLinks);
  atomicWriteTextFile(paths.gameIndexPath, renderGameIndexMarkdown(options.game, options.users, options.images, options.modules, options.contents));
  writeUpdatedManifest(paths, options.game, generatedAt, options.images, options.modules, options.contents, options.imageLinks);
}

export function deleteImageAssetFiles(options: DeleteImageAssetFilesOptions): void {
  const imagePath = join(options.workspace.contextPath, options.deletedImage.relativePath);

  if (existsSync(imagePath)) {
    unlinkSync(imagePath);
  }

  exportGameContextFiles(options);
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
  const contentMarkdownPath = getContentMarkdownPath(paths, content.id);

  if (existsSync(contentMarkdownPath)) {
    return readFileSync(contentMarkdownPath, 'utf8');
  }

  return renderContentMarkdown(content, users, images);
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
    ['补充说明', game.notes],
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
    ['乐趣点（主观）', module.subjectiveFun],
    ['主要问题（主观）', module.subjectiveProblems],
    ['优化方向（主观）', module.subjectiveOptimizationDirections]
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
    ['乐趣点（主观）', content.subjectiveFun],
    ['已知问题（主观）', content.subjectiveKnownProblems],
    ['优化方向（主观）', content.subjectiveOptimizationDirections]
  ]
    .map(([title, body]) => `## ${title}\n\n${body ?? ''}`)
    .join('\n\n');

  return `---\n${frontmatter}\n---\n\n# ${content.title}\n\n${sections}\n`;
}

function renderGameIndexMarkdown(
  game: GameNode,
  users: LocalUser[],
  images: ImageAsset[],
  modules: ModuleNode[],
  contents: ContentNode[]
): string {
  const lastEditor = findUserDisplayName(users, game.lastEditorId);
  const moduleSection =
    modules.length > 0
      ? modules.map((module) => `- \`${module.id}\` ${module.moduleName}: [modules/${module.id}.md](modules/${module.id}.md)`).join('\n')
      : 'No module nodes yet.';
  const contentSection =
    contents.length > 0
      ? contents
          .map((content) => `- \`${content.id}\` ${content.title} (${content.moduleId}): [contents/${content.id}.md](contents/${content.id}.md)`)
          .join('\n')
      : 'No content nodes yet.';
  const imageSection =
    images.length > 0
      ? images
          .map((image) => {
            const gameRelativePrefix = `games/${game.id}/`;
            const indexRelativePath = image.relativePath.startsWith(gameRelativePrefix)
              ? image.relativePath.slice(gameRelativePrefix.length)
              : image.relativePath;

            return `- \`${image.id}\` ${image.displayName}: [${indexRelativePath}](${indexRelativePath})`;
          })
          .join('\n')
      : 'No image assets yet. Image metadata will be tracked in [image_catalog.yml](image_catalog.yml).';

  return `# ${game.gameName} Index

This file is automatically generated by Game Context Manager.

## Game

- Node ID: \`${game.id}\`
- Version: \`${game.gameVersion}\`
- Project stage: \`${game.projectStage}\`
- Game node: [game.md](game.md)
- Last editor: ${lastEditor}
- Updated at: ${game.updatedAt}

## Modules

${moduleSection}

## Contents

${contentSection}

## Images

${imageSection}
`;
}

function getGameNodeExportPaths(workspace: WorkspaceConfig, game: GameNode): GameNodeExportPaths {
  const gameDirectoryPath = join(workspace.contextPath, 'games', game.id);

  return {
    gameDirectoryPath,
    gameMarkdownPath: join(gameDirectoryPath, 'game.md'),
    gameIndexPath: join(gameDirectoryPath, 'INDEX.md'),
    modulesDirectoryPath: join(gameDirectoryPath, 'modules'),
    contentsDirectoryPath: join(gameDirectoryPath, 'contents'),
    imagesDirectoryPath: join(gameDirectoryPath, 'assets', 'images'),
    imageCatalogPath: join(gameDirectoryPath, 'image_catalog.yml'),
    manifestPath: join(workspace.contextPath, 'manifest.yml')
  };
}

function ensureGameDirectories(paths: GameNodeExportPaths): void {
  for (const directoryPath of [
    paths.gameDirectoryPath,
    paths.modulesDirectoryPath,
    paths.contentsDirectoryPath,
    paths.imagesDirectoryPath
  ]) {
    mkdirSync(directoryPath, { recursive: true });
  }
}

function writeImageCatalog(
  imageCatalogPath: string,
  images: ImageAsset[],
  generatedAt: string,
  imageLinks: NodeImageLink[]
): void {
  atomicWriteTextFile(
    imageCatalogPath,
    stringify({
      generated_at: generatedAt,
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
            linked_nodes: getLinkedNodesForImage(imageLinks, image.id)
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
  imageLinks: NodeImageLink[]
): void {
  const manifest = readManifest(paths.manifestPath);
  manifest.workspace = {
    ...(isRecord(manifest.workspace) ? manifest.workspace : {}),
    generated_at: generatedAt
  };
  manifest.game = {
    node_id: game.id,
    name: game.gameName,
    version: game.gameVersion,
    project_stage: game.projectStage,
    path: `games/${game.id}/game.md`,
    index: `games/${game.id}/INDEX.md`
  };
  manifest.modules = Object.fromEntries(
    modules.map((module) => [
      module.id,
      {
        name: module.moduleName,
        game_id: module.gameId,
        game_version: module.gameVersion,
        path: `games/${game.id}/modules/${module.id}.md`,
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
        path: `games/${game.id}/contents/${content.id}.md`,
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
        linked_nodes: getLinkedNodesForImage(imageLinks, image.id)
      }
    ])
  );
  manifest.relations = {
    ...(isRecord(manifest.relations) ? manifest.relations : {}),
    node_images: Object.fromEntries(
      imageLinks.map((link) => [`${link.nodeType}:${link.nodeId}:${link.imageId}`, `${link.nodeType}:${link.nodeId}->${link.imageId}`])
    )
  };

  atomicWriteTextFile(paths.manifestPath, stringify(manifest));
}

function getModuleMarkdownPath(paths: GameNodeExportPaths, moduleId: string): string {
  return join(paths.modulesDirectoryPath, `${moduleId}.md`);
}

function getContentMarkdownPath(paths: GameNodeExportPaths, contentId: string): string {
  return join(paths.contentsDirectoryPath, `${contentId}.md`);
}

function getLinkedNodesForImage(imageLinks: NodeImageLink[], imageId: string): string[] {
  return imageLinks
    .filter((link) => link.imageId === imageId)
    .map((link) => `${link.nodeType}:${link.nodeId}`);
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
