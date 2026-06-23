import type { ImageId, ModuleNode, WorkspaceId } from './domain.js';

export interface ModuleEditableFieldsInput {
  moduleName: string;
  modulePositioning?: string;
  systemRules?: string;
  resourceFlow?: string;
  imageIds: ImageId[];
  playerMainActions?: string;
  subjectiveFun?: string;
  subjectiveProblems?: string;
  subjectiveOptimizationDirections?: string;
}

export interface CreateModuleNodeInput extends ModuleEditableFieldsInput {
  workspaceId: WorkspaceId;
}

export interface UpdateModuleNodeInput extends ModuleEditableFieldsInput {
  workspaceId: WorkspaceId;
  id: string;
}

export interface DeleteModuleNodeInput {
  workspaceId: WorkspaceId;
  id: string;
}

export interface ModuleNodeState {
  modules: ModuleNode[];
  selectedModule?: ModuleNode;
  markdownPreview?: string;
}
