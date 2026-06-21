import type { AiEditMode, ApiConfig, ApiConfigId, ContentNode, GameNode, ModuleNode, NodeType, WorkspaceId } from './domain.js';

export const DEFAULT_API_CONFIG_ID = 'default_api_config';

export interface SaveApiConfigInput {
  id?: ApiConfigId;
  baseUrl: string;
  apiKey?: string;
  modelName: string;
  enabled: boolean;
}

export interface ApiConnectionTestResult {
  ok: boolean;
  provider: 'mock' | 'openai-compatible';
  message: string;
  checkedAt: string;
  modelName?: string;
}

export interface ApiConfigState {
  config?: ApiConfig;
}

export interface AiFieldEditInput {
  nodeType: NodeType;
  nodeId: string;
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  mode: AiEditMode;
  userInstruction?: string;
  nodeContext?: string;
  locale?: 'zh' | 'en';
}

export interface AiFieldEditResult {
  nodeType: NodeType;
  nodeId: string;
  fieldName: string;
  fieldLabel: string;
  mode: AiEditMode;
  originalValue: string;
  candidateValue: string;
  prompt: string;
  provider: 'mock' | 'openai-compatible';
  modelName?: string;
  generatedAt: string;
}

export type AiModuleSummaryFieldName = keyof Pick<
  ModuleNode,
  | 'modulePositioning'
  | 'systemRules'
  | 'resourceFlow'
  | 'playerMainActions'
  | 'subjectiveFun'
  | 'subjectiveProblems'
  | 'subjectiveOptimizationDirections'
>;

export interface GenerateAiModuleSummaryInput {
  workspaceId: WorkspaceId;
  moduleId: string;
  locale?: 'zh' | 'en';
}

export interface AiModuleSummaryInput {
  module: ModuleNode;
  contents: ContentNode[];
  locale?: 'zh' | 'en';
}

export interface AiModuleSummaryFieldResult {
  fieldName: AiModuleSummaryFieldName;
  fieldLabel: string;
  originalValue: string;
  candidateValue: string;
}

export interface AiModuleSummaryResult {
  nodeType: NodeType.Module;
  moduleId: string;
  moduleName: string;
  contentCount: number;
  fields: AiModuleSummaryFieldResult[];
  prompt: string;
  provider: 'mock' | 'openai-compatible';
  modelName?: string;
  generatedAt: string;
}

export type AiGameSummaryFieldName = keyof Pick<
  GameNode,
  'coreGameplay' | 'mainFun' | 'mainOptimizationDirections' | 'currentMainProblems'
>;

export interface GenerateAiGameSummaryInput {
  workspaceId: WorkspaceId;
  locale?: 'zh' | 'en';
}

export interface AiGameSummaryInput {
  game: GameNode;
  modules: ModuleNode[];
  locale?: 'zh' | 'en';
}

export interface AiGameSummaryFieldResult {
  fieldName: AiGameSummaryFieldName;
  fieldLabel: string;
  originalValue: string;
  candidateValue: string;
}

export interface AiGameSummaryResult {
  nodeType: NodeType.Game;
  gameId: string;
  gameName: string;
  moduleCount: number;
  fields: AiGameSummaryFieldResult[];
  prompt: string;
  provider: 'mock' | 'openai-compatible';
  modelName?: string;
  generatedAt: string;
}
