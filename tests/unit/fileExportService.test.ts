import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
  deleteContentNodeFiles,
  deleteImageAssetFiles,
  deleteModuleNodeFiles,
  exportContentNodeFiles,
  exportGameNodeFiles,
  exportModuleNodeFiles
} from '../../src/main/services/fileExportService.js';
import { createWorkspaceStructure } from '../../src/main/services/workspaceService.js';
import {
  NodeType,
  ProjectStage,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
  type ContentNode,
  type WorkspaceConfig
} from '../../src/shared/index.js';

const tempDir = mkdtempSync(join(tmpdir(), 'gcm-export-'));

try {
  const workspaceSummary = createWorkspaceStructure({
    selectedDirectory: tempDir,
    now: new Date('2026-06-18T12:00:00.000Z')
  });
  const workspace: WorkspaceConfig = {
    id: workspaceSummary.id,
    rootPath: workspaceSummary.rootPath,
    contextPath: workspaceSummary.contextPath,
    schemaVersion: workspaceSummary.schemaVersion,
    createdAt: workspaceSummary.createdAt,
    updatedAt: workspaceSummary.updatedAt
  };
  const users: LocalUser[] = [
    {
      id: 'user_a',
      displayName: '策划 A',
      createdAt: '2026-06-18T12:00:00.000Z',
      lastLoginAt: '2026-06-18T12:00:00.000Z'
    },
    {
      id: 'user_b',
      displayName: 'Designer B',
      createdAt: '2026-06-18T12:00:00.000Z',
      lastLoginAt: '2026-06-18T12:00:00.000Z'
    }
  ];
  const game: GameNode = {
    nodeType: NodeType.Game,
    id: 'mission_frontline',
    gameName: '使命防线',
    gameVersion: 'v0.3.2',
    projectStage: ProjectStage.Testing,
    gameGenre: '开箱like + 战车养成',
    coreGameplay: '开箱获得战车部件，组装并推进关卡。',
    creatorId: 'user_a',
    lastEditorId: 'user_b',
    createdAt: '2026-06-18T12:00:00.000Z',
    updatedAt: '2026-06-18T12:30:00.000Z'
  };
  const image: ImageAsset = {
    id: 'img_main_screen_1234abcd',
    displayName: '主界面截图',
    originalFileName: '乱码文件名###.png',
    relativePath: 'games/mission_frontline/assets/images/img_main_screen_1234abcd__main-screen.png',
    fileType: 'png',
    gameId: game.id,
    uploaderId: 'user_a',
    updatedAt: '2026-06-18T12:40:00.000Z',
    notes: '用于验证图片元数据。'
  };
  const module: ModuleNode = {
    nodeType: NodeType.Module,
    id: 'gacha_workshop',
    gameId: game.id,
    gameVersion: game.gameVersion,
    moduleName: '生产线/开箱',
    modulePositioning: '负责核心开箱循环。',
    systemRules: '玩家消耗钥匙获得战车部件。',
    resourceFlow: '钥匙消耗，部件产出。',
    imageIds: [image.id],
    playerMainActions: '点击开箱并查看结果。',
    subjectiveFun: '短反馈明确。',
    subjectiveProblems: '结果页信息密度偏高。',
    subjectiveOptimizationDirections: '突出稀有结果。',
    creatorId: 'user_a',
    lastEditorId: 'user_b',
    createdAt: '2026-06-18T12:10:00.000Z',
    updatedAt: '2026-06-18T12:45:00.000Z'
  };
  const imageLink: NodeImageLink = {
    nodeType: NodeType.Module,
    nodeId: module.id,
    imageId: image.id
  };
  const content: ContentNode = {
    nodeType: NodeType.Content,
    id: 'day1_first_gacha',
    gameId: game.id,
    gameVersion: game.gameVersion,
    moduleId: module.id,
    title: '第一天首次进入生产线',
    imageIds: [image.id],
    accountDay: '1',
    cumulativePaymentAmount: '0',
    maxMainlineProgress: '1-3',
    characterLevel: '5',
    processDescription: `玩家在主界面看到 @${image.id} 后进入生产线。`,
    subjectiveFun: '首次反馈明确。',
    subjectiveKnownProblems: '缺少结果解释。',
    subjectiveOptimizationDirections: '补充稀有度说明。',
    creatorId: 'user_a',
    lastEditorId: 'user_b',
    createdAt: '2026-06-18T12:20:00.000Z',
    updatedAt: '2026-06-18T12:50:00.000Z'
  };
  const contentImageLink: NodeImageLink = {
    nodeType: NodeType.Content,
    nodeId: content.id,
    imageId: image.id
  };

  const markdown = exportGameNodeFiles({
    workspace,
    game,
    users,
    images: [image],
    now: new Date('2026-06-18T12:31:00.000Z')
  });

  const gameDirectory = join(tempDir, 'game-context', 'games', game.id);
  assert.equal(existsSync(join(gameDirectory, 'game.md')), true);
  assert.equal(existsSync(join(gameDirectory, 'INDEX.md')), true);
  assert.equal(existsSync(join(gameDirectory, 'modules')), true);
  assert.equal(existsSync(join(gameDirectory, 'contents')), true);
  assert.equal(existsSync(join(gameDirectory, 'assets', 'images')), true);
  assert.equal(existsSync(join(gameDirectory, 'image_catalog.yml')), true);
  assert.match(markdown, /node_type: game/);
  assert.match(markdown, /# 使命防线/);
  assert.match(markdown, /creator: 策划 A/);
  assert.match(markdown, /last_editor: Designer B/);
  assert.match(markdown, /## 当前主要问题\n\n/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /img_main_screen_1234abcd/);

  const imageCatalog = parse(readFileSync(join(gameDirectory, 'image_catalog.yml'), 'utf8')) as {
    images: Record<string, { name: string; original_file_name: string; path: string; linked_nodes: string[] }>;
  };

  assert.equal(imageCatalog.images[image.id].name, image.displayName);
  assert.equal(imageCatalog.images[image.id].original_file_name, '乱码文件名###.png');
  assert.equal(imageCatalog.images[image.id].path, image.relativePath);
  assert.deepEqual(imageCatalog.images[image.id].linked_nodes, []);

  const manifest = parse(readFileSync(join(tempDir, 'game-context', 'manifest.yml'), 'utf8')) as {
    workspace: { generated_at: string };
    game: { node_id: string; name: string; version: string; path: string; index: string };
    modules: Record<string, unknown>;
    images: Record<string, { name: string; path: string; linked_nodes: string[] }>;
  };

  assert.equal(manifest.workspace.generated_at, '2026-06-18T12:31:00.000Z');
  assert.equal(manifest.game.node_id, game.id);
  assert.equal(manifest.game.name, game.gameName);
  assert.equal(manifest.game.version, game.gameVersion);
  assert.equal(manifest.game.path, 'games/mission_frontline/game.md');
  assert.equal(manifest.game.index, 'games/mission_frontline/INDEX.md');
  assert.deepEqual(manifest.modules, {});
  assert.equal(manifest.images[image.id].name, image.displayName);
  assert.equal(manifest.images[image.id].path, image.relativePath);
  assert.deepEqual(manifest.images[image.id].linked_nodes, []);

  const moduleMarkdown = exportModuleNodeFiles({
    workspace,
    game,
    module,
    modules: [module],
    users,
    images: [image],
    imageLinks: [imageLink],
    now: new Date('2026-06-18T12:46:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'modules', 'gacha_workshop.md')), true);
  assert.match(moduleMarkdown, /node_type: module/);
  assert.match(moduleMarkdown, /module_name: 生产线\/开箱/);
  assert.match(moduleMarkdown, /images:\n  - img_main_screen_1234abcd/);
  assert.match(moduleMarkdown, /## 关联截图\n\n- @img_main_screen_1234abcd: 主界面截图/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /modules\/gacha_workshop.md/);

  const updatedImageCatalog = parse(readFileSync(join(gameDirectory, 'image_catalog.yml'), 'utf8')) as {
    images: Record<string, { linked_nodes: string[] }>;
  };
  assert.deepEqual(updatedImageCatalog.images[image.id].linked_nodes, ['module:gacha_workshop']);

  const updatedManifest = parse(readFileSync(join(tempDir, 'game-context', 'manifest.yml'), 'utf8')) as {
    modules: Record<string, { name: string; path: string; images: string[] }>;
    images: Record<string, { linked_nodes: string[] }>;
  };

  assert.equal(updatedManifest.modules[module.id].name, module.moduleName);
  assert.equal(updatedManifest.modules[module.id].path, 'games/mission_frontline/modules/gacha_workshop.md');
  assert.deepEqual(updatedManifest.modules[module.id].images, [image.id]);
  assert.deepEqual(updatedManifest.images[image.id].linked_nodes, ['module:gacha_workshop']);

  const contentMarkdown = exportContentNodeFiles({
    workspace,
    game,
    content,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks: [imageLink, contentImageLink],
    now: new Date('2026-06-18T12:51:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'contents', 'day1_first_gacha.md')), true);
  assert.match(contentMarkdown, /node_type: content/);
  assert.match(contentMarkdown, /module_id: gacha_workshop/);
  assert.match(contentMarkdown, /account_day: "1"/);
  assert.match(contentMarkdown, /images:\n  - img_main_screen_1234abcd/);
  assert.match(contentMarkdown, /## 账号状态\n\n- 创角天数：1/);
  assert.match(contentMarkdown, /玩家在主界面看到 @img_main_screen_1234abcd 后进入生产线。/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /contents\/day1_first_gacha.md/);

  const contentImageCatalog = parse(readFileSync(join(gameDirectory, 'image_catalog.yml'), 'utf8')) as {
    images: Record<string, { linked_nodes: string[] }>;
  };
  assert.deepEqual(contentImageCatalog.images[image.id].linked_nodes, ['module:gacha_workshop', 'content:day1_first_gacha']);

  const contentManifest = parse(readFileSync(join(tempDir, 'game-context', 'manifest.yml'), 'utf8')) as {
    contents: Record<string, { title: string; module_id: string; path: string; images: string[] }>;
    images: Record<string, { linked_nodes: string[] }>;
  };

  assert.equal(contentManifest.contents[content.id].title, content.title);
  assert.equal(contentManifest.contents[content.id].module_id, module.id);
  assert.equal(contentManifest.contents[content.id].path, 'games/mission_frontline/contents/day1_first_gacha.md');
  assert.deepEqual(contentManifest.contents[content.id].images, [image.id]);
  assert.deepEqual(contentManifest.images[image.id].linked_nodes, ['module:gacha_workshop', 'content:day1_first_gacha']);

  deleteContentNodeFiles({
    workspace,
    game,
    contentId: content.id,
    modules: [module],
    contents: [],
    users,
    images: [image],
    imageLinks: [imageLink],
    now: new Date('2026-06-18T13:00:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'contents', 'day1_first_gacha.md')), false);
  const manifestAfterContentDelete = parse(readFileSync(join(tempDir, 'game-context', 'manifest.yml'), 'utf8')) as {
    contents: Record<string, unknown>;
    images: Record<string, { linked_nodes: string[] }>;
  };
  assert.deepEqual(manifestAfterContentDelete.contents, {});
  assert.deepEqual(manifestAfterContentDelete.images[image.id].linked_nodes, ['module:gacha_workshop']);

  exportContentNodeFiles({
    workspace,
    game,
    content,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks: [imageLink, contentImageLink],
    now: new Date('2026-06-18T13:05:00.000Z')
  });
  deleteModuleNodeFiles({
    workspace,
    game,
    moduleId: module.id,
    contentIds: [content.id],
    modules: [],
    contents: [],
    users,
    images: [image],
    imageLinks: [],
    now: new Date('2026-06-18T13:10:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'modules', 'gacha_workshop.md')), false);
  assert.equal(existsSync(join(gameDirectory, 'contents', 'day1_first_gacha.md')), false);
  const manifestAfterModuleDelete = parse(readFileSync(join(tempDir, 'game-context', 'manifest.yml'), 'utf8')) as {
    modules: Record<string, unknown>;
    contents: Record<string, unknown>;
    images: Record<string, { linked_nodes: string[] }>;
  };
  assert.deepEqual(manifestAfterModuleDelete.modules, {});
  assert.deepEqual(manifestAfterModuleDelete.contents, {});
  assert.deepEqual(manifestAfterModuleDelete.images[image.id].linked_nodes, []);

  const imagePath = join(workspace.contextPath, image.relativePath);
  writeFileSync(imagePath, 'fake image');
  deleteImageAssetFiles({
    workspace,
    game,
    deletedImage: image,
    modules: [{ ...module, imageIds: [] }],
    contents: [{ ...content, imageIds: [], processDescription: '玩家在主界面看到后进入生产线。' }],
    users,
    images: [],
    imageLinks: [],
    now: new Date('2026-06-18T13:15:00.000Z')
  });

  assert.equal(existsSync(imagePath), false);
  assert.doesNotMatch(readFileSync(join(gameDirectory, 'contents', 'day1_first_gacha.md'), 'utf8'), /@img_main_screen_1234abcd/);
  const imageCatalogAfterDelete = parse(readFileSync(join(gameDirectory, 'image_catalog.yml'), 'utf8')) as {
    images: Record<string, unknown>;
  };
  assert.deepEqual(imageCatalogAfterDelete.images, {});

  const generatedAgentFiles = [
    join(tempDir, 'game-context', 'manifest.yml'),
    join(gameDirectory, 'INDEX.md'),
    join(gameDirectory, 'game.md'),
    join(gameDirectory, 'image_catalog.yml'),
    join(gameDirectory, 'contents', 'day1_first_gacha.md')
  ];

  for (const generatedFile of generatedAgentFiles) {
    assert.doesNotMatch(readFileSync(generatedFile, 'utf8'), /sk-local-secret/);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
