import {
  EDITABLE_FIELDS,
  LOCKED_FIELDS,
  NodeType,
  ProjectStage,
  type ApiConfig,
  type ContentNode,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
  type WorkspaceConfig
} from '../../src/shared';

const createdAt = '2026-06-18T12:00:00+08:00';

const localUser: LocalUser = {
  id: 'user_local_admin',
  displayName: '郭青宸',
  createdAt,
  lastLoginAt: createdAt
};

const workspaceConfig: WorkspaceConfig = {
  id: 'workspace_sample',
  rootPath: 'D:/sample',
  contextPath: 'D:/sample/game-context',
  activeGameId: 'mission_frontline',
  currentUserId: localUser.id,
  schemaVersion: 1,
  createdAt,
  updatedAt: createdAt
};

const apiConfig: ApiConfig = {
  id: 'api_default',
  baseUrl: 'https://api.example.test/v1',
  modelName: 'mock-model',
  enabled: false,
  createdAt,
  updatedAt: createdAt
};

const gameNode: GameNode = {
  nodeType: NodeType.Game,
  id: 'mission_frontline',
  gameName: '使命防线',
  gameVersion: 'v0.3.2',
  projectStage: ProjectStage.Testing,
  creatorId: localUser.id,
  lastEditorId: localUser.id,
  createdAt,
  updatedAt: createdAt
};

const moduleNode: ModuleNode = {
  nodeType: NodeType.Module,
  id: 'gacha_workshop',
  gameId: gameNode.id,
  gameVersion: gameNode.gameVersion,
  moduleName: '生产线/开箱',
  imageIds: ['img_main_workshop'],
  creatorId: localUser.id,
  lastEditorId: localUser.id,
  createdAt,
  updatedAt: createdAt
};

const contentNode: ContentNode = {
  nodeType: NodeType.Content,
  id: 'day1_first_gacha',
  gameId: gameNode.id,
  gameVersion: gameNode.gameVersion,
  moduleId: moduleNode.id,
  title: '第一天首次进入生产线',
  imageIds: ['img_main_workshop'],
  creatorId: localUser.id,
  lastEditorId: localUser.id,
  createdAt,
  updatedAt: createdAt
};

const imageAsset: ImageAsset = {
  id: 'img_main_workshop',
  displayName: '主界面生产线区域',
  originalFileName: 'weird-original-name.png',
  relativePath: 'games/mission_frontline/assets/images/img_main_workshop__main-workshop.png',
  fileType: 'png',
  gameId: gameNode.id,
  uploaderId: localUser.id,
  updatedAt: createdAt
};

const nodeImageLink: NodeImageLink = {
  nodeType: NodeType.Content,
  nodeId: contentNode.id,
  imageId: imageAsset.id
};

void [
  workspaceConfig,
  apiConfig,
  gameNode,
  moduleNode,
  contentNode,
  imageAsset,
  nodeImageLink
];

EDITABLE_FIELDS[NodeType.Game].includes('gameName');
LOCKED_FIELDS[NodeType.Module].includes('gameId');
