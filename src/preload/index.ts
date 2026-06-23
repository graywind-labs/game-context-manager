import electron from 'electron';
import type {
  AiFieldEditInput,
  AiFieldEditResult,
  AiGameSummaryResult,
  AiModuleSummaryResult,
  AppReadmeResult,
  AppSettingsState,
  ApiConfigState,
  ApiConnectionTestResult,
  ContentNodeState,
  CreateContentNodeInput,
  CreateGameNodeInput,
  CreateLocalUserInput,
  CreateModuleNodeInput,
  DeleteContentNodeInput,
  DeleteGameNodeInput,
  DeleteImageAssetInput,
  DeleteKnownWorkspaceItemInput,
  DeleteKnownWorkspaceItemResult,
  DeleteModuleNodeInput,
  ExportResult,
  ExportWorkspaceInput,
  GameNodeState,
  GenerateAiGameSummaryInput,
  GenerateAiModuleSummaryInput,
  ImageAssetState,
  ModuleNodeState,
  OpenKnownWorkspaceItemInput,
  ReadKnownWorkspaceItemInput,
  ReadKnownWorkspaceItemResult,
  SelectCurrentUserInput,
  SaveAppSettingsInput,
  SaveApiConfigInput,
  UploadImageAssetInput,
  UpdateGameNodeInput,
  UpdateContentNodeInput,
  UpdateModuleNodeInput,
  UserState,
  WorkspaceCreationResult,
  WorkspaceImportResult,
  WorkspaceRefreshInput,
  WorkspaceRefreshResult,
  WorkspaceRestoreResult,
  WorkspaceId
} from '../shared/index.js';

