import type { ImageAsset, NodeType, WorkspaceId } from './domain.js';

export interface UploadImageAssetInput {
  workspaceId: WorkspaceId;
  displayName: string;
  notes?: string;
  source?: UploadImageAssetSource;
}

export type UploadImageAssetSource =
  | {
      kind: 'dataUrl';
      dataUrl: string;
      originalFileName: string;
    }
  | {
      kind: 'filePath';
      path: string;
    };

export interface DeleteImageAssetInput {
  workspaceId: WorkspaceId;
  id: string;
}

export interface ImageNodeReference {
  nodeType: NodeType;
  nodeId: string;
  displayName: string;
}

export interface ImageAssetView extends ImageAsset {
  previewDataUrl?: string;
  linkedNodes?: ImageNodeReference[];
}

export interface ImageAssetState {
  images: ImageAssetView[];
  canceled?: boolean;
  exportedPaths?: string[];
}
