export interface CreatedWorkspaceFileSet {
  agentsPath: string;
  claudePath: string;
  manifestPath: string;
  markerPath: string;
}

export interface WorkspaceCreationSummary {
  id: string;
  rootPath: string;
  contextPath: string;
  markerPath: string;
  activeGameFolderName?: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  files: CreatedWorkspaceFileSet;
  createdPaths: string[];
  existingPaths: string[];
}

export interface WorkspaceCreationResult {
  canceled: boolean;
  workspace?: WorkspaceCreationSummary;
}

export interface WorkspaceImportSummary extends WorkspaceCreationSummary {
  imported: {
    gameCount: number;
    moduleCount: number;
    contentCount: number;
    imageCount: number;
  };
  warnings: string[];
}

export interface WorkspaceImportResult {
  canceled: boolean;
  workspace?: WorkspaceImportSummary;
}

export interface WorkspaceRefreshInput {
  workspaceId: string;
}

export interface WorkspaceRefreshResult {
  workspace: WorkspaceImportSummary;
}

export interface WorkspaceRestoreResult {
  workspace?: WorkspaceImportSummary;
}

export type KnownWorkspaceIndexFileName = 'AGENTS.md' | 'CLAUDE.md' | 'manifest.yml' | 'INDEX.md' | 'image_catalog.yml';

export type KnownWorkspaceItem =
  | {
      kind: 'game';
    }
  | {
      kind: 'module';
      id: string;
    }
  | {
      kind: 'content';
      id: string;
    }
  | {
      kind: 'image';
      id: string;
    }
  | {
      kind: 'indexFile';
      fileName: KnownWorkspaceIndexFileName;
    };

export interface OpenKnownWorkspaceItemInput {
  workspaceId: string;
  item: KnownWorkspaceItem;
}

export interface ReadKnownWorkspaceItemInput {
  workspaceId: string;
  item: KnownWorkspaceItem;
}

export interface ReadKnownWorkspaceItemResult {
  content: string;
}

export interface DeleteKnownWorkspaceItemInput {
  workspaceId: string;
  item: KnownWorkspaceItem;
}

export interface DeleteKnownWorkspaceItemResult {
  deletedPath: string;
}
