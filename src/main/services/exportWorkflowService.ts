import { exportAgentInstructionFiles, exportDirectoryIndexFiles } from './fileExportService.js';
import type { SqliteService } from './sqliteService.js';
import type { GameNode, WorkspaceConfig, WorkspaceId } from '../../shared/index.js';

export function exportAgentFilesForWorkspace(sqliteService: SqliteService, workspaceId: WorkspaceId): string[] {
  const workspace = requireWorkspace(sqliteService, workspaceId);
  const { language } = sqliteService.getAppSettings();

  return exportAgentInstructionFiles({ workspace, language });
}

export function exportDirectoryIndexForWorkspace(sqliteService: SqliteService, workspaceId: WorkspaceId): string[] {
  const workspace = requireWorkspace(sqliteService, workspaceId);
  const game = requireGame(sqliteService, workspaceId);
  const { language } = sqliteService.getAppSettings();
  const exportedPaths = exportDirectoryIndexFiles({
    workspace,
    game,
    modules: sqliteService.getModuleNodes(workspaceId),
    contents: sqliteService.getContentNodes(workspaceId),
    users: sqliteService.getUserState(workspaceId).users,
    images: sqliteService.getImageAssets(workspaceId),
    imageLinks: sqliteService.getNodeImageLinks(workspaceId),
    language
  });

  sqliteService.markWorkspaceDirectoryIndexExported(workspaceId);

  return exportedPaths;
}

export function exportDirectoryIndexForWorkspaceIfGameExists(sqliteService: SqliteService, workspaceId: WorkspaceId): string[] {
  if (!sqliteService.getGameNode(workspaceId)) {
    return [];
  }

  return exportDirectoryIndexForWorkspace(sqliteService, workspaceId);
}

function requireWorkspace(sqliteService: SqliteService, workspaceId: WorkspaceId): WorkspaceConfig {
  const workspace = sqliteService.getWorkspace(workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  return workspace;
}

function requireGame(sqliteService: SqliteService, workspaceId: WorkspaceId): GameNode {
  const game = sqliteService.getGameNode(workspaceId);

  if (!game) {
    throw new Error('Create the game root node before exporting the current directory.');
  }

  return game;
}
