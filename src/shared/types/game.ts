import type { GameNode, ProjectStage, WorkspaceId } from './domain.js';

export interface GameEditableFieldsInput {
  gameName: string;
  gameVersion: string;
  projectStage: ProjectStage;
  gameGenre?: string;
  coreGameplay?: string;
  mainFun?: string;
  targetUsers?: string;
  currentOperationGoal?: string;
  currentMainProblems?: string;
  mainOptimizationDirections?: string;
  coverImageId?: string;
}

export interface CreateGameNodeInput extends GameEditableFieldsInput {
  workspaceId: WorkspaceId;
}

export interface UpdateGameNodeInput extends GameEditableFieldsInput {
  workspaceId: WorkspaceId;
}

export interface DeleteGameNodeInput {
  workspaceId: WorkspaceId;
}

export interface GameNodeState {
  game?: GameNode;
  markdownPreview?: string;
  exportedPaths?: string[];
}
