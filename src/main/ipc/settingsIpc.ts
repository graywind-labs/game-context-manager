import electron from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AppReadmeResult, AppSettingsState, SaveAppSettingsInput, UserState } from '../../shared/index.js';
import type { SqliteService } from '../services/sqliteService.js';

const { app, ipcMain } = electron;

export const SETTINGS_GET_STATE_CHANNEL = 'settings:get-state';
export const SETTINGS_SAVE_CHANNEL = 'settings:save';
export const SETTINGS_LOGOUT_CHANNEL = 'settings:logout';
export const SETTINGS_READ_README_CHANNEL = 'settings:read-readme';

export function registerSettingsIpc(sqliteService: SqliteService): void {
  ipcMain.handle(SETTINGS_GET_STATE_CHANNEL, (): AppSettingsState => ({
    settings: sqliteService.getAppSettings()
  }));

  ipcMain.handle(SETTINGS_SAVE_CHANNEL, (_event, input: SaveAppSettingsInput): AppSettingsState => ({
    settings: sqliteService.saveAppSettings(input)
  }));

  ipcMain.handle(SETTINGS_LOGOUT_CHANNEL, (): UserState => sqliteService.logoutCurrentUser());

  ipcMain.handle(SETTINGS_READ_README_CHANNEL, (): AppReadmeResult => readAppReadme());
}

function readAppReadme(): AppReadmeResult {
  const candidatePaths = [
    resolve(process.cwd(), 'README.md'),
    resolve(app.getAppPath(), 'README.md'),
    resolve(app.getAppPath(), '..', 'README.md'),
    resolve(app.getAppPath(), '..', '..', 'README.md')
  ];
  const readmePath = candidatePaths.find((candidate) => existsSync(candidate));

  if (!readmePath) {
    throw new Error('README.md was not found.');
  }

  return {
    content: readFileSync(readmePath, 'utf8')
  };
}
