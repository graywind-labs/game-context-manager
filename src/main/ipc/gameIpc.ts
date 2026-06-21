import electron from 'electron';
import { exportGameNodeFiles, readGameMarkdownPreview } from '../services/fileExportService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type {
  CreateGameNodeInput,
  GameNodeState,
  UpdateGameNodeInput,
  WorkspaceConfig,
  WorkspaceId
} from '../../shared/index.js';

const { ipcMain } = electron;

export const GAME_GET_STATE_CHANNEL = 'game:get-state';
export const GAME_CREATE_CHANNEL = 'game:create';
export const GAME_UPDATE_CHANNEL = 'game:update';

export function registerGameIpc(sqliteService: SqliteService): void {
  ipcMain.handle(GAME_GET_STATE_CHANNEL, (_event, workspaceId: WorkspaceId): GameNodeState =>
    getGameState(sqliteService, workspaceId)
  );

  ipcMain.handle(GAME_CREATE_CHANNEL, (_event, input: CreateGameNodeInput): GameNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = sqliteService.createGameNode(input, currentUserId);
    const users = sqliteService.getUserState(input.workspaceId).users;

    exportGameNodeFiles({
      workspace: {
        ...workspace,
        activeGameId: game.id,
        updatedAt: game.updatedAt
      },
      game,
      users,
      images: sqliteService.getImageAssets(input.workspaceId),
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
    });

    return getGameState(sqliteService, input.workspaceId);
  });

  ipcMain.handle(GAME_UPDATE_CHANNEL, (_event, input: UpdateGameNodeInput): GameNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = sqliteService.updateGameNode(input.workspaceId, input, currentUserId);
    const users = sqliteService.getUserState(input.workspaceId).users;

    exportGameNodeFiles({
      workspace: {
        ...workspace,
        activeGameId: game.id,
        updatedAt: game.updatedAt
      },
      game,
      users,
      images: sqliteService.getImageAssets(input.workspaceId),
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
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
