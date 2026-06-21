import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import electron from 'electron';
import { deleteImageAssetFiles, exportImageCatalogFiles } from '../services/fileExportService.js';
import type { SqliteService } from '../services/sqliteService.js';
import {
  NodeType,
  type ContentNode,
  type DeleteImageAssetInput,
  type GameNode,
  type ImageAsset,
  type ImageNodeReference,
  type ImageAssetState,
  type ImageAssetView,
  type ModuleNode,
  type NodeImageLink,
  type UploadImageAssetInput,
  type WorkspaceConfig,
  type WorkspaceId
} from '../../shared/index.js';

const { dialog, ipcMain } = electron;

export const IMAGE_GET_STATE_CHANNEL = 'image:get-state';
export const IMAGE_UPLOAD_CHANNEL = 'image:upload';
export const IMAGE_DELETE_CHANNEL = 'image:delete';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export function registerImageIpc(sqliteService: SqliteService): void {
  ipcMain.handle(IMAGE_GET_STATE_CHANNEL, (_event, workspaceId: WorkspaceId): ImageAssetState =>
    getImageState(sqliteService, workspaceId)
  );

  ipcMain.handle(IMAGE_UPLOAD_CHANNEL, async (_event, input: UploadImageAssetInput): Promise<ImageAssetState> => {
    const displayName = input.displayName.trim();

    if (!displayName) {
      throw new Error('Image name is required before upload.');
    }

    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const game = requireGame(sqliteService, input.workspaceId);
    const uploaderId = requireCurrentUserId(workspace);
    const result = await dialog.showOpenDialog({
      title: 'Select image',
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif']
        }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return {
        ...getImageState(sqliteService, input.workspaceId),
        canceled: true
      };
    }

    const sourcePath = result.filePaths[0];
    const extension = normalizeImageExtension(extname(sourcePath));
    const now = new Date().toISOString();
    const imageId = createImageId(displayName);
    const safeDisplayName = createSafeFileNameSegment(displayName);
    const relativePath = `games/${game.id}/assets/images/${imageId}__${safeDisplayName}${extension}`;
    const destinationPath = join(workspace.contextPath, relativePath);
    const image: ImageAsset = {
      id: imageId,
      displayName,
      originalFileName: basename(sourcePath),
      relativePath,
      fileType: extension.slice(1),
      gameId: game.id,
      uploaderId,
      updatedAt: now,
      notes: optionalTrim(input.notes)
    };

    mkdirSync(join(workspace.contextPath, 'games', game.id, 'assets', 'images'), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
    sqliteService.createImageAsset(input.workspaceId, image);

    const images = sqliteService.getImageAssets(input.workspaceId);
    const users = sqliteService.getUserState(input.workspaceId).users;
    exportImageCatalogFiles({
      workspace,
      game,
      users,
      images,
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
    });

    return getImageState(sqliteService, input.workspaceId);
  });

  ipcMain.handle(IMAGE_DELETE_CHANNEL, (_event, input: DeleteImageAssetInput): ImageAssetState => {
    const workspace = requireWorkspace(sqliteService, input.workspaceId);
    const deletedImage = sqliteService.getImageAsset(input.workspaceId, input.id);

    if (!deletedImage) {
      throw new Error(`Image asset not found: ${input.id}`);
    }

    sqliteService.deleteImageAsset(input);
    const refreshedGame = requireGame(sqliteService, input.workspaceId);

    deleteImageAssetFiles({
      workspace,
      game: refreshedGame,
      deletedImage,
      users: sqliteService.getUserState(input.workspaceId).users,
      modules: sqliteService.getModuleNodes(input.workspaceId),
      contents: sqliteService.getContentNodes(input.workspaceId),
      images: sqliteService.getImageAssets(input.workspaceId),
      imageLinks: sqliteService.getNodeImageLinks(input.workspaceId)
    });

    return getImageState(sqliteService, input.workspaceId);
  });
}

function getImageState(sqliteService: SqliteService, workspaceId: WorkspaceId): ImageAssetState {
  const workspace = requireWorkspace(sqliteService, workspaceId);
  const game = sqliteService.getGameNode(workspaceId);
  const modules = sqliteService.getModuleNodes(workspaceId);
  const contents = sqliteService.getContentNodes(workspaceId);
  const imageLinks = sqliteService.getNodeImageLinks(workspaceId);
  const images = sqliteService
    .getImageAssets(workspaceId)
    .map((image) => toImageAssetView(workspace, image, getImageReferences(image.id, game, modules, contents, imageLinks)));

  return { images };
}

function toImageAssetView(workspace: WorkspaceConfig, image: ImageAsset, linkedNodes: ImageNodeReference[]): ImageAssetView {
  const absolutePath = join(workspace.contextPath, image.relativePath);
  const imageView = {
    ...image,
    linkedNodes
  };

  if (!existsSync(absolutePath)) {
    return imageView;
  }

  return {
    ...imageView,
    previewDataUrl: `data:${getImageMimeType(image.fileType)};base64,${readFileSync(absolutePath).toString('base64')}`
  };
}

function getImageReferences(
  imageId: string,
  game: GameNode | undefined,
  modules: ModuleNode[],
  contents: ContentNode[],
  imageLinks: NodeImageLink[]
): ImageNodeReference[] {
  const references: ImageNodeReference[] = [];

  if (game?.coverImageId === imageId) {
    references.push({
      nodeType: NodeType.Game,
      nodeId: game.id,
      displayName: game.gameName
    });
  }

  for (const link of imageLinks.filter((item) => item.imageId === imageId)) {
    if (link.nodeType === NodeType.Module) {
      const module = modules.find((item) => item.id === link.nodeId);
      references.push({
        nodeType: link.nodeType,
        nodeId: link.nodeId,
        displayName: module?.moduleName ?? link.nodeId
      });
    }

    if (link.nodeType === NodeType.Content) {
      const content = contents.find((item) => item.id === link.nodeId);
      references.push({
        nodeType: link.nodeType,
        nodeId: link.nodeId,
        displayName: content?.title ?? link.nodeId
      });
    }
  }

  return references;
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
    throw new Error('Create the game root node before uploading images.');
  }

  return game;
}

function requireCurrentUserId(workspace: WorkspaceConfig): string {
  if (!workspace.currentUserId) {
    throw new Error('Select a current user before uploading images.');
  }

  return workspace.currentUserId;
}

function normalizeImageExtension(extension: string): string {
  const normalized = extension.toLowerCase();

  if (!IMAGE_EXTENSIONS.has(normalized)) {
    throw new Error(`Unsupported image file type: ${extension || '(none)'}`);
  }

  return normalized === '.jpeg' ? '.jpg' : normalized;
}

function createImageId(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/^_+|_+$/g, '');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);

  return `img_${slug ? `${slug}_` : ''}${suffix}`;
}

function createSafeFileNameSegment(displayName: string): string {
  const safeName = displayName
    .trim()
    .replaceAll(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^\.+|\.+$/g, '')
    .replaceAll(/^-+|-+$/g, '');

  return safeName || 'image';
}

function getImageMimeType(fileType: string): string {
  if (fileType === 'jpg' || fileType === 'jpeg') {
    return 'image/jpeg';
  }

  return `image/${fileType}`;
}

function optionalTrim(value: string | undefined): string | undefined {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}
