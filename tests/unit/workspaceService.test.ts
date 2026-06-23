import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { exportGameContextFiles } from '../../src/main/services/fileExportService.js';
import { initializeSqliteService } from '../../src/main/services/sqliteService.js';
import {
  WORKSPACE_SCHEMA_VERSION,
  createGameFolderName,
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
  assert.equal(createGameFolderName('使命防线'), '使命防线游戏上下文');

  const workspace = createWorkspaceStructure({
    selectedDirectory: tempDir,
    now: new Date('2026-06-18T12:00:00.000Z')
  });

  assert.equal(workspace.rootPath, tempDir);
  assert.equal(workspace.contextPath, tempDir);
  assert.equal(workspace.markerPath, join(tempDir, '.game-context-manager.yml'));
  assert.equal(workspace.schemaVersion, WORKSPACE_SCHEMA_VERSION);
  assert.equal(existsSync(join(tempDir, '.game-context-manager.yml')), true);
  assert.equal(existsSync(join(tempDir, 'game-context')), false);

  const markerText = readFileSync(join(tempDir, '.game-context-manager.yml'), 'utf8');
  const marker = parse(markerText) as {
    schema_version: number;
    workspace_id: string;
    generator: string;
    created_at: string;
    main_node_id: string | null;
    main_node_folder_name: string | null;
  };

  assert.equal(marker.schema_version, WORKSPACE_SCHEMA_VERSION);
  assert.equal(marker.workspace_id, workspace.id);
  assert.equal(marker.generator, 'game-context-manager');
  assert.equal(marker.created_at, '2026-06-18T12:00:00.000Z');
  assert.equal(marker.main_node_id, null);
  assert.equal(marker.main_node_folder_name, null);

  const secondWorkspace = createWorkspaceStructure({
    selectedDirectory: tempDir,
    now: new Date('2026-06-18T12:01:00.000Z')
  });

  assert.deepEqual(secondWorkspace.createdPaths, []);
  assert.equal(secondWorkspace.existingPaths.includes('.game-context-manager.yml'), true);

  const users: LocalUser[] = [
    {
      id: 'user_import_a',
      displayName: 'Importer A',
      createdAt: '2026-06-18T12:00:00.000Z',
      lastLoginAt: '2026-06-18T12:00:00.000Z'
    }
  ];

  const emptyImport = importWorkspaceFromDirectory(tempDir, users[0].id, new Date('2026-06-18T12:02:00.000Z'));
  assert.equal(emptyImport.summary.imported.gameCount, 0);
  assert.equal(emptyImport.snapshot.game, undefined);

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
    relativePath: '导入测试游戏游戏上下文/assets/images/img_import_main__import.png',
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
    markerPath: secondWorkspace.markerPath,
    activeGameId: game.id,
    activeGameFolderName: '导入测试游戏游戏上下文',
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
  writeFileSync(join(tempDir, image.relativePath), 'fake image');

  const importedWorkspace = importWorkspaceFromDirectory(tempDir, users[0].id, new Date('2026-06-18T13:05:00.000Z'));

  assert.equal(importedWorkspace.summary.imported.gameCount, 1);
  assert.equal(importedWorkspace.summary.imported.moduleCount, 1);
  assert.equal(importedWorkspace.summary.imported.contentCount, 1);
  assert.equal(importedWorkspace.summary.imported.imageCount, 1);
  assert.equal(importedWorkspace.summary.existingPaths.includes('manifest.yml'), true);
  assert.equal(importedWorkspace.summary.existingPaths.includes('导入测试游戏游戏上下文/INDEX.md'), true);
  assert.equal(importedWorkspace.summary.existingPaths.includes('导入测试游戏游戏上下文/image_catalog.yml'), true);
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
    assert.equal(sqliteService.getWorkspace(importedWorkspace.summary.id)?.activeGameFolderName, '导入测试游戏游戏上下文');
    assert.equal(sqliteService.getWorkspace(importedWorkspace.summary.id)?.directoryIndexNeedsExport, false);
    assert.equal(sqliteService.getGameNode(importedWorkspace.summary.id)?.gameName, game.gameName);
    assert.equal(sqliteService.getModuleNodes(importedWorkspace.summary.id)[0].moduleName, module.moduleName);
    assert.equal(sqliteService.getContentNodes(importedWorkspace.summary.id)[0].title, content.title);
    assert.equal(sqliteService.getImageAssets(importedWorkspace.summary.id)[0].displayName, image.displayName);
    assert.deepEqual(sqliteService.getNodeImageLinks(importedWorkspace.summary.id), sortedImageLinks);
  } finally {
    sqliteService.close();
  }

  unlinkSync(join(tempDir, 'manifest.yml'));
  unlinkSync(join(tempDir, '导入测试游戏游戏上下文', 'INDEX.md'));
  unlinkSync(join(tempDir, '导入测试游戏游戏上下文', 'image_catalog.yml'));

  const fallbackImportedWorkspace = importWorkspaceFromDirectory(tempDir, users[0].id, new Date('2026-06-18T13:06:00.000Z'));

  assert.equal(fallbackImportedWorkspace.summary.imported.gameCount, 1);
  assert.equal(fallbackImportedWorkspace.summary.imported.moduleCount, 1);
  assert.equal(fallbackImportedWorkspace.summary.imported.contentCount, 1);
  assert.equal(fallbackImportedWorkspace.summary.imported.imageCount, 1);
  assert.equal(fallbackImportedWorkspace.snapshot.workspace.directoryIndexNeedsExport, true);
  assert.equal(fallbackImportedWorkspace.snapshot.images[0].id, image.id);
  assert.equal(fallbackImportedWorkspace.snapshot.images[0].relativePath, image.relativePath);
  assert.equal(
    fallbackImportedWorkspace.summary.warnings.some((warning) => warning.includes('manifest.yml is missing')),
    true
  );
  assert.equal(
    fallbackImportedWorkspace.summary.warnings.some((warning) => warning.includes('image_catalog.yml is missing')),
    true
  );

  const unmarkedDirectory = join(tempDir, 'unmarked');
  mkdirSync(unmarkedDirectory);
  assert.throws(
    () => importWorkspaceFromDirectory(unmarkedDirectory, users[0].id, new Date('2026-06-18T13:10:00.000Z')),
    /No valid \.game-context-manager\.yml/
  );

  const nestedWorkspaceDirectory = join(tempDir, 'nested-workspace');
  mkdirSync(nestedWorkspaceDirectory);
  createWorkspaceStructure({
    selectedDirectory: nestedWorkspaceDirectory,
    now: new Date('2026-06-18T13:11:00.000Z')
  });
  assert.throws(
    () => importWorkspaceFromDirectory(tempDir, users[0].id, new Date('2026-06-18T13:12:00.000Z')),
    /Multiple game context workspace markers/
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
