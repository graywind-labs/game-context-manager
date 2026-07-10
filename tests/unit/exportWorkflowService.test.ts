import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
  exportAgentFilesForWorkspace,
  exportDirectoryIndexForWorkspace,
  exportDirectoryIndexForWorkspaceIfGameExists
} from '../../src/main/services/exportWorkflowService.js';
import { exportGameNodeFiles } from '../../src/main/services/fileExportService.js';
import { initializeSqliteService, type SqliteService } from '../../src/main/services/sqliteService.js';
import { createWorkspaceStructure } from '../../src/main/services/workspaceService.js';
import { ProjectStage } from '../../src/shared/index.js';

const tempDir = mkdtempSync(join(tmpdir(), 'gcm-export-workflow-'));
let sqliteService: SqliteService | undefined;

try {
  sqliteService = initializeSqliteService({
    databasePath: join(tempDir, 'test.sqlite3'),
    journalMode: 'DELETE'
  });
  const workspaceSummary = createWorkspaceStructure({
    selectedDirectory: tempDir,
    now: new Date('2026-06-25T12:00:00.000Z')
  });

  sqliteService.saveWorkspace({
    id: workspaceSummary.id,
    rootPath: workspaceSummary.rootPath,
    contextPath: workspaceSummary.contextPath,
    markerPath: workspaceSummary.markerPath,
    schemaVersion: workspaceSummary.schemaVersion,
    createdAt: workspaceSummary.createdAt,
    updatedAt: workspaceSummary.updatedAt
  });

  assert.deepEqual(exportDirectoryIndexForWorkspaceIfGameExists(sqliteService, workspaceSummary.id), []);

  const user = sqliteService.createLocalUser({ displayName: '策划 A' }, workspaceSummary.id);
  const game = sqliteService.createGameNode(
    {
      workspaceId: workspaceSummary.id,
      gameName: '自动导出测试',
      gameVersion: 'v1.0',
      projectStage: ProjectStage.Testing,
      coreGameplay: '验证保存后目录自动导出。'
    },
    user.id
  );
  const workspace = sqliteService.getWorkspace(workspaceSummary.id);

  assert.ok(workspace);
  assert.equal(workspace.directoryIndexNeedsExport, true);
  exportGameNodeFiles({
    workspace,
    game,
    users: sqliteService.getUserState(workspaceSummary.id).users
  });

  const agentPaths = exportAgentFilesForWorkspace(sqliteService, workspaceSummary.id);
  assert.deepEqual(agentPaths, [join(tempDir, 'AGENTS.md')]);
  assert.equal(existsSync(join(tempDir, 'AGENTS.md')), true);

  const indexPaths = exportDirectoryIndexForWorkspace(sqliteService, workspaceSummary.id);
  const gameDirectory = join(tempDir, '自动导出测试游戏上下文');

  assert.deepEqual(indexPaths.sort(), [
    join(tempDir, 'manifest.yml'),
    join(gameDirectory, 'INDEX.md'),
    join(gameDirectory, 'image_catalog.yml')
  ].sort());
  assert.equal(existsSync(join(tempDir, 'manifest.yml')), true);
  assert.equal(existsSync(join(gameDirectory, 'INDEX.md')), true);
  assert.equal(existsSync(join(gameDirectory, 'image_catalog.yml')), true);
  assert.equal(sqliteService.getWorkspace(workspaceSummary.id)?.directoryIndexNeedsExport, false);

  const manifest = parse(readFileSync(join(tempDir, 'manifest.yml'), 'utf8')) as {
    game: { path: string; index: string; image_catalog: string };
    workspace: { agents: string };
  };

  assert.equal(manifest.workspace.agents, 'AGENTS.md');
  assert.equal(manifest.game.path, '自动导出测试游戏上下文/game.md');
  assert.equal(manifest.game.index, '自动导出测试游戏上下文/INDEX.md');
  assert.equal(manifest.game.image_catalog, '自动导出测试游戏上下文/image_catalog.yml');
} finally {
  sqliteService?.close();
  rmSync(tempDir, { recursive: true, force: true });
}
