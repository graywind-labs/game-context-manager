import electron from 'electron';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { exportDirectoryIndexForWorkspaceIfGameExists } from '../services/exportWorkflowService.js';
import { resolveKnownWorkspaceItemFilePath } from '../services/fileExportService.js';
import { WORKSPACE_MARKER_FILE_NAME, createWorkspaceStructure, importWorkspaceFromDirectory } from '../services/workspaceService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type {
  OpenKnownWorkspaceItemInput,
  DeleteKnownWorkspaceItemInput,
  DeleteKnownWorkspaceItemResult,
  ReadKnownWorkspaceItemInput,
  ReadKnownWorkspaceItemResult,
  WorkspaceConfig,
  WorkspaceCreationResult,
  WorkspaceImportResult,
  WorkspaceRefreshInput,
  WorkspaceRefreshResult,
  WorkspaceRestoreResult
} from '../../shared/index.js';

const { BrowserWindow, dialog, ipcMain, shell } = electron;

export const WORKSPACE_CREATE_CHANNEL = 'workspace:create';
export const WORKSPACE_IMPORT_CHANNEL = 'workspace:import';
export const WORKSPACE_REFRESH_CHANNEL = 'workspace:refresh';
export const WORKSPACE_RESTORE_RECENT_CHANNEL = 'workspace:restore-recent';
export const WORKSPACE_OPEN_KNOWN_ITEM_CHANNEL = 'workspace:open-known-item';
export const WORKSPACE_READ_KNOWN_ITEM_CHANNEL = 'workspace:read-known-item';
export const WORKSPACE_DELETE_KNOWN_ITEM_CHANNEL = 'workspace:delete-known-item';

export function registerWorkspaceIpc(sqliteService: SqliteService): void {
  ipcMain.handle(WORKSPACE_CREATE_CHANNEL, async (event): Promise<WorkspaceCreationResult> => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const dialogOptions: Electron.OpenDialogOptions = {
      title: 'Select the workspace root folder',
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
      markerPath: workspace.markerPath,
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
      title: 'Select an existing game context workspace folder',
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

  ipcMain.handle(WORKSPACE_REFRESH_CHANNEL, (_event, input: WorkspaceRefreshInput): WorkspaceRefreshResult => {
    const workspace = sqliteService.getWorkspace(input.workspaceId);

    if (!workspace) {
      throw new Error(`Workspace not found: ${input.workspaceId}`);
    }

    const currentUserId =
      workspace.currentUserId ?? sqliteService.getUserState(workspace.id).currentUser?.id ?? sqliteService.getUserState().currentUser?.id;
    const refreshedWorkspace = importWorkspaceFromDirectory(workspace.contextPath, currentUserId);

    sqliteService.replaceWorkspaceSnapshot(refreshedWorkspace.snapshot);

    return {
      workspace: refreshedWorkspace.summary
    };
  });

  ipcMain.handle(WORKSPACE_RESTORE_RECENT_CHANNEL, (): WorkspaceRestoreResult => {
    const row = sqliteService.database
      .prepare('SELECT id FROM workspaces ORDER BY updated_at DESC LIMIT 1')
      .get() as { id: string } | undefined;

    if (!row) {
      return {};
    }

    const workspace = sqliteService.getWorkspace(row.id);

    if (!workspace) {
      return {};
    }

    const markerPath = workspace.markerPath ?? join(workspace.contextPath, WORKSPACE_MARKER_FILE_NAME);

    if (!existsSync(markerPath)) {
      return {};
    }

    const currentUserId =
      workspace.currentUserId ?? sqliteService.getUserState(workspace.id).currentUser?.id ?? sqliteService.getUserState().currentUser?.id;
    const restoredWorkspace = importWorkspaceFromDirectory(workspace.contextPath, currentUserId);

    sqliteService.replaceWorkspaceSnapshot(restoredWorkspace.snapshot);

    return {
      workspace: restoredWorkspace.summary
    };
  });

  ipcMain.handle(WORKSPACE_OPEN_KNOWN_ITEM_CHANNEL, (_event, input: OpenKnownWorkspaceItemInput): void => {
    const safeTargetPath = resolveKnownItemPath(sqliteService, input);

    shell.showItemInFolder(safeTargetPath);
  });

  ipcMain.handle(WORKSPACE_READ_KNOWN_ITEM_CHANNEL, (_event, input: ReadKnownWorkspaceItemInput): ReadKnownWorkspaceItemResult => {
    const safeTargetPath = resolveKnownItemPath(sqliteService, input);

    return {
      content: readFileSync(safeTargetPath, 'utf8')
    };
  });

  ipcMain.handle(WORKSPACE_DELETE_KNOWN_ITEM_CHANNEL, (_event, input: DeleteKnownWorkspaceItemInput): DeleteKnownWorkspaceItemResult => {
    if (input.item.kind !== 'indexFile') {
      throw new Error('Only exported Agent and index files can be deleted through this workspace file action.');
    }

    const safeTargetPath = resolveKnownItemPath(sqliteService, input);
    unlinkSync(safeTargetPath);
    const exportedPaths = exportDirectoryIndexForWorkspaceIfGameExists(sqliteService, input.workspaceId);

    return {
      deletedPath: safeTargetPath,
      exportedPaths
    };
  });
}

function resolveKnownItemPath(
  sqliteService: SqliteService,
  input: OpenKnownWorkspaceItemInput | ReadKnownWorkspaceItemInput | DeleteKnownWorkspaceItemInput
): string {
  const workspace = sqliteService.getWorkspace(input.workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${input.workspaceId}`);
  }

  const targetPath = resolveKnownWorkspaceItemFilePath({
    workspace,
    game: sqliteService.getGameNode(input.workspaceId),
    modules: sqliteService.getModuleNodes(input.workspaceId),
    contents: sqliteService.getContentNodes(input.workspaceId),
    images: sqliteService.getImageAssets(input.workspaceId),
    item: input.item
  });
  const safeTargetPath = requirePathInsideWorkspace(workspace, targetPath);

  if (!existsSync(safeTargetPath)) {
    throw new Error(`Known workspace file does not exist: ${safeTargetPath}`);
  }

  return safeTargetPath;
}

function requirePathInsideWorkspace(workspace: WorkspaceConfig, targetPath: string): string {
  const workspaceRoot = resolve(workspace.contextPath);
  const resolvedTargetPath = resolve(targetPath);
  const relativePath = relative(workspaceRoot, resolvedTargetPath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Refusing to access a path outside the current workspace.');
  }

  return resolvedTargetPath;
}
