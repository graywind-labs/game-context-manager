import electron from 'electron';
import {
  deleteContentNodeFiles,
  exportContentNodeFiles,
  readContentMarkdownPreview
} from '../services/fileExportService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type {
  ContentNode,
  ContentNodeState,
  CreateContentNodeInput,
  DeleteContentNodeInput,
  GameNode,
  UpdateContentNodeInput,
  WorkspaceConfig,
  WorkspaceId
} from '../../shared/index.js';

const { ipcMain } = electron;

export const CONTENT_GET_STATE_CHANNEL = 'content:get-state';
export const CONTENT_CREATE_CHANNEL = 'content:create';
export const CONTENT_UPDATE_CHANNEL = 'content:update';
export const CONTENT_DELETE_CHANNEL = 'content:delete';

export function registerContentIpc(sqliteService: SqliteService): void {
  ipcMain.handle(
    CONTENT_GET_STATE_CHANNEL,
    (_event, workspaceId: WorkspaceId, selectedContentId?: string, moduleId?: string): ContentNodeState =>
      getContentState(sqliteService, workspaceId, selectedContentId, moduleId)
  );

  ipcMain.handle(CONTENT_CREATE_CHANNEL, (_event, input: CreateContentNodeInput): ContentNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = requireGame(sqliteService, input.workspaceId);
    const content = sqliteService.createContentNode(input, currentUserId);

    exportAllContentFiles(sqliteService, workspace, game, content);

    return getContentState(sqliteService, input.workspaceId, content.id, content.moduleId);
  });

  ipcMain.handle(CONTENT_UPDATE_CHANNEL, (_event, input: UpdateContentNodeInput): ContentNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = requireGame(sqliteService, input.workspaceId);
    const content = sqliteService.updateContentNode(input, currentUserId);

    exportAllContentFiles(sqliteService, workspace, game, content);

    return getContentState(sqliteService, input.workspaceId, content.id, content.moduleId);
  });

  ipcMain.handle(CONTENT_DELETE_CHANNEL, (_event, input: DeleteContentNodeInput): ContentNodeState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const currentUserId = requireCurrentUserId(workspace);
    const game = requireGame(sqliteService, input.workspaceId);
    const content = sqliteService.getContentNode(input.workspaceId, input.id);

    if (!content) {
      throw new Error(`Content node not found: ${input.id}`);
    }

    requireDeleteOwner(currentUserId, content.creatorId, 'Only the content node creator can delete this content node.');
    sqliteService.deleteContentNode(input);
    deleteContentNodeFiles({
      workspace,
      game,
      contentId: input.id,
      moduleId: content.moduleId,
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      users: sqliteService.getUserState(input.workspaceId).users,
      images: sqliteService.getImageAssets(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
    });

    return getContentState(sqliteService, input.workspaceId, undefined, content.moduleId);
  });
}

function getContentState(
  sqliteService: SqliteService,
  workspaceId: WorkspaceId,
  selectedContentId?: string,
  moduleId?: string
): ContentNodeState {
  const workspace = requireWorkspace(sqliteService, workspaceId);
  const game = sqliteService.getGameNode(workspaceId);
  const contents = sqliteService.getContentNodes(workspaceId, moduleId);
  const selectedContent = selectedContentId
    ? contents.find((content) => content.id === selectedContentId)
    : contents[0];

  if (!game || !selectedContent) {
    return { contents };
  }

  return {
    contents,
    selectedContent,
    markdownPreview: readContentMarkdownPreview(
      workspace,
      game,
      selectedContent,
      sqliteService.getUserState(workspaceId).users,
      sqliteService.getImageAssets(workspaceId)
    )
  };
}

function exportAllContentFiles(
  sqliteService: SqliteService,
  workspace: WorkspaceConfig,
  game: GameNode,
  content: ContentNode
): void {
  exportContentNodeFiles({
    workspace,
    game,
    content,
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
    throw new Error('Create the game root node before editing content nodes.');
  }

  return game;
}

function requireCurrentUserId(workspace: WorkspaceConfig): string {
  if (!workspace.currentUserId) {
    throw new Error('Select a current user before editing content nodes.');
  }

  return workspace.currentUserId;
}

function requireDeleteOwner(currentUserId: string, ownerId: string, message: string): void {
  if (currentUserId !== ownerId) {
    throw new Error(message);
  }
}
