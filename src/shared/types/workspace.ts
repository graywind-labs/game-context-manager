export interface CreatedWorkspaceFileSet {
  agentsPath: string;
  claudePath: string;
  usagePath: string;
  readmePath: string;
  manifestPath: string;
  gamesPath: string;
}

export interface WorkspaceCreationSummary {
  id: string;
  rootPath: string;
  contextPath: string;
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
