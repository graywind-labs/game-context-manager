import electron from 'electron';
import { createWorkspaceStructure, importWorkspaceFromDirectory } from '../services/workspaceService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type { WorkspaceConfig, WorkspaceCreationResult, WorkspaceImportResult } from '../../shared/index.js';

const { BrowserWindow, dialog, ipcMain } = electron;

export const WORKSPACE_CREATE_CHANNEL = 'workspace:create';
export const WORKSPACE_IMPORT_CHANNEL = 'workspace:import';

export function registerWorkspaceIpc(sqliteService: SqliteService): void {
  ipcMain.handle(WORKSPACE_CREATE_CHANNEL, async (event): Promise<WorkspaceCreationResult> => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const dialogOptions: Electron.OpenDialogOptions = {
      title: 'Select a folder for game-context',
      properties: ['openDirectory', 'createDirectory']
    };
    const selection = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (selection.canceled || selection.filePaths.length === 0) {
      return {
        canceled: true
      };
    }

    const workspace = createWorkspaceStructure({
      selectedDirectory: selection.filePaths[0]
    });

    const workspaceConfig: WorkspaceConfig = {
      id: workspace.id,
      rootPath: workspace.rootPath,
      contextPath: workspace.contextPath,
      currentUserId: sqliteService.getUserState().currentUser?.id,
      schemaVersion: workspace.schemaVersion,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    };

    sqliteService.saveWorkspace(workspaceConfig);

    return {
      canceled: false,
      workspace
    };
  });

  ipcMain.handle(WORKSPACE_IMPORT_CHANNEL, async (event): Promise<WorkspaceImportResult> => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const dialogOptions: Electron.OpenDialogOptions = {
      title: 'Select an existing game-context folder',
      properties: ['openDirectory']
    };
    const selection = parentWindow
      ? await dialog.showOpenDialog(parentWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (selection.canceled || selection.filePaths.length === 0) {
      return {
        canceled: true
      };
    }

    const importedWorkspace = importWorkspaceFromDirectory(
      selection.filePaths[0],
      sqliteService.getUserState().currentUser?.id
    );

    sqliteService.replaceWorkspaceSnapshot(importedWorkspace.snapshot);

    return {
      canceled: false,
      workspace: importedWorkspace.summary
    };
  });
}
