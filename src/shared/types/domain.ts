export enum ProjectStage {
  Planning = 'planning',
  Testing = 'testing',
  Live = 'live',
  PreClosure = 'pre_closure'
}

export enum NodeType {
  Game = 'game',
  Module = 'module',
  Content = 'content'
}

export enum AiEditMode {
  Add = 'add',
  Modify = 'modify',
  Polish = 'polish',
  SummarizeChildren = 'summarize_children',
  SummarizeModules = 'summarize_modules'
}

export type ISODateTimeString = string;
export type GameId = string;
export type ModuleId = string;
export type ContentId = string;
export type ImageId = string;
export type UserId = string;
export type WorkspaceId = string;
export type ApiConfigId = string;

export interface AuditableFields {
  creatorId: UserId;
  lastEditorId: UserId;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface GameNode extends AuditableFields {
  nodeType: NodeType.Game;
  id: GameId;
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
  coverImageId?: ImageId;
}

export interface ModuleNode extends AuditableFields {
  nodeType: NodeType.Module;
  id: ModuleId;
  gameId: GameId;
  gameVersion: string;
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

export interface ContentNode extends AuditableFields {
  nodeType: NodeType.Content;
  id: ContentId;
  gameId: GameId;
  gameVersion: string;
  moduleId: ModuleId;
  title: string;
  imageIds: ImageId[];
  accountDay?: number | string;
  cumulativePaymentAmount?: number | string;
  maxMainlineProgress?: string;
  characterLevel?: string;
  processDescription?: string;
  subjectiveFun?: string;
  subjectiveKnownProblems?: string;
  subjectiveOptimizationDirections?: string;
}

export interface ImageAsset {
  id: ImageId;
  displayName: string;
  originalFileName: string;
  relativePath: string;
  fileType: string;
  gameId: GameId;
  uploaderId: UserId;
  updatedAt: ISODateTimeString;
  notes?: string;
}

export interface NodeImageLink {
  nodeType: NodeType;
  nodeId: GameId | ModuleId | ContentId;
  imageId: ImageId;
}

export interface LocalUser {
  id: UserId;
  displayName: string;
  createdAt: ISODateTimeString;
  lastLoginAt?: ISODateTimeString;
}

export interface WorkspaceConfig {
  id: WorkspaceId;
  rootPath: string;
  contextPath: string;
  markerPath?: string;
  activeGameId?: GameId;
  activeGameFolderName?: string;
  currentUserId?: UserId;
  directoryIndexNeedsExport?: boolean;
  schemaVersion: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ApiConfig {
  id: ApiConfigId;
  baseUrl: string;
  apiKey?: string;
  modelName: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type EditableFieldMap = {
  [NodeType.Game]: keyof Pick<
    GameNode,
    | 'gameName'
    | 'gameVersion'
    | 'projectStage'
    | 'gameGenre'
    | 'coreGameplay'
    | 'mainFun'
    | 'targetUsers'
    | 'currentOperationGoal'
    | 'currentMainProblems'
    | 'mainOptimizationDirections'
    | 'coverImageId'
  >;
  [NodeType.Module]: keyof Pick<
    ModuleNode,
    | 'moduleName'
    | 'modulePositioning'
    | 'systemRules'
    | 'resourceFlow'
    | 'imageIds'
    | 'playerMainActions'
    | 'subjectiveFun'
    | 'subjectiveProblems'
    | 'subjectiveOptimizationDirections'
  >;
  [NodeType.Content]: keyof Pick<
    ContentNode,
    | 'title'
    | 'imageIds'
    | 'accountDay'
    | 'cumulativePaymentAmount'
    | 'maxMainlineProgress'
    | 'characterLevel'
    | 'processDescription'
    | 'subjectiveFun'
    | 'subjectiveKnownProblems'
    | 'subjectiveOptimizationDirections'
  >;
};

export type LockedFieldMap = {
  [NodeType.Game]: keyof Pick<
    GameNode,
    'nodeType' | 'id' | 'creatorId' | 'lastEditorId' | 'createdAt' | 'updatedAt'
  >;
  [NodeType.Module]: keyof Pick<
    ModuleNode,
    'nodeType' | 'id' | 'gameId' | 'gameVersion' | 'creatorId' | 'lastEditorId' | 'createdAt' | 'updatedAt'
  >;
  [NodeType.Content]: keyof Pick<
    ContentNode,
    | 'nodeType'
    | 'id'
    | 'gameId'
    | 'gameVersion'
    | 'moduleId'
    | 'creatorId'
    | 'lastEditorId'
    | 'createdAt'
    | 'updatedAt'
  >;
};