const { contextBridge, ipcRenderer } = electron;
contextBridge.exposeInMainWorld('gameContextManager', {
  platform: process.platform,
  getApiConfigState: (): Promise<ApiConfigState> =>
    ipcRenderer.invoke('api:get-state') as Promise<ApiConfigState>,
  getAppSettingsState: (): Promise<AppSettingsState> =>
    ipcRenderer.invoke('settings:get-state') as Promise<AppSettingsState>,
  saveAppSettings: (input: SaveAppSettingsInput): Promise<AppSettingsState> =>
    ipcRenderer.invoke('settings:save', input) as Promise<AppSettingsState>,
  readAppReadme: (): Promise<AppReadmeResult> =>
    ipcRenderer.invoke('settings:read-readme') as Promise<AppReadmeResult>,
  logoutCurrentUser: (): Promise<UserState> =>
    ipcRenderer.invoke('settings:logout') as Promise<UserState>,
  saveApiConfig: (input: SaveApiConfigInput): Promise<ApiConfigState> =>
    ipcRenderer.invoke('api:save-config', input) as Promise<ApiConfigState>,
  testApiConnection: (input?: SaveApiConfigInput): Promise<ApiConnectionTestResult> =>
    ipcRenderer.invoke('api:test-connection', input) as Promise<ApiConnectionTestResult>,
  generateAiFieldEdit: (input: AiFieldEditInput): Promise<AiFieldEditResult> =>
    ipcRenderer.invoke('api:generate-field-edit', input) as Promise<AiFieldEditResult>,
  generateAiModuleSummary: (input: GenerateAiModuleSummaryInput): Promise<AiModuleSummaryResult> =>
    ipcRenderer.invoke('api:generate-module-summary', input) as Promise<AiModuleSummaryResult>,
  generateAiGameSummary: (input: GenerateAiGameSummaryInput): Promise<AiGameSummaryResult> =>
    ipcRenderer.invoke('api:generate-game-summary', input) as Promise<AiGameSummaryResult>,
  getUserState: (workspaceId?: WorkspaceId): Promise<UserState> =>
    ipcRenderer.invoke('user:get-state', workspaceId) as Promise<UserState>,
  createLocalUser: (input: CreateLocalUserInput, workspaceId?: WorkspaceId): Promise<UserState> =>
    ipcRenderer.invoke('user:create', input, workspaceId) as Promise<UserState>,
  selectCurrentUser: (input: SelectCurrentUserInput): Promise<UserState> =>
    ipcRenderer.invoke('user:select-current', input) as Promise<UserState>,
  createWorkspace: (): Promise<WorkspaceCreationResult> =>
    ipcRenderer.invoke('workspace:create') as Promise<WorkspaceCreationResult>,
  importWorkspace: (): Promise<WorkspaceImportResult> =>
    ipcRenderer.invoke('workspace:import') as Promise<WorkspaceImportResult>,
  refreshWorkspace: (input: WorkspaceRefreshInput): Promise<WorkspaceRefreshResult> =>
    ipcRenderer.invoke('workspace:refresh', input) as Promise<WorkspaceRefreshResult>,
  restoreRecentWorkspace: (): Promise<WorkspaceRestoreResult> =>
    ipcRenderer.invoke('workspace:restore-recent') as Promise<WorkspaceRestoreResult>,
  openKnownWorkspaceItem: (input: OpenKnownWorkspaceItemInput): Promise<void> =>
    ipcRenderer.invoke('workspace:open-known-item', input) as Promise<void>,
  readKnownWorkspaceItem: (input: ReadKnownWorkspaceItemInput): Promise<ReadKnownWorkspaceItemResult> =>
    ipcRenderer.invoke('workspace:read-known-item', input) as Promise<ReadKnownWorkspaceItemResult>,
  deleteKnownWorkspaceItem: (input: DeleteKnownWorkspaceItemInput): Promise<DeleteKnownWorkspaceItemResult> =>
    ipcRenderer.invoke('workspace:delete-known-item', input) as Promise<DeleteKnownWorkspaceItemResult>,
  exportAgentFiles: (input: ExportWorkspaceInput): Promise<ExportResult> =>
    ipcRenderer.invoke('export:agent-files', input) as Promise<ExportResult>,
  exportDirectoryIndex: (input: ExportWorkspaceInput): Promise<ExportResult> =>
    ipcRenderer.invoke('export:directory-index', input) as Promise<ExportResult>,
  getGameState: (workspaceId: WorkspaceId): Promise<GameNodeState> =>
    ipcRenderer.invoke('game:get-state', workspaceId) as Promise<GameNodeState>,
  createGameNode: (input: CreateGameNodeInput): Promise<GameNodeState> =>
    ipcRenderer.invoke('game:create', input) as Promise<GameNodeState>,
  updateGameNode: (input: UpdateGameNodeInput): Promise<GameNodeState> =>
    ipcRenderer.invoke('game:update', input) as Promise<GameNodeState>,
  deleteGameNode: (input: DeleteGameNodeInput): Promise<GameNodeState> =>
    ipcRenderer.invoke('game:delete', input) as Promise<GameNodeState>,
  getImageState: (workspaceId: WorkspaceId): Promise<ImageAssetState> =>
    ipcRenderer.invoke('image:get-state', workspaceId) as Promise<ImageAssetState>,
  uploadImageAsset: (input: UploadImageAssetInput): Promise<ImageAssetState> =>
    ipcRenderer.invoke('image:upload', input) as Promise<ImageAssetState>,
  getModuleState: (workspaceId: WorkspaceId, selectedModuleId?: string): Promise<ModuleNodeState> =>
    ipcRenderer.invoke('module:get-state', workspaceId, selectedModuleId) as Promise<ModuleNodeState>,
  createModuleNode: (input: CreateModuleNodeInput): Promise<ModuleNodeState> =>
    ipcRenderer.invoke('module:create', input) as Promise<ModuleNodeState>,
  updateModuleNode: (input: UpdateModuleNodeInput): Promise<ModuleNodeState> =>
    ipcRenderer.invoke('module:update', input) as Promise<ModuleNodeState>,
  deleteModuleNode: (input: DeleteModuleNodeInput): Promise<ModuleNodeState> =>
    ipcRenderer.invoke('module:delete', input) as Promise<ModuleNodeState>,
  getContentState: (workspaceId: WorkspaceId, selectedContentId?: string, moduleId?: string): Promise<ContentNodeState> =>
    ipcRenderer.invoke('content:get-state', workspaceId, selectedContentId, moduleId) as Promise<ContentNodeState>,
  createContentNode: (input: CreateContentNodeInput): Promise<ContentNodeState> =>
    ipcRenderer.invoke('content:create', input) as Promise<ContentNodeState>,
  updateContentNode: (input: UpdateContentNodeInput): Promise<ContentNodeState> =>
    ipcRenderer.invoke('content:update', input) as Promise<ContentNodeState>,
  deleteContentNode: (input: DeleteContentNodeInput): Promise<ContentNodeState> =>
    ipcRenderer.invoke('content:delete', input) as Promise<ContentNodeState>,
  deleteImageAsset: (input: DeleteImageAssetInput): Promise<ImageAssetState> =>
    ipcRenderer.invoke('image:delete', input) as Promise<ImageAssetState>
});
