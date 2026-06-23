import electron from 'electron';
import { exportAgentInstructionFiles, exportDirectoryIndexFiles } from '../services/fileExportService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type { ExportResult, ExportWorkspaceInput, GameNode, WorkspaceConfig } from '../../shared/index.js';

const { ipcMain } = electron;

export const EXPORT_AGENT_FILES_CHANNEL = 'export:agent-files';
export const EXPORT_DIRECTORY_INDEX_CHANNEL = 'export:directory-index';

export function registerExportIpc(sqliteService: SqliteService): void {
  ipcMain.handle(EXPORT_AGENT_FILES_CHANNEL, (_event, input: ExportWorkspaceInput): ExportResult => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const { language } = sqliteService.getAppSettings();
    const exportedPaths = exportAgentInstructionFiles({ workspace, language });

    return {
      exportedPaths,
      directoryIndexNeedsExport: Boolean(workspace.directoryIndexNeedsExport)
    };
  });

  ipcMain.handle(EXPORT_DIRECTORY_INDEX_CHANNEL, (_event, input: ExportWorkspaceInput): ExportResult => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const game = requireGame(sqliteService, input.workspaceId);
    const { language } = sqliteService.getAppSettings();
    const exportedPaths = exportDirectoryIndexFiles({
      workspace,
      game,
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      users: sqliteService.getUserState(input.workspaceId).users,
      images: sqliteService.getImageAssets(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId),
      language
    });

    sqliteService.markWorkspaceDirectoryIndexExported(input.workspaceId);

    return {
      exportedPaths,
      directoryIndexNeedsExport: false
    };
  });
}

function requireWorkspace(sqliteService: SqliteService, workspaceId: string): WorkspaceConfig {
  const workspace = sqliteService.getWorkspace(workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  return workspace;
}

function requireGame(sqliteService: SqliteService, workspaceId: string): GameNode {
  const game = sqliteService.getGameNode(workspaceId);

  if (!game) {
    throw new Error('Create the game root node before exporting the current directory.');
  }

  return game;
}
