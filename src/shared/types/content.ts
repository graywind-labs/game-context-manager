import type { ContentNode, ImageId, ModuleId, WorkspaceId } from './domain.js';

export interface ContentEditableFieldsInput {
  moduleId: ModuleId;
  title: string;
  imageIds: ImageId[];
  accountDay?: string;
  cumulativePaymentAmount?: string;
  maxMainlineProgress?: string;
  characterLevel?: string;
  processDescription?: string;
  subjectiveFun?: string;
  subjectiveKnownProblems?: string;
  subjectiveOptimizationDirections?: string;
}

export interface CreateContentNodeInput extends ContentEditableFieldsInput {
  workspaceId: WorkspaceId;
}

export interface UpdateContentNodeInput extends ContentEditableFieldsInput {
  workspaceId: WorkspaceId;
  id: string;
}

export interface DeleteContentNodeInput {
  workspaceId: WorkspaceId;
  id: string;
}

export interface ContentNodeState {
  contents: ContentNode[];
  selectedContent?: ContentNode;
  markdownPreview?: string;
  exportedPaths?: string[];
}
