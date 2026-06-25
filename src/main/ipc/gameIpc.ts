import electron from 'electron';
import { deleteGameNodeFiles, exportGameNodeFiles, readGameMarkdownPreview } from '../services/fileExportService.js';
import { exportAgentFilesForWorkspace, exportDirectoryIndexForWorkspace } from '../services/exportWorkflowService.js';
import { writeWorkspaceMarker } from '../services/workspaceService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type {
  CreateGameNodeInput,
  DeleteGameNodeInput,
  GameNodeState,
  UpdateGameNodeInput,
  WorkspaceConfig,
  WorkspaceId
} from '../../shared/index.js';

const { ipcMain } = electron;

export const GAME_GET_STATE_CHANNEL = 'game:get-state';
export const GAME_CREATE_CHANNEL = 'game:create';
export const GAME_UPDATE_CHANNEL = 'game:update';
export const GAME_DELETE_CHANNEL = 'game:delete';

export function registerGameIpc(sqliteService: SqliteService): void {
  ipcMain.handle(GAME_GET_STATE_CHANNEL, (_event, workspaceId: WorkspaceId): GameNodeState =>
    getGameState(sqliteService, workspaceId)
  );

  ipcMain.handle(GAME_CREATE_CHANNEL, (_event, input: CreateGameNodeInput): GameNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = sqliteService.createGameNode(input, currentUserId);
    const refreshedWorkspace = requireWorkspace(sqliteService, input.workspaceId);
    const users = sqliteService.getUserState(input.workspaceId).users;

    writeWorkspaceMarker(refreshedWorkspace, game);
    exportGameNodeFiles({
      workspace: refreshedWorkspace,
      game,
      users,
      images: sqliteService.getImageAssets(input.workspaceId),
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
    });
    const exportedPaths = [
      ...exportAgentFilesForWorkspace(sqliteService, input.workspaceId),
      ...exportDirectoryIndexForWorkspace(sqliteService, input.workspaceId)
    ];

    return {
      ...getGameState(sqliteService, input.workspaceId),
      exportedPaths
    };
  });

  ipcMain.handle(GAME_UPDATE_CHANNEL, (_event, input: UpdateGameNodeInput): GameNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = sqliteService.updateGameNode(input.workspaceId, input, currentUserId);
    const refreshedWorkspace = requireWorkspace(sqliteService, input.workspaceId);
    const users = sqliteService.getUserState(input.workspaceId).users;

    writeWorkspaceMarker(refreshedWorkspace, game);
    exportGameNodeFiles({
      workspace: refreshedWorkspace,
      game,
      users,
      images: sqliteService.getImageAssets(input.workspaceId),
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
    });
    const exportedPaths = exportDirectoryIndexForWorkspace(sqliteService, input.workspaceId);

    return {
      ...getGameState(sqliteService, input.workspaceId),
      exportedPaths
    };
  });

  ipcMain.handle(GAME_DELETE_CHANNEL, (_event, input: DeleteGameNodeInput): GameNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = requireGame(sqliteService, input.workspaceId);

    requireDeleteOwner(currentUserId, game.creatorId, 'Only the game node creator can delete this game node.');
    sqliteService.deleteGameNode(input);
    deleteGameNodeFiles({
      workspace,
      game
    });

    return getGameState(sqliteService, input.workspaceId);
  });
}

function getGameState(sqliteService: SqliteService, workspaceId: WorkspaceId): GameNodeState {
  const workspace = requireWorkspace(sqliteService, workspaceId);
  const game = sqliteService.getGameNode(workspaceId);

  if (!game) {
    return {};
  }

  const users = sqliteService.getUserState(workspaceId).users;

  return {
    game,
    markdownPreview: readGameMarkdownPreview(workspace, game, users)
  };
}

function requireWorkspace(sqliteService: SqliteService, workspaceId: WorkspaceId): WorkspaceConfig {
  const workspace = sqliteService.getWorkspace(workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  return workspace;
}

function requireCurrentUserId(workspace: WorkspaceConfig): string {
  if (!workspace.currentUserId) {
    throw new Error('Select a current user before editing the game node.');
  }

  return workspace.currentUserId;
}

function requireGame(sqliteService: SqliteService, workspaceId: WorkspaceId) {
  const game = sqliteService.getGameNode(workspaceId);

  if (!game) {
    throw new Error(`Game node not found for workspace: ${workspaceId}`);
  }

  return game;
}

function requireDeleteOwner(currentUserId: string, ownerId: string, message: string): void {
  if (currentUserId !== ownerId) {
    throw new Error(message);
  }
}
