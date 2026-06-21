import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { exportGameContextFiles } from '../../src/main/services/fileExportService.js';
import { initializeSqliteService } from '../../src/main/services/sqliteService.js';
import {
  WORKSPACE_SCHEMA_VERSION,
  createWorkspaceStructure,
  importWorkspaceFromDirectory
} from '../../src/main/services/workspaceService.js';
import {
  NodeType,
  ProjectStage,
  type ContentNode,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
  type WorkspaceConfig
} from '../../src/shared/index.js';

const tempDir = mkdtempSync(join(tmpdir(), 'gcm-workspace-'));

try {
  const workspace = createWorkspaceStructure({
    selectedDirectory: tempDir,
    now: new Date('2026-06-18T12:00:00.000Z')
  });

  assert.equal(workspace.rootPath, tempDir);
  assert.equal(workspace.schemaVersion, WORKSPACE_SCHEMA_VERSION);
  assert.equal(existsSync(join(tempDir, 'game-context')), true);
  assert.equal(existsSync(join(tempDir, 'game-context', 'games')), true);

  for (const fileName of ['AGENTS.md', 'CLAUDE.md', 'USAGE.md', 'README.md', 'manifest.yml']) {
    assert.equal(
      existsSync(join(tempDir, 'game-context', fileName)),
      true,
      `Expected ${fileName} to be generated`
    );
  }

  const manifestText = readFileSync(join(tempDir, 'game-context', 'manifest.yml'), 'utf8');
  const manifest = parse(manifestText) as {
    workspace: { schema_version: number; generated_at: string };
    game: null;
    modules: Record<string, unknown>;
    contents: Record<string, unknown>;
    images: Record<string, unknown>;
  };

  assert.equal(manifest.workspace.schema_version, WORKSPACE_SCHEMA_VERSION);
  assert.equal(manifest.workspace.generated_at, '2026-06-18T12:00:00.000Z');
  assert.equal(manifest.game, null);
  assert.deepEqual(manifest.modules, {});
  assert.deepEqual(manifest.contents, {});
  assert.deepEqual(manifest.images, {});

  const usageText = readFileSync(join(tempDir, 'game-context', 'USAGE.md'), 'utf8');
  assert.match(usageText, /manifest\.yml/);
  assert.match(usageText, /@image_id/);

  const secondWorkspace = createWorkspaceStructure({
    selectedDirectory: tempDir,
    now: new Date('2026-06-18T12:01:00.000Z')
  });

  assert.deepEqual(secondWorkspace.createdPaths, []);
  assert.equal(secondWorkspace.existingPaths.includes('game-context/manifest.yml'), true);

  const users: LocalUser[] = [
    {
      id: 'user_import_a',
      displayName: 'Importer A',
      createdAt: '2026-06-18T12:00:00.000Z',
      lastLoginAt: '2026-06-18T12:00:00.000Z'
    }
  ];
  const game: GameNode = {
    nodeType: NodeType.Game,
    id: 'import_game',
    gameName: '导入测试游戏',
    gameVersion: 'v1',
    projectStage: ProjectStage.Testing,
    coreGameplay: '核心循环来自文件。',
    creatorId: users[0].id,
    lastEditorId: users[0].id,
    createdAt: '2026-06-18T12:00:00.000Z',
    updatedAt: '2026-06-18T12:30:00.000Z'
  };
  const image: ImageAsset = {
    id: 'img_import_main',
    displayName: '导入截图',
    originalFileName: 'original.png',
    relativePath: 'games/import_game/assets/images/img_import_main__import.png',
    fileType: 'png',
    gameId: game.id,
    uploaderId: users[0].id,
    updatedAt: '2026-06-18T12:35:00.000Z',
    notes: '导入测试图片。'
  };
  const module: ModuleNode = {
    nodeType: NodeType.Module,
    id: 'import_module',
    gameId: game.id,
    gameVersion: game.gameVersion,
    moduleName: '导入模块',
    modulePositioning: '用于验证导入模块。',
    systemRules: '模块规则。',
    resourceFlow: '资源流。',
    imageIds: [image.id],
    playerMainActions: '点击导入模块。',
    subjectiveFun: '模块有反馈。',
    subjectiveProblems: '问题来自模块。',
    subjectiveOptimizationDirections: '优化来自模块。',
    creatorId: users[0].id,
    lastEditorId: users[0].id,
    createdAt: '2026-06-18T12:10:00.000Z',
    updatedAt: '2026-06-18T12:40:00.000Z'
  };
  const content: ContentNode = {
    nodeType: NodeType.Content,
    id: 'import_content',
    gameId: game.id,
    gameVersion: game.gameVersion,
    moduleId: module.id,
    title: '导入内容',
    imageIds: [image.id],
    accountDay: '2',
    cumulativePaymentAmount: '6',
    maxMainlineProgress: '2-1',
    characterLevel: '8',
    processDescription: '导入内容引用 @img_import_main。',
    subjectiveFun: '内容乐趣。',
    subjectiveKnownProblems: '内容问题。',
    subjectiveOptimizationDirections: '内容优化。',
    creatorId: users[0].id,
    lastEditorId: users[0].id,
    createdAt: '2026-06-18T12:20:00.000Z',
    updatedAt: '2026-06-18T12:50:00.000Z'
  };
  const imageLinks: NodeImageLink[] = [
    {
      nodeType: NodeType.Module,
      nodeId: module.id,
      imageId: image.id
    },
    {
      nodeType: NodeType.Content,
      nodeId: content.id,
      imageId: image.id
    }
  ];
  const exportWorkspace: WorkspaceConfig = {
    id: secondWorkspace.id,
    rootPath: secondWorkspace.rootPath,
    contextPath: secondWorkspace.contextPath,
    activeGameId: game.id,
    currentUserId: users[0].id,
    schemaVersion: secondWorkspace.schemaVersion,
    createdAt: secondWorkspace.createdAt,
    updatedAt: secondWorkspace.updatedAt
  };

  exportGameContextFiles({
    workspace: exportWorkspace,
    game,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks,
    now: new Date('2026-06-18T13:00:00.000Z')
  });

  const importedWorkspace = importWorkspaceFromDirectory(join(tempDir, 'game-context'), users[0].id, new Date('2026-06-18T13:05:00.000Z'));

  assert.equal(importedWorkspace.summary.imported.gameCount, 1);
  assert.equal(importedWorkspace.summary.imported.moduleCount, 1);
  assert.equal(importedWorkspace.summary.imported.contentCount, 1);
  assert.equal(importedWorkspace.summary.imported.imageCount, 1);
  assert.equal(importedWorkspace.snapshot.game?.gameName, game.gameName);
  assert.equal(importedWorkspace.snapshot.modules[0].modulePositioning, module.modulePositioning);
  assert.equal(importedWorkspace.snapshot.contents[0].processDescription, content.processDescription);
  assert.equal(importedWorkspace.snapshot.images[0].originalFileName, image.originalFileName);
  const sortedImageLinks = [...imageLinks].sort((left, right) =>
    `${left.nodeType}:${left.nodeId}:${left.imageId}`.localeCompare(`${right.nodeType}:${right.nodeId}:${right.imageId}`)
  );
  assert.deepEqual(importedWorkspace.snapshot.imageLinks, sortedImageLinks);

  const sqliteService = initializeSqliteService({
    databasePath: ':memory:',
    journalMode: 'DELETE'
  });

  try {
    sqliteService.replaceWorkspaceSnapshot(importedWorkspace.snapshot);

    assert.equal(sqliteService.getWorkspace(importedWorkspace.summary.id)?.activeGameId, game.id);
    assert.equal(sqliteService.getGameNode(importedWorkspace.summary.id)?.gameName, game.gameName);
    assert.equal(sqliteService.getModuleNodes(importedWorkspace.summary.id)[0].moduleName, module.moduleName);
    assert.equal(sqliteService.getContentNodes(importedWorkspace.summary.id)[0].title, content.title);
    assert.equal(sqliteService.getImageAssets(importedWorkspace.summary.id)[0].displayName, image.displayName);
    assert.deepEqual(sqliteService.getNodeImageLinks(importedWorkspace.summary.id), sortedImageLinks);
  } finally {
    sqliteService.close();
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
