import electron from 'electron';
import { join } from 'node:path';
import { registerApiIpc } from './ipc/apiIpc.js';
import { registerContentIpc } from './ipc/contentIpc.js';
import { registerExportIpc } from './ipc/exportIpc.js';
import { registerGameIpc } from './ipc/gameIpc.js';
import { registerImageIpc } from './ipc/imageIpc.js';
import { registerModuleIpc } from './ipc/moduleIpc.js';
import { registerSettingsIpc } from './ipc/settingsIpc.js';
import { registerUserIpc } from './ipc/userIpc.js';
import { registerWorkspaceIpc } from './ipc/workspaceIpc.js';
import { getDefaultDatabasePath, initializeSqliteService, type SqliteService } from './services/sqliteService.js';

const { app, BrowserWindow, Menu } = electron;
const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL);
let sqliteService: SqliteService | undefined;

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: '游戏上下文管理器',
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

void app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  const databasePath = getDefaultDatabasePath(app.getPath('userData'));
  sqliteService = initializeSqliteService({ databasePath });
  const verification = sqliteService.verifyRequiredTables();

  if (verification.missingTables.length > 0) {
    throw new Error(`SQLite initialization missed tables: ${verification.missingTables.join(', ')}`);
  }

  console.info(`[database] SQLite initialized at ${databasePath}`);
  registerApiIpc(sqliteService);
  registerExportIpc(sqliteService);
  registerGameIpc(sqliteService);
  registerContentIpc(sqliteService);
  registerImageIpc(sqliteService);
  registerModuleIpc(sqliteService);
  registerSettingsIpc(sqliteService);
  registerUserIpc(sqliteService);
  registerWorkspaceIpc(sqliteService);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  sqliteService?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
