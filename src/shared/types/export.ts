import type { WorkspaceId } from './domain.js';

export interface ExportWorkspaceInput {
  workspaceId: WorkspaceId;
}

export interface ExportResult {
  exportedPaths: string[];
  directoryIndexNeedsExport: boolean;
}
