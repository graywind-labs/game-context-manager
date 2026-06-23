import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DATABASE_SCHEMA_VERSION,
  REQUIRED_TABLES,
  initializeSqliteService
} from '../../src/main/services/sqliteService.js';
import { ProjectStage } from '../../src/shared/index.js';

const tempDir = mkdtempSync(join(tmpdir(), 'gcm-sqlite-'));

try {
  const databasePath = join(tempDir, 'test.sqlite3');
  const firstService = initializeSqliteService({ databasePath, journalMode: 'DELETE' });

  assert.equal(firstService.schemaVersion, DATABASE_SCHEMA_VERSION);
  assert.deepEqual(firstService.getAppliedMigrations(), [1, 2, 3, 4, DATABASE_SCHEMA_VERSION]);
  assert.deepEqual(firstService.verifyRequiredTables().missingTables, []);

  const tableNames = new Set(firstService.getTableNames());
  for (const tableName of REQUIRED_TABLES) {
    assert.equal(tableNames.has(tableName), true, `Expected table ${tableName} to exist`);
  }

  firstService.saveWorkspace({
    id: 'workspace_test',
    rootPath: tempDir,
    contextPath: tempDir,
    markerPath: join(tempDir, '.game-context-manager.yml'),
    schemaVersion: 1,
    createdAt: '2026-06-18T12:00:00.000Z',
    updatedAt: '2026-06-18T12:00:00.000Z'
  });

  const workspaceRow = firstService.database
    .prepare('SELECT id, root_path, context_path, marker_path FROM workspaces WHERE id = ?')
    .get('workspace_test') as { id: string; root_path: string; context_path: string; marker_path: string | null } | undefined;

  assert.equal(workspaceRow?.id, 'workspace_test');
  assert.equal(workspaceRow?.root_path, tempDir);
  assert.equal(workspaceRow?.context_path, tempDir);
  assert.equal(workspaceRow?.marker_path, join(tempDir, '.game-context-manager.yml'));
  assert.equal(firstService.getWorkspace('workspace_test')?.directoryIndexNeedsExport, false);

  const firstUserState = firstService.getUserState();
  assert.deepEqual(firstUserState.users, []);
  assert.equal(firstUserState.currentUser, undefined);

  const firstUser = firstService.createLocalUser({ displayName: '  策划 A  ' }, 'workspace_test');
  assert.equal(firstUser.displayName, '策划 A');
  assert.equal(firstService.getUserState('workspace_test').currentUser?.id, firstUser.id);

  const apiConfig = firstService.saveApiConfig({
    baseUrl: ' mock://local ',
    apiKey: ' sk-local-secret ',
    modelName: ' mock-model '
  });

  assert.equal(apiConfig.baseUrl, 'mock://local');
  assert.equal(apiConfig.apiKey, 'sk-local-secret');
  assert.equal(apiConfig.modelName, 'mock-model');
  assert.equal(firstService.getApiConfig()?.apiKey, 'sk-local-secret');
  assert.equal(firstService.getAppSettings().language, 'zh');
  assert.equal(firstService.saveAppSettings({ language: 'en' }).language, 'en');
  assert.equal(firstService.getAppSettings().language, 'en');

  const secondUser = firstService.createLocalUser({ displayName: 'Designer B' });
  const selectedUserState = firstService.getUserState();
  assert.equal(selectedUserState.users.length, 2);
  assert.equal(selectedUserState.currentUser?.id, secondUser.id);

  firstService.selectCurrentUser(firstUser.id, 'workspace_test');

  const updatedWorkspaceRow = firstService.database
    .prepare('SELECT current_user_id FROM workspaces WHERE id = ?')
    .get('workspace_test') as { current_user_id: string | null } | undefined;

  assert.equal(updatedWorkspaceRow?.current_user_id, firstUser.id);
  assert.equal(firstService.getUserState('workspace_test').currentUser?.id, firstUser.id);
  const loggedOutState = firstService.logoutCurrentUser();
  assert.equal(loggedOutState.currentUser, undefined);
  assert.equal(firstService.getUserState('workspace_test').currentUser, undefined);
  firstService.selectCurrentUser(firstUser.id, 'workspace_test');
  assert.equal(firstService.getUserState('workspace_test').currentUser?.id, firstUser.id);

  const createdGame = firstService.createGameNode(
    {
      workspaceId: 'workspace_test',
      gameName: '  使命防线  ',
      gameVersion: ' v0.3.2 ',
      projectStage: ProjectStage.Testing,
      coreGameplay: '开箱获得部件。'
    },
    firstUser.id
  );

  assert.equal(createdGame.id, 'game_001');
  assert.equal(createdGame.gameName, '使命防线');
  assert.equal(createdGame.gameVersion, 'v0.3.2');
  assert.equal(createdGame.creatorId, firstUser.id);
  assert.equal(createdGame.lastEditorId, firstUser.id);
  assert.equal(firstService.getGameNode('workspace_test')?.id, createdGame.id);
  assert.equal(firstService.getWorkspace('workspace_test')?.directoryIndexNeedsExport, true);
  firstService.markWorkspaceDirectoryIndexExported('workspace_test');
  assert.equal(firstService.getWorkspace('workspace_test')?.directoryIndexNeedsExport, false);

  assert.throws(
    () =>
      firstService.createGameNode(
        {
          workspaceId: 'workspace_test',
          gameName: '第二个游戏',
          gameVersion: 'v1',
          projectStage: ProjectStage.Planning
        },
        firstUser.id
      ),
    /already has a game node/
  );

  const editedGame = firstService.updateGameNode(
    'workspace_test',
    {
      workspaceId: 'workspace_test',
      gameName: '使命防线 Plus',
      gameVersion: 'v0.3.3',
      projectStage: ProjectStage.Live,
      mainFun: '持续开箱和战车成长。'
    },
    secondUser.id
  );

  assert.equal(editedGame.id, createdGame.id);
  assert.equal(editedGame.creatorId, firstUser.id);
  assert.equal(editedGame.lastEditorId, secondUser.id);
  assert.equal(editedGame.gameName, '使命防线 Plus');
  assert.equal(editedGame.gameVersion, 'v0.3.3');
  assert.equal(editedGame.mainFun, '持续开箱和战车成长。');
  assert.equal(firstService.getWorkspace('workspace_test')?.directoryIndexNeedsExport, true);

  const gameWorkspaceRow = firstService.database
    .prepare('SELECT active_game_id, active_game_folder_name FROM workspaces WHERE id = ?')
    .get('workspace_test') as { active_game_id: string | null; active_game_folder_name: string | null } | undefined;

  assert.equal(gameWorkspaceRow?.active_game_id, createdGame.id);
  assert.equal(gameWorkspaceRow?.active_game_folder_name, '使命防线游戏上下文');

  const image = firstService.createImageAsset('workspace_test', {
    id: 'img_main_screen_1234abcd',
    displayName: '主界面截图',
    originalFileName: '乱码文件名###.png',
    relativePath: '使命防线游戏上下文/assets/images/img_main_screen_1234abcd__main-screen.png',
    fileType: 'png',
    gameId: createdGame.id,
    uploaderId: firstUser.id,
    updatedAt: '2026-06-18T12:40:00.000Z',
    notes: '用于验证图片元数据。'
  });

  assert.equal(image.originalFileName, '乱码文件名###.png');

  const images = firstService.getImageAssets('workspace_test');
  assert.equal(images.length, 1);
  assert.equal(images[0].displayName, '主界面截图');
  assert.equal(images[0].originalFileName, '乱码文件名###.png');
  assert.equal(images[0].relativePath.includes('乱码文件名'), false);
  assert.equal(images[0].relativePath.endsWith('__main-screen.png'), true);

  const createdModule = firstService.createModuleNode(
    {
      workspaceId: 'workspace_test',
      moduleName: '  生产线/开箱  ',
      modulePositioning: '主界面开箱与生产线入口。',
      imageIds: [image.id]
    },
    firstUser.id
  );

  assert.equal(createdModule.id, 'module_001');
  assert.equal(createdModule.gameId, createdGame.id);
  assert.equal(createdModule.gameVersion, editedGame.gameVersion);
  assert.equal(createdModule.moduleName, '生产线/开箱');
  assert.deepEqual(createdModule.imageIds, [image.id]);
  assert.equal(createdModule.creatorId, firstUser.id);

  const secondModule = firstService.createModuleNode(
    {
      workspaceId: 'workspace_test',
      moduleName: '商店',
      imageIds: [image.id]
    },
    secondUser.id
  );

  assert.deepEqual(secondModule.imageIds, [image.id]);
  assert.equal(firstService.getNodeImageLinks('workspace_test').filter((link) => link.imageId === image.id).length, 2);

  const editedModule = firstService.updateModuleNode(
    {
      workspaceId: 'workspace_test',
      id: createdModule.id,
      moduleName: '生产线',
      systemRules: '消耗钥匙开箱。',
      imageIds: []
    },
    secondUser.id
  );

  assert.equal(editedModule.id, createdModule.id);
  assert.equal(editedModule.creatorId, firstUser.id);
  assert.equal(editedModule.lastEditorId, secondUser.id);
  assert.equal(editedModule.gameId, createdGame.id);
  assert.equal(editedModule.gameVersion, editedGame.gameVersion);
  assert.deepEqual(editedModule.imageIds, []);
  assert.deepEqual(firstService.getModuleNode('workspace_test', createdModule.id)?.imageIds, []);

  firstService.deleteModuleNode({ workspaceId: 'workspace_test', id: createdModule.id });
  assert.equal(firstService.getModuleNode('workspace_test', createdModule.id), undefined);
  assert.equal(firstService.getModuleNodes('workspace_test').length, 1);
  assert.deepEqual(
    firstService.getNodeImageLinks('workspace_test').map((link) => `${link.nodeType}:${link.nodeId}:${link.imageId}`),
    [`module:${secondModule.id}:${image.id}`]
  );

  assert.throws(
    () =>
      firstService.createContentNode(
        {
          workspaceId: 'workspace_test',
          moduleId: secondModule.id,
          title: '未关联图片引用',
          imageIds: [],
          processDescription: `这里引用了 @${image.id}。`
        },
        firstUser.id
      ),
    /not linked/
  );

  const createdContent = firstService.createContentNode(
    {
      workspaceId: 'workspace_test',
      moduleId: secondModule.id,
      title: '第一天首次进入商店',
      imageIds: [image.id],
      accountDay: '1',
      cumulativePaymentAmount: '0',
      maxMainlineProgress: '1-3',
      characterLevel: '5',
      processDescription: `玩家看到 @${image.id} 后进入商店。`,
      subjectiveFun: '入口清晰。',
      subjectiveKnownProblems: '商品层级偏深。',
      subjectiveOptimizationDirections: '突出每日推荐。'
    },
    firstUser.id
  );

  assert.equal(createdContent.gameId, createdGame.id);
  assert.equal(createdContent.gameVersion, secondModule.gameVersion);
  assert.equal(createdContent.moduleId, secondModule.id);
  assert.deepEqual(createdContent.imageIds, [image.id]);
  assert.equal(firstService.getContentNodes('workspace_test', secondModule.id).length, 1);

  const editedContent = firstService.updateContentNode(
    {
      workspaceId: 'workspace_test',
      id: createdContent.id,
      moduleId: secondModule.id,
      title: '第一天首次进入商店入口',
      imageIds: [image.id],
      processDescription: `玩家看到 @${image.displayName} 后进入商店。`
    },
    secondUser.id
  );

  assert.equal(editedContent.id, createdContent.id);
  assert.equal(editedContent.creatorId, firstUser.id);
  assert.equal(editedContent.lastEditorId, secondUser.id);
  assert.equal(editedContent.title, '第一天首次进入商店入口');
  assert.equal(editedContent.processDescription, `玩家看到 @${image.displayName} 后进入商店。`);
  assert.deepEqual(
    firstService.getNodeImageLinks('workspace_test').map((link) => `${link.nodeType}:${link.nodeId}:${link.imageId}`),
    [`content:${createdContent.id}:${image.id}`, `module:${secondModule.id}:${image.id}`]
  );

  const temporaryContent = firstService.createContentNode(
    {
      workspaceId: 'workspace_test',
      moduleId: secondModule.id,
      title: '临时内容',
      imageIds: [image.id],
      processDescription: `临时引用 @${image.id}。`
    },
    firstUser.id
  );

  firstService.deleteContentNode({ workspaceId: 'workspace_test', id: temporaryContent.id });
  assert.equal(firstService.getContentNode('workspace_test', temporaryContent.id), undefined);
  assert.equal(
    firstService.getNodeImageLinks('workspace_test').some((link) => link.nodeType === 'content' && link.nodeId === temporaryContent.id),
    false
  );

  const cascadeModule = firstService.createModuleNode(
    {
      workspaceId: 'workspace_test',
      moduleName: '战斗',
      imageIds: [image.id]
    },
    firstUser.id
  );
  const cascadeContent = firstService.createContentNode(
    {
      workspaceId: 'workspace_test',
      moduleId: cascadeModule.id,
      title: '战斗第一天',
      imageIds: [image.id],
      processDescription: `战斗入口 @${image.id}。`
    },
    firstUser.id
  );

  firstService.deleteModuleNode({ workspaceId: 'workspace_test', id: cascadeModule.id });
  assert.equal(firstService.getModuleNode('workspace_test', cascadeModule.id), undefined);
  assert.equal(firstService.getContentNode('workspace_test', cascadeContent.id), undefined);
  assert.equal(
    firstService
      .getNodeImageLinks('workspace_test')
      .some((link) => link.nodeId === cascadeModule.id || link.nodeId === cascadeContent.id),
    false
  );
  assert.equal(firstService.getImageAssets('workspace_test').some((asset) => asset.id === image.id), true);

  const removableImage = firstService.createImageAsset('workspace_test', {
    id: 'img_deleted_5678efgh',
    displayName: '删除测试图',
    originalFileName: 'delete-me.png',
    relativePath: '使命防线游戏上下文/assets/images/img_deleted_5678efgh__delete-me.png',
    fileType: 'png',
    gameId: createdGame.id,
    uploaderId: firstUser.id,
    updatedAt: '2026-06-18T13:10:00.000Z'
  });

  firstService.updateModuleNode(
    {
      workspaceId: 'workspace_test',
      id: secondModule.id,
      moduleName: secondModule.moduleName,
      imageIds: [image.id, removableImage.id]
    },
    secondUser.id
  );
  firstService.updateContentNode(
    {
      workspaceId: 'workspace_test',
      id: createdContent.id,
      moduleId: secondModule.id,
      title: editedContent.title,
      imageIds: [image.id, removableImage.id],
      processDescription: `玩家看到 @${image.displayName} 和 @${removableImage.id} 后进入商店。`
    },
    secondUser.id
  );

  firstService.deleteImageAsset({ workspaceId: 'workspace_test', id: removableImage.id });
  assert.equal(firstService.getImageAsset('workspace_test', removableImage.id), undefined);
  assert.deepEqual(firstService.getModuleNode('workspace_test', secondModule.id)?.imageIds, [image.id]);
  const contentAfterImageDelete = firstService.getContentNode('workspace_test', createdContent.id);
  assert.deepEqual(contentAfterImageDelete?.imageIds, [image.id]);
  assert.equal(contentAfterImageDelete?.processDescription?.includes(`@${removableImage.id}`), false);
  assert.equal(
    firstService.getNodeImageLinks('workspace_test').some((link) => link.imageId === removableImage.id),
    false
  );

  firstService.close();

  const secondService = initializeSqliteService({ databasePath, journalMode: 'DELETE' });
  assert.deepEqual(secondService.getAppliedMigrations(), [1, 2, 3, 4, DATABASE_SCHEMA_VERSION]);
  assert.deepEqual(secondService.verifyRequiredTables().missingTables, []);
  assert.equal(secondService.getUserState('workspace_test').currentUser?.id, firstUser.id);
  assert.equal(secondService.getApiConfig()?.baseUrl, 'mock://local');
  assert.equal(secondService.getApiConfig()?.apiKey, 'sk-local-secret');
  assert.equal(secondService.getAppSettings().language, 'en');
  assert.equal(secondService.getGameNode('workspace_test')?.id, createdGame.id);
  assert.equal(secondService.getImageAssets('workspace_test')[0]?.id, image.id);
  assert.equal(secondService.getModuleNodes('workspace_test')[0]?.id, secondModule.id);
  assert.deepEqual(secondService.getModuleNodes('workspace_test')[0]?.imageIds, [image.id]);
  assert.equal(secondService.getContentNodes('workspace_test', secondModule.id)[0]?.id, createdContent.id);
  assert.deepEqual(secondService.getContentNodes('workspace_test', secondModule.id)[0]?.imageIds, [image.id]);
  assert.equal(secondService.getWorkspace('workspace_test')?.directoryIndexNeedsExport, true);
  secondService.deleteGameNode({ workspaceId: 'workspace_test' });
  assert.equal(secondService.getGameNode('workspace_test'), undefined);
  assert.equal(secondService.getModuleNode('workspace_test', secondModule.id), undefined);
  assert.equal(secondService.getContentNode('workspace_test', createdContent.id), undefined);
  assert.equal(secondService.getImageAsset('workspace_test', image.id), undefined);
  assert.deepEqual(secondService.getImageAssets('workspace_test'), []);
  assert.equal(secondService.getWorkspace('workspace_test')?.activeGameId, undefined);
  assert.equal(secondService.getWorkspace('workspace_test')?.directoryIndexNeedsExport, true);
  secondService.close();
} finally {
  try {
    rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EPERM')) {
      throw error;
    }
  }
}
