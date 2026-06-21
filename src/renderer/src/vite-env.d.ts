/// <reference types="vite/client" />

import type {
  AiFieldEditInput,
  AiFieldEditResult,
  AiGameSummaryResult,
  AiModuleSummaryResult,
  ApiConfigState,
  ApiConnectionTestResult,
  ContentNodeState,
  CreateContentNodeInput,
  CreateGameNodeInput,
  CreateLocalUserInput,
  CreateModuleNodeInput,
  DeleteContentNodeInput,
  DeleteImageAssetInput,
  DeleteModuleNodeInput,
  GameNodeState,
  GenerateAiGameSummaryInput,
  GenerateAiModuleSummaryInput,
  ImageAssetState,
  ModuleNodeState,
  SelectCurrentUserInput,
  SaveApiConfigInput,
  UploadImageAssetInput,
  UpdateGameNodeInput,
  UpdateContentNodeInput,
  UpdateModuleNodeInput,
  UserState,
  WorkspaceCreationResult,
  WorkspaceImportResult,
  WorkspaceId
} from '../../shared/index.js';

declare global {
  interface Window {
    gameContextManager: {
      platform: string;
      getApiConfigState: () => Promise<ApiConfigState>;
      saveApiConfig: (input: SaveApiConfigInput) => Promise<ApiConfigState>;
      testApiConnection: (input?: SaveApiConfigInput) => Promise<ApiConnectionTestResult>;
      generateAiFieldEdit: (input: AiFieldEditInput) => Promise<AiFieldEditResult>;
      generateAiModuleSummary: (input: GenerateAiModuleSummaryInput) => Promise<AiModuleSummaryResult>;
      generateAiGameSummary: (input: GenerateAiGameSummaryInput) => Promise<AiGameSummaryResult>;
      getUserState: (workspaceId?: WorkspaceId) => Promise<UserState>;
      createLocalUser: (input: CreateLocalUserInput, workspaceId?: WorkspaceId) => Promise<UserState>;
      selectCurrentUser: (input: SelectCurrentUserInput) => Promise<UserState>;
      createWorkspace: () => Promise<WorkspaceCreationResult>;
      importWorkspace: () => Promise<WorkspaceImportResult>;
      getGameState: (workspaceId: WorkspaceId) => Promise<GameNodeState>;
      createGameNode: (input: CreateGameNodeInput) => Promise<GameNodeState>;
      updateGameNode: (input: UpdateGameNodeInput) => Promise<GameNodeState>;
      getImageState: (workspaceId: WorkspaceId) => Promise<ImageAssetState>;
      uploadImageAsset: (input: UploadImageAssetInput) => Promise<ImageAssetState>;
      deleteImageAsset: (input: DeleteImageAssetInput) => Promise<ImageAssetState>;
      getModuleState: (workspaceId: WorkspaceId, selectedModuleId?: string) => Promise<ModuleNodeState>;
      createModuleNode: (input: CreateModuleNodeInput) => Promise<ModuleNodeState>;
      updateModuleNode: (input: UpdateModuleNodeInput) => Promise<ModuleNodeState>;
      deleteModuleNode: (input: DeleteModuleNodeInput) => Promise<ModuleNodeState>;
      getContentState: (workspaceId: WorkspaceId, selectedContentId?: string, moduleId?: string) => Promise<ContentNodeState>;
      createContentNode: (input: CreateContentNodeInput) => Promise<ContentNodeState>;
      updateContentNode: (input: UpdateContentNodeInput) => Promise<ContentNodeState>;
      deleteContentNode: (input: DeleteContentNodeInput) => Promise<ContentNodeState>;
    };
  }
}

export {};
