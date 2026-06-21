import electron from 'electron';
import type { CreateLocalUserInput, SelectCurrentUserInput, UserState, WorkspaceId } from '../../shared/index.js';
import type { SqliteService } from '../services/sqliteService.js';

const { ipcMain } = electron;

export const USER_GET_STATE_CHANNEL = 'user:get-state';
export const USER_CREATE_CHANNEL = 'user:create';
export const USER_SELECT_CURRENT_CHANNEL = 'user:select-current';

export function registerUserIpc(sqliteService: SqliteService): void {
  ipcMain.handle(USER_GET_STATE_CHANNEL, (_event, workspaceId?: WorkspaceId): UserState =>
    sqliteService.getUserState(workspaceId)
  );

  ipcMain.handle(
    USER_CREATE_CHANNEL,
    (_event, input: CreateLocalUserInput, workspaceId?: WorkspaceId): UserState => {
      sqliteService.createLocalUser(input, workspaceId);
      return sqliteService.getUserState(workspaceId);
    }
  );

  ipcMain.handle(
    USER_SELECT_CURRENT_CHANNEL,
    (_event, input: SelectCurrentUserInput): UserState => {
      sqliteService.selectCurrentUser(input.userId, input.workspaceId);
      return sqliteService.getUserState(input.workspaceId);
    }
  );
}
