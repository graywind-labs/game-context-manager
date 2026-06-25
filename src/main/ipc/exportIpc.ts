import electron from 'electron';
import { exportAgentFilesForWorkspace, exportDirectoryIndexForWorkspace } from '../services/exportWorkflowService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type { ExportResult, ExportWorkspaceInput, WorkspaceConfig } from '../../shared/index.js';

const { ipcMain } = electron;

export const EXPORT_AGENT_FILES_CHANNEL = 'export:agent-files';
export const EXPORT_DIRECTORY_INDEX_CHANNEL = 'export:directory-index';

export function registerExportIpc(sqliteService: SqliteService): void {
  ipcMain.handle(EXPORT_AGENT_FILES_CHANNEL, (_event, input: ExportWorkspaceInput): ExportResult => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const exportedPaths = exportAgentFilesForWorkspace(sqliteService, input.workspaceId);

    return {
      exportedPaths,
      directoryIndexNeedsExport: Boolean(workspace.directoryIndexNeedsExport)
    };
  });

  ipcMain.handle(EXPORT_DIRECTORY_INDEX_CHANNEL, (_event, input: ExportWorkspaceInput): ExportResult => {
    const exportedPaths = exportDirectoryIndexForWorkspace(sqliteService, input.workspaceId);

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
