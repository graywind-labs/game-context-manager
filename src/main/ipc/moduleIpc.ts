import electron from 'electron';
import {
  deleteModuleNodeFiles,
  exportModuleNodeFiles,
  readModuleMarkdownPreview
} from '../services/fileExportService.js';
import { exportDirectoryIndexForWorkspace } from '../services/exportWorkflowService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type {
  CreateModuleNodeInput,
  DeleteModuleNodeInput,
  GameNode,
  ModuleNode,
  ModuleNodeState,
  UpdateModuleNodeInput,
  WorkspaceConfig,
  WorkspaceId
} from '../../shared/index.js';

const { ipcMain } = electron;

export const MODULE_GET_STATE_CHANNEL = 'module:get-state';
export const MODULE_CREATE_CHANNEL = 'module:create';
export const MODULE_UPDATE_CHANNEL = 'module:update';
export const MODULE_DELETE_CHANNEL = 'module:delete';

export function registerModuleIpc(sqliteService: SqliteService): void {
  ipcMain.handle(MODULE_GET_STATE_CHANNEL, (_event, workspaceId: WorkspaceId, selectedModuleId?: string): ModuleNodeState =>
    getModuleState(sqliteService, workspaceId, selectedModuleId)
  );

  ipcMain.handle(MODULE_CREATE_CHANNEL, (_event, input: CreateModuleNodeInput): ModuleNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = requireGame(sqliteService, input.workspaceId);
    const module = sqliteService.createModuleNode(input, currentUserId);

    exportAllModuleFiles(sqliteService, workspace, game, module);
    const exportedPaths = exportDirectoryIndexForWorkspace(sqliteService, input.workspaceId);

    return {
      ...getModuleState(sqliteService, input.workspaceId, module.id),
      exportedPaths
    };
  });

  ipcMain.handle(MODULE_UPDATE_CHANNEL, (_event, input: UpdateModuleNodeInput): ModuleNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = requireGame(sqliteService, input.workspaceId);
    const module = sqliteService.updateModuleNode(input, currentUserId);

    exportAllModuleFiles(sqliteService, workspace, game, module);
    const exportedPaths = exportDirectoryIndexForWorkspace(sqliteService, input.workspaceId);

    return {
      ...getModuleState(sqliteService, input.workspaceId, module.id),
      exportedPaths
    };
  });

  ipcMain.handle(MODULE_DELETE_CHANNEL, (_event, input: DeleteModuleNodeInput): ModuleNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = requireGame(sqliteService, input.workspaceId);
    const module = sqliteService.getModuleNode(input.workspaceId, input.id);

    if (!module) {
      throw new Error(`Module node not found: ${input.id}`);
    }

    requireDeleteOwner(currentUserId, module.creatorId, 'Only the module node creator can delete this module node.');
    const childContentIds = sqliteService.getContentNodes(input.workspaceId, input.id).map((content) => content.id);

    sqliteService.deleteModuleNode(input);
    deleteModuleNodeFiles({
      workspace,
      game,
      moduleId: input.id,
      contentIds: childContentIds,
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      users: sqliteService.getUserState(input.workspaceId).users,
      images: sqliteService.getImageAssets(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
    });
    const exportedPaths = exportDirectoryIndexForWorkspace(sqliteService, input.workspaceId);

    return {
      ...getModuleState(sqliteService, input.workspaceId),
      exportedPaths
    };
  });
}

function getModuleState(
  sqliteService: SqliteService,
  workspaceId: WorkspaceId,
  selectedModuleId?: string
): ModuleNodeState {
  const workspace = requireWorkspace(sqliteService, workspaceId);
  const game = sqliteService.getGameNode(workspaceId);
  const modules = sqliteService.getModuleNodes(workspaceId);
  const selectedModule = selectedModuleId ? modules.find((module) => module.id === selectedModuleId) : modules[0];

  if (!game || !selectedModule) {
    return { modules };
  }

  return {
    modules,
    selectedModule,
    markdownPreview: readModuleMarkdownPreview(
      workspace,
      game,
      selectedModule,
      sqliteService.getUserState(workspaceId).users,
      sqliteService.getImageAssets(workspaceId)
    )
  };
}

function exportAllModuleFiles(
  sqliteService: SqliteService,
  workspace: WorkspaceConfig,
  game: GameNode,
  module: ModuleNode
): void {
  exportModuleNodeFiles({
    workspace,
    game,
    module,
    modules: sqliteService.getModuleNodes(workspace.id),
    contents: sqliteService.getContentNodes(workspace.id),
    users: sqliteService.getUserState(workspace.id).users,
    images: sqliteService.getImageAssets(workspace.id),
    imageLinks: sqliteService.getNodeImageLinks(workspace.id)
  });
}

function requireWorkspace(sqliteService: SqliteService, workspaceId: WorkspaceId): WorkspaceConfig {
  const workspace = sqliteService.getWorkspace(workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  return workspace;
}

function requireGame(sqliteService: SqliteService, workspaceId: WorkspaceId): GameNode {
  const game = sqliteService.getGameNode(workspaceId);

  if (!game) {
    throw new Error('Create the game root node before editing module nodes.');
  }

  return game;
}

function requireCurrentUserId(workspace: WorkspaceConfig): string {
  if (!workspace.currentUserId) {
    throw new Error('Select a current user before editing module nodes.');
  }

  return workspace.currentUserId;
}

function requireDeleteOwner(currentUserId: string, ownerId: string, message: string): void {
  if (currentUserId !== ownerId) {
    throw new Error(message);
  }
}
