import { useEffect, useState } from 'react';
import {
  AiEditMode,
  AI_EDIT_MODE_LABELS,
  NodeType,
  ProjectStage,
  PROJECT_STAGE_LABELS,
  type AiFieldEditResult,
  type AiGameSummaryResult,
  type AiModuleSummaryResult,
  type ApiConfig,
  type ApiConnectionTestResult,
  type ContentNode,
  type GameNode,
  type ImageAssetView,
  type LocalUser,
  type ModuleNode
} from '../../shared/index.js';

type Language = 'zh' | 'en';
type WorkspaceStatus = 'idle' | 'creating' | 'importing' | 'ready' | 'canceled' | 'error';
type UserStatus = 'idle' | 'loading' | 'saving' | 'error';
type GameStatus = 'idle' | 'loading' | 'saving' | 'error';
type ImageStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'canceled' | 'error';
type ModuleStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'error';
type ContentStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'error';
type ApiStatus = 'idle' | 'loading' | 'saving' | 'testing' | 'error';
type ApiAction = 'save' | 'test';
type WorkspaceAction = 'create' | 'import';
type AiStatus = 'idle' | 'generating' | 'saving' | 'error';
type ActiveNodeKind = 'game' | 'module' | 'content';
type AiEditableNodeKind = ActiveNodeKind;

interface GameFormState {
  id: string;
  gameName: string;
  gameVersion: string;
  projectStage: ProjectStage;
  gameGenre: string;
  coreGameplay: string;
  mainFun: string;
  targetUsers: string;
  currentOperationGoal: string;
  currentMainProblems: string;
  mainOptimizationDirections: string;
  notes: string;
  coverImageId: string;
}

interface ImageFormState {
  displayName: string;
  notes: string;
}

interface ModuleFormState {
  id: string;
  moduleName: string;
  modulePositioning: string;
  systemRules: string;
  resourceFlow: string;
  imageIds: string[];
  playerMainActions: string;
  subjectiveFun: string;
  subjectiveProblems: string;
  subjectiveOptimizationDirections: string;
}

interface ContentFormState {
  id: string;
  title: string;
  imageIds: string[];
  accountDay: string;
  cumulativePaymentAmount: string;
  maxMainlineProgress: string;
  characterLevel: string;
  processDescription: string;
  subjectiveFun: string;
  subjectiveKnownProblems: string;
  subjectiveOptimizationDirections: string;
}

interface ApiFormState {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  enabled: boolean;
}

interface AiAssistFormState {
  mode: AiEditMode.Add | AiEditMode.Modify | AiEditMode.Polish;
  fieldKey: string;
  userInstruction: string;
}

interface AiEditableField {
  key: string;
  nodeKind: AiEditableNodeKind;
  nodeType: NodeType;
  nodeId: string;
  fieldName: string;
  label: string;
  value: string;
  nodeTitle: string;
}

const initialGameForm: GameFormState = {
  id: '',
  gameName: '',
  gameVersion: '',
  projectStage: ProjectStage.Testing,
  gameGenre: '',
  coreGameplay: '',
  mainFun: '',
  targetUsers: '',
  currentOperationGoal: '',
  currentMainProblems: '',
  mainOptimizationDirections: '',
  notes: '',
  coverImageId: ''
};

const initialImageForm: ImageFormState = {
  displayName: '',
  notes: ''
};

const initialModuleForm: ModuleFormState = {
  id: '',
  moduleName: '',
  modulePositioning: '',
  systemRules: '',
  resourceFlow: '',
  imageIds: [],
  playerMainActions: '',
  subjectiveFun: '',
  subjectiveProblems: '',
  subjectiveOptimizationDirections: ''
};

const initialContentForm: ContentFormState = {
  id: '',
  title: '',
  imageIds: [],
  accountDay: '',
  cumulativePaymentAmount: '',
  maxMainlineProgress: '',
  characterLevel: '',
  processDescription: '',
  subjectiveFun: '',
  subjectiveKnownProblems: '',
  subjectiveOptimizationDirections: ''
};

const initialApiForm: ApiFormState = {
  baseUrl: 'mock://local',
  apiKey: '',
  modelName: 'mock-model',
  enabled: false
};

const initialAiAssistForm: AiAssistFormState = {
  mode: AiEditMode.Add,
  fieldKey: '',
  userInstruction: ''
};

const copy = {
  zh: {
    appName: 'Game Context Manager',
    subtitle: '本地游戏上下文工作区',
    switchLabel: 'English',
    createWorkspace: '创建工作空间',
    creatingWorkspace: '正在创建...',
    importWorkspace: '导入已有工作空间',
    importingWorkspace: '正在导入...',
    workspace: '工作空间',
    noWorkspace: '未选择',
    selectedWorkspace: '已选择',
    currentUser: '当前用户',
    noUser: '未创建',
    createUserTitle: '本地用户',
    createUserPrompt: '创建节点前必须先选择当前用户。',
    displayNameLabel: '显示名',
    displayNamePlaceholder: '例如：策划 A',
    createUser: '创建用户',
    creatingUser: '保存中...',
    selectUserLabel: '选择当前用户',
    userReady: '已选择当前用户',
    userLoadError: '读取用户失败。',
    userCreateError: '保存用户失败。',
    userNameRequired: '请输入显示名。',
    gameNodeRequiresUser: '先选择当前用户后创建游戏主节点',
    gameNodeReady: '游戏主节点',
    createGameTitle: '游戏主节点',
    createGamePrompt: '创建一级游戏节点后，会生成 game.md、INDEX.md 并更新 manifest.yml。',
    editGamePrompt: '编辑可编辑字段后会更新最后编辑者、game.md、INDEX.md 和 manifest.yml。',
    saveGame: '保存游戏节点',
    createGame: '创建游戏节点',
    savingGame: '保存中...',
    gameSaveError: '保存游戏节点失败。',
    gameNameLabel: '游戏名称',
    gameNamePlaceholder: '例如：使命防线',
    gameIdLabel: '节点 ID',
    gameIdPlaceholder: '可选，例如 mission_frontline',
    gameVersionLabel: '游戏版本',
    gameVersionPlaceholder: '例如 v0.3.2',
    projectStageLabel: '项目阶段',
    gameGenreLabel: '游戏类型',
    coreGameplayLabel: '核心玩法',
    mainFunLabel: '主要乐趣',
    targetUsersLabel: '目标用户',
    currentOperationGoalLabel: '当前运营目标',
    currentMainProblemsLabel: '当前主要问题',
    mainOptimizationDirectionsLabel: '主要优化方向',
    notesLabel: '补充说明',
    coverImageIdLabel: '主图ID',
    optionalFieldPlaceholder: '可留空，MD 中会保留标题方便后续补充。',
    lockedFieldsTitle: '结构字段',
    creatorIdLabel: '创建者',
    lastEditorIdLabel: '最后编辑者',
    createdAtLabel: '创建时间',
    updatedAtLabel: '更新时间',
    noGamePreview: '创建游戏主节点后显示 game.md 预览。',
    gameNameRequired: '请填写游戏名称。',
    gameVersionRequired: '请填写游戏版本。',
    apiStatus: 'AI',
    apiDisabled: '未配置',
    apiEnabled: '已启用',
    apiConfiguredDisabled: '已保存未启用',
    apiConfigTitle: 'API 配置',
    apiConfigPrompt: 'API key 只保存在本地数据库，不会写入导出的 Markdown、manifest 或图片目录。',
    apiBaseUrlLabel: 'API Base URL',
    apiBaseUrlPlaceholder: '例如 mock://local 或 https://api.example.com/v1',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: '本地保存，mock provider 可留空',
    apiModelLabel: '模型名',
    apiModelPlaceholder: '例如 mock-model 或 gpt-4.1-mini',
    apiEnabledLabel: '启用 AI 辅助',
    saveApiConfig: '保存配置',
    savingApiConfig: '保存中...',
    testApiConnection: '测试连接',
    testingApiConnection: '测试中...',
    apiSaveError: '保存 API 配置失败。',
    apiTestSuccess: '连接测试通过',
    apiTestError: '连接测试失败。',
    apiBaseUrlRequired: '请填写 API Base URL。',
    apiModelRequired: '请填写模型名。',
    apiNoConfig: '尚未保存 API 配置。',
    aiReady: '选择字段后生成候选，确认后才会覆盖并保存。',
    aiNodeRequired: '请先选择已保存的节点。',
    aiFieldLabel: '字段',
    aiModeLabel: '模式',
    aiInstructionLabel: '用户说明',
    aiInstructionPlaceholder: '输入要增加、修改或润色的要求。',
    aiGenerate: '生成候选',
    aiGenerating: '生成中...',
    aiConfirm: '确认覆盖',
    aiSaving: '保存中...',
    aiCancel: '取消',
    aiOriginal: '原文',
    aiCandidate: '新文',
    aiDiff: '差异',
    aiNoCandidate: 'AI 输出会显示在这里。',
    aiGenerateError: '生成 AI 候选失败。',
    aiConfirmError: '确认覆盖失败。',
    aiInstructionRequired: '增加或修改内容时需要填写用户说明。',
    aiDisabledMessage: '保存并启用 API 配置后可使用字段级 AI 编辑。',
    aiSummaryTitle: '模块汇总',
    aiSummaryReady: '从当前模块的三级内容生成父节点字段候选，确认后才会覆盖模块字段。',
    aiSummarizeChildren: '从子节点汇总',
    aiSummaryRequiresModule: '请先选择已保存的模块节点。',
    aiSummaryRequiresChildren: '当前模块没有三级内容节点可汇总。',
    aiSummaryCandidate: '汇总候选',
    aiSummaryContentCount: '子节点数量',
    aiGameSummaryTitle: '游戏汇总',
    aiGameSummaryReady: '从所有二级模块生成游戏主节点字段候选，确认后才会覆盖游戏字段。',
    aiSummarizeModules: '从模块汇总',
    aiGameSummaryRequiresGame: '请先选择已保存的游戏主节点。',
    aiGameSummaryRequiresModules: '当前游戏没有模块节点可汇总。',
    aiGameSummaryModuleCount: '模块数量',
    exportStatus: '导出',
    exportIdle: '待同步',
    treeTitle: '节点树',
    treeHint: '一个工作空间对应一个游戏主节点。',
    emptyTreeTitle: '尚未选择工作空间',
    emptyTreeDescription: '创建工作空间后，这里会显示游戏、模块和内容节点。',
    workspaceTreeTitle: '当前工作空间',
    gameNodePlaceholder: '游戏主节点待创建',
    modulePlaceholder: '尚未创建模块节点',
    modulePanelTitle: '模块节点',
    moduleCreatePrompt: '在当前游戏下创建二级模块，保存后会生成 modules/<module_id>.md 并更新目录。',
    moduleEditPrompt: '编辑模块字段或图片关联后会更新最后编辑者、模块 MD、INDEX 和 manifest。',
    createModule: '创建模块',
    saveModule: '保存模块',
    savingModule: '保存中...',
    deleteModule: '删除模块',
    deletingModule: '删除中...',
    confirmDeleteModule: '删除模块会连同其所有内容节点一起删除，但不会删除图片资产。确认继续？',
    moduleSaveError: '保存模块失败。',
    moduleDeleteError: '删除模块失败。',
    moduleRequiresGame: '请先创建游戏主节点。',
    moduleRequiresUser: '请先选择当前用户。',
    moduleNameRequired: '请填写模块名称。',
    moduleNameLabel: '模块名称',
    moduleNamePlaceholder: '例如：生产线/开箱',
    moduleIdLabel: '模块 ID',
    moduleIdPlaceholder: '可选，例如 gacha_workshop',
    modulePositioningLabel: '模块定位',
    systemRulesLabel: '系统规则',
    resourceFlowLabel: '资源产出/消耗',
    linkedImagesLabel: '关联截图',
    noImagesForLink: '暂无可关联图片，可先在图片库上传。',
    playerMainActionsLabel: '玩家主要操作',
    subjectiveFunLabel: '乐趣点（主观）',
    subjectiveProblemsLabel: '主要问题（主观）',
    subjectiveOptimizationDirectionsLabel: '优化方向（主观）',
    noModules: '尚未创建模块。',
    selectModule: '选择模块',
    newModule: '新建模块',
    contentPlaceholder: '当前模块尚无内容节点',
    imageLibrary: '图片库',
    imageLibraryPlaceholder: '创建游戏主节点后可上传图片资产。',
    imageCount: '张图片',
    imageUploadTitle: '图片库',
    imageUploadPrompt: '上传前先填写图片名，文件会按图片名重命名并写入 image_catalog.yml。',
    imageNameLabel: '图片名',
    imageNamePlaceholder: '例如：主界面生产线区域',
    imageNotesLabel: '备注',
    imageNotesPlaceholder: '可选，说明截图用途或来源。',
    uploadImage: '上传图片',
    uploadingImage: '上传中...',
    deleteImage: '删除图片',
    deletingImage: '删除中...',
    imageReferencesLabel: '引用节点',
    imageNoReferences: '未被节点引用',
    confirmDeleteImage: '删除图片会移除文件、取消所有节点关联，并清理内容中的 @ 引用。确认继续？',
    confirmDeleteReferencedImage: '该图片正在被以下节点引用，删除会取消这些关联并清理内容中的 @ 引用：',
    imageNameRequired: '请先填写图片名。',
    imageRequiresGame: '请先创建游戏主节点。',
    imageRequiresUser: '请先选择当前用户。',
    imageUploadError: '上传图片失败。',
    imageUploadCanceled: '已取消选择图片。',
    imageEmpty: '尚未上传图片。',
    imageOriginalFile: '原始文件名',
    imageGeneratedPath: '生成路径',
    imageIdLabel: '图片ID',
    moduleMarkdownPreview: '创建或选择模块后显示模块 MD 预览。',
    contentPanelTitle: '内容节点',
    contentCreatePrompt: '在选中模块下创建三级内容，保存后会生成 contents/<content_id>.md 并更新目录。',
    contentEditPrompt: '编辑内容字段、账号状态或图片引用后会更新内容 MD、INDEX 和 manifest。',
    createContent: '创建内容',
    saveContent: '保存内容',
    savingContent: '保存中...',
    deleteContent: '删除内容',
    deletingContent: '删除中...',
    confirmDeleteContent: '删除内容节点会删除对应 MD 和图片关联，但不会删除图片资产。确认继续？',
    contentSaveError: '保存内容失败。',
    contentDeleteError: '删除内容失败。',
    contentRequiresModule: '请先选择模块节点。',
    contentRequiresUser: '请先选择当前用户。',
    contentTitleRequired: '请填写内容标题。',
    contentTitleLabel: '标题',
    contentTitlePlaceholder: '例如：第一天首次进入生产线',
    contentIdLabel: '内容 ID',
    contentIdPlaceholder: '可选，例如 day1_first_gacha',
    noContents: '当前模块尚未创建内容。',
    selectContent: '选择内容',
    newContent: '新建内容',
    accountStatusLabel: '账号状态',
    accountDayLabel: '创角天数',
    cumulativePaymentAmountLabel: '累计付费金额',
    maxMainlineProgressLabel: '最大主线通关数',
    characterLevelLabel: '角色等级',
    processDescriptionLabel: '过程说明',
    processDescriptionPlaceholder: '可用 @image_id 或 @图片名 引用已勾选图片。',
    subjectiveKnownProblemsLabel: '已知问题（主观）',
    contentMarkdownPreview: '创建或选择内容后显示内容 MD 预览。',
    detailTitleEmpty: '选择或创建工作空间',
    detailTitleReady: '工作空间概览',
    detailSubtitleEmpty:
      '先创建本地 game-context 目录。当前任务只提供布局与节点树壳，不创建真实节点。',
    detailSubtitleReady:
      '基础结构已就绪。后续任务会在这里显示节点字段、保存状态和 Markdown 预览。',
    workspaceReady: '工作空间已创建',
    workspaceImported: '工作空间已导入',
    workspaceCanceled: '已取消选择目录。',
    workspaceError: '创建工作空间失败。',
    workspaceImportError: '导入工作空间失败。',
    workspacePathLabel: '路径',
    createdPathsLabel: '本次创建',
    noNewPaths: '所需文件已存在，未覆盖已有内容。',
    emptyStateTitle: '等待节点数据',
    emptyStateDescription:
      'T005 只展示节点树空状态。游戏、模块、内容 CRUD 会在后续任务逐步接入。',
    nextStepsTitle: '当前可用操作',
    nextSteps: ['创建或复用工作空间', '区分空工作空间与已选工作空间', '查看基础生成结构'],
    rightPanelTitle: '辅助面板',
    imagesPanel: '关联截图',
    imagesEmpty: '选择节点后显示关联图片。',
    nodeImagesEmpty: '当前节点未关联图片。',
    previewPanel: 'MD 预览',
    previewEmpty: '节点文件预览将在创建游戏节点后显示。',
    aiPanel: 'AI 辅助',
    aiEmpty: '保存并启用 API 配置后可使用字段级 AI 编辑。',
    generatedFilesTitle: '基础结构',
    generatedFiles: [
      'game-context/AGENTS.md',
      'game-context/CLAUDE.md',
      'game-context/USAGE.md',
      'game-context/README.md',
      'game-context/manifest.yml',
      'game-context/games/'
    ]
  },
  en: {
    appName: 'Game Context Manager',
    subtitle: 'Local game context workspace',
    switchLabel: '中文',
    createWorkspace: 'Create workspace',
    creatingWorkspace: 'Creating...',
    importWorkspace: 'Import workspace',
    importingWorkspace: 'Importing...',
    workspace: 'Workspace',
    noWorkspace: 'None',
    selectedWorkspace: 'Selected',
    currentUser: 'Current user',
    noUser: 'Not created',
    createUserTitle: 'Local user',
    createUserPrompt: 'Select a current user before creating nodes.',
    displayNameLabel: 'Display name',
    displayNamePlaceholder: 'Example: Designer A',
    createUser: 'Create user',
    creatingUser: 'Saving...',
    selectUserLabel: 'Select current user',
    userReady: 'Current user selected',
    userLoadError: 'Failed to load users.',
    userCreateError: 'Failed to save user.',
    userNameRequired: 'Enter a display name.',
    gameNodeRequiresUser: 'Select a current user before creating the game root node',
    gameNodeReady: 'Game root node',
    createGameTitle: 'Game root node',
    createGamePrompt: 'Creating the root game node writes game.md, INDEX.md, and updates manifest.yml.',
    editGamePrompt: 'Editing fields updates the last editor, game.md, INDEX.md, and manifest.yml.',
    saveGame: 'Save game node',
    createGame: 'Create game node',
    savingGame: 'Saving...',
    gameSaveError: 'Failed to save game node.',
    gameNameLabel: 'Game name',
    gameNamePlaceholder: 'Example: Mission Frontline',
    gameIdLabel: 'Node ID',
    gameIdPlaceholder: 'Optional, e.g. mission_frontline',
    gameVersionLabel: 'Game version',
    gameVersionPlaceholder: 'Example: v0.3.2',
    projectStageLabel: 'Project stage',
    gameGenreLabel: 'Game genre',
    coreGameplayLabel: 'Core gameplay',
    mainFunLabel: 'Main fun',
    targetUsersLabel: 'Target users',
    currentOperationGoalLabel: 'Current operation goal',
    currentMainProblemsLabel: 'Current main problems',
    mainOptimizationDirectionsLabel: 'Main optimization directions',
    notesLabel: 'Notes',
    coverImageIdLabel: 'Cover image ID',
    optionalFieldPlaceholder: 'Optional. Markdown keeps the heading for later completion.',
    lockedFieldsTitle: 'Structure fields',
    creatorIdLabel: 'Creator',
    lastEditorIdLabel: 'Last editor',
    createdAtLabel: 'Created at',
    updatedAtLabel: 'Updated at',
    noGamePreview: 'Create the game root node to show the game.md preview.',
    gameNameRequired: 'Enter the game name.',
    gameVersionRequired: 'Enter the game version.',
    apiStatus: 'AI',
    apiDisabled: 'Not configured',
    apiEnabled: 'Enabled',
    apiConfiguredDisabled: 'Saved off',
    apiConfigTitle: 'API settings',
    apiConfigPrompt: 'The API key is stored only in the local database and is never written to exported Markdown, manifest, or image catalogs.',
    apiBaseUrlLabel: 'API Base URL',
    apiBaseUrlPlaceholder: 'Example: mock://local or https://api.example.com/v1',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Stored locally. Leave blank for the mock provider',
    apiModelLabel: 'Model name',
    apiModelPlaceholder: 'Example: mock-model or gpt-4.1-mini',
    apiEnabledLabel: 'Enable AI assist',
    saveApiConfig: 'Save settings',
    savingApiConfig: 'Saving...',
    testApiConnection: 'Test connection',
    testingApiConnection: 'Testing...',
    apiSaveError: 'Failed to save API settings.',
    apiTestSuccess: 'Connection test passed',
    apiTestError: 'Connection test failed.',
    apiBaseUrlRequired: 'Enter the API Base URL.',
    apiModelRequired: 'Enter the model name.',
    apiNoConfig: 'No API settings saved yet.',
    aiReady: 'Generate a candidate for one field, then confirm before saving.',
    aiNodeRequired: 'Select a saved node first.',
    aiFieldLabel: 'Field',
    aiModeLabel: 'Mode',
    aiInstructionLabel: 'User instruction',
    aiInstructionPlaceholder: 'Enter what to add, modify, or polish.',
    aiGenerate: 'Generate candidate',
    aiGenerating: 'Generating...',
    aiConfirm: 'Confirm overwrite',
    aiSaving: 'Saving...',
    aiCancel: 'Cancel',
    aiOriginal: 'Original',
    aiCandidate: 'New',
    aiDiff: 'Diff',
    aiNoCandidate: 'AI output appears here.',
    aiGenerateError: 'Failed to generate AI candidate.',
    aiConfirmError: 'Failed to confirm overwrite.',
    aiInstructionRequired: 'Add or modify mode requires a user instruction.',
    aiDisabledMessage: 'Save and enable API settings to use field-level AI editing.',
    aiSummaryTitle: 'Module summary',
    aiSummaryReady: 'Generate parent module field candidates from third-level content nodes. Confirm before overwriting module fields.',
    aiSummarizeChildren: 'Summarize children',
    aiSummaryRequiresModule: 'Select a saved module node first.',
    aiSummaryRequiresChildren: 'The current module has no third-level content nodes to summarize.',
    aiSummaryCandidate: 'Summary candidate',
    aiSummaryContentCount: 'Child content count',
    aiGameSummaryTitle: 'Game summary',
    aiGameSummaryReady: 'Generate game root field candidates from all second-level modules. Confirm before overwriting game fields.',
    aiSummarizeModules: 'Summarize modules',
    aiGameSummaryRequiresGame: 'Select a saved game root node first.',
    aiGameSummaryRequiresModules: 'The current game has no module nodes to summarize.',
    aiGameSummaryModuleCount: 'Module count',
    exportStatus: 'Export',
    exportIdle: 'Pending',
    treeTitle: 'Node tree',
    treeHint: 'One workspace maps to one game root node.',
    emptyTreeTitle: 'No workspace selected',
    emptyTreeDescription: 'Create a workspace to show game, module, and content nodes here.',
    workspaceTreeTitle: 'Current workspace',
    gameNodePlaceholder: 'Game root node pending',
    modulePlaceholder: 'No module nodes yet',
    modulePanelTitle: 'Module node',
    moduleCreatePrompt: 'Create a second-level module under the current game. Saving writes modules/<module_id>.md and updates indexes.',
    moduleEditPrompt: 'Editing fields or image links updates the last editor, module Markdown, INDEX, and manifest.',
    createModule: 'Create module',
    saveModule: 'Save module',
    savingModule: 'Saving...',
    deleteModule: 'Delete module',
    deletingModule: 'Deleting...',
    confirmDeleteModule: 'Deleting this module also deletes all child content nodes, but keeps image assets. Continue?',
    moduleSaveError: 'Failed to save module.',
    moduleDeleteError: 'Failed to delete module.',
    moduleRequiresGame: 'Create the game root node first.',
    moduleRequiresUser: 'Select a current user first.',
    moduleNameRequired: 'Enter the module name.',
    moduleNameLabel: 'Module name',
    moduleNamePlaceholder: 'Example: Gacha workshop',
    moduleIdLabel: 'Module ID',
    moduleIdPlaceholder: 'Optional, e.g. gacha_workshop',
    modulePositioningLabel: 'Module positioning',
    systemRulesLabel: 'System rules',
    resourceFlowLabel: 'Resource output/consumption',
    linkedImagesLabel: 'Linked screenshots',
    noImagesForLink: 'No image assets available. Upload images in the image library first.',
    playerMainActionsLabel: 'Player main actions',
    subjectiveFunLabel: 'Fun points (subjective)',
    subjectiveProblemsLabel: 'Main problems (subjective)',
    subjectiveOptimizationDirectionsLabel: 'Optimization directions (subjective)',
    noModules: 'No modules created yet.',
    selectModule: 'Select module',
    newModule: 'New module',
    contentPlaceholder: 'No content nodes in the selected module',
    imageLibrary: 'Image library',
    imageLibraryPlaceholder: 'Upload image assets after creating the game root node.',
    imageCount: 'images',
    imageUploadTitle: 'Image library',
    imageUploadPrompt: 'Enter an image name first. The file is renamed from that name and written to image_catalog.yml.',
    imageNameLabel: 'Image name',
    imageNamePlaceholder: 'Example: Main workshop screen',
    imageNotesLabel: 'Notes',
    imageNotesPlaceholder: 'Optional, describe the screenshot purpose or source.',
    uploadImage: 'Upload image',
    uploadingImage: 'Uploading...',
    deleteImage: 'Delete image',
    deletingImage: 'Deleting...',
    imageReferencesLabel: 'Linked nodes',
    imageNoReferences: 'No node references',
    confirmDeleteImage: 'Deleting this image removes the file, unlinks it from all nodes, and cleans content @ references. Continue?',
    confirmDeleteReferencedImage: 'This image is linked by these nodes. Deleting it will unlink them and clean content @ references:',
    imageNameRequired: 'Enter an image name first.',
    imageRequiresGame: 'Create the game root node first.',
    imageRequiresUser: 'Select a current user first.',
    imageUploadError: 'Failed to upload image.',
    imageUploadCanceled: 'Image selection canceled.',
    imageEmpty: 'No images uploaded yet.',
    imageOriginalFile: 'Original file name',
    imageGeneratedPath: 'Generated path',
    imageIdLabel: 'Image ID',
    moduleMarkdownPreview: 'Create or select a module to show the module Markdown preview.',
    contentPanelTitle: 'Content node',
    contentCreatePrompt: 'Create a third-level content node under the selected module. Saving writes contents/<content_id>.md and updates indexes.',
    contentEditPrompt: 'Editing content fields, account state, or image references updates content Markdown, INDEX, and manifest.',
    createContent: 'Create content',
    saveContent: 'Save content',
    savingContent: 'Saving...',
    deleteContent: 'Delete content',
    deletingContent: 'Deleting...',
    confirmDeleteContent: 'Deleting this content removes its Markdown and image links, but keeps image assets. Continue?',
    contentSaveError: 'Failed to save content.',
    contentDeleteError: 'Failed to delete content.',
    contentRequiresModule: 'Select a module node first.',
    contentRequiresUser: 'Select a current user first.',
    contentTitleRequired: 'Enter the content title.',
    contentTitleLabel: 'Title',
    contentTitlePlaceholder: 'Example: Day 1 first gacha entry',
    contentIdLabel: 'Content ID',
    contentIdPlaceholder: 'Optional, e.g. day1_first_gacha',
    noContents: 'No content nodes in this module yet.',
    selectContent: 'Select content',
    newContent: 'New content',
    accountStatusLabel: 'Account state',
    accountDayLabel: 'Account day',
    cumulativePaymentAmountLabel: 'Cumulative payment amount',
    maxMainlineProgressLabel: 'Max mainline progress',
    characterLevelLabel: 'Character level',
    processDescriptionLabel: 'Process description',
    processDescriptionPlaceholder: 'Use @image_id or @image_name for images checked below.',
    subjectiveKnownProblemsLabel: 'Known problems (subjective)',
    contentMarkdownPreview: 'Create or select content to show the content Markdown preview.',
    detailTitleEmpty: 'Select or create a workspace',
    detailTitleReady: 'Workspace overview',
    detailSubtitleEmpty:
      'Create a local game-context directory first. This task only provides layout and empty node-tree states.',
    detailSubtitleReady:
      'The base structure is ready. Later tasks will show node fields, save state, and Markdown preview here.',
    workspaceReady: 'Workspace created',
    workspaceImported: 'Workspace imported',
    workspaceCanceled: 'Folder selection canceled.',
    workspaceError: 'Failed to create workspace.',
    workspaceImportError: 'Failed to import workspace.',
    workspacePathLabel: 'Path',
    createdPathsLabel: 'Created now',
    noNewPaths: 'Required files already exist; existing content was not overwritten.',
    emptyStateTitle: 'Waiting for node data',
    emptyStateDescription:
      'T005 only renders the node-tree shell. Game, module, and content CRUD will be connected in later tasks.',
    nextStepsTitle: 'Available now',
    nextSteps: ['Create or reuse a workspace', 'Distinguish empty and selected workspace states', 'Inspect base structure'],
    rightPanelTitle: 'Assistant panel',
    imagesPanel: 'Linked images',
    imagesEmpty: 'Linked screenshots appear after selecting a node.',
    nodeImagesEmpty: 'No linked images on the current node.',
    previewPanel: 'MD preview',
    previewEmpty: 'Node file preview appears after creating the game node.',
    aiPanel: 'AI assist',
    aiEmpty: 'Save and enable API settings to use field-level AI editing.',
    generatedFilesTitle: 'Base structure',
    generatedFiles: [
      'game-context/AGENTS.md',
      'game-context/CLAUDE.md',
      'game-context/USAGE.md',
      'game-context/README.md',
      'game-context/manifest.yml',
      'game-context/games/'
    ]
  }
} as const;

function App(): React.JSX.Element {
  const [language, setLanguage] = useState<Language>('zh');
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>('idle');
  const [workspaceId, setWorkspaceId] = useState<string>();
  const [workspacePath, setWorkspacePath] = useState<string>();
  const [createdPaths, setCreatedPaths] = useState<string[]>([]);
  const [workspaceLastAction, setWorkspaceLastAction] = useState<WorkspaceAction>('create');
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LocalUser>();
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userStatus, setUserStatus] = useState<UserStatus>('loading');
  const [userErrorMessage, setUserErrorMessage] = useState<string>();
  const [game, setGame] = useState<GameNode>();
  const [gameForm, setGameForm] = useState<GameFormState>(initialGameForm);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [gameErrorMessage, setGameErrorMessage] = useState<string>();
  const [markdownPreview, setMarkdownPreview] = useState('');
  const [moduleMarkdownPreview, setModuleMarkdownPreview] = useState('');
  const [contentMarkdownPreview, setContentMarkdownPreview] = useState('');
  const [modules, setModules] = useState<ModuleNode[]>([]);
  const [selectedModule, setSelectedModule] = useState<ModuleNode>();
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(initialModuleForm);
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>('idle');
  const [moduleErrorMessage, setModuleErrorMessage] = useState<string>();
  const [contents, setContents] = useState<ContentNode[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentNode>();
  const [contentForm, setContentForm] = useState<ContentFormState>(initialContentForm);
  const [contentStatus, setContentStatus] = useState<ContentStatus>('idle');
  const [contentErrorMessage, setContentErrorMessage] = useState<string>();
  const [images, setImages] = useState<ImageAssetView[]>([]);
  const [imageForm, setImageForm] = useState<ImageFormState>(initialImageForm);
  const [imageStatus, setImageStatus] = useState<ImageStatus>('idle');
  const [imageErrorMessage, setImageErrorMessage] = useState<string>();
  const [apiConfig, setApiConfig] = useState<ApiConfig>();
  const [apiForm, setApiForm] = useState<ApiFormState>(initialApiForm);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');
  const [apiErrorMessage, setApiErrorMessage] = useState<string>();
  const [apiTestResult, setApiTestResult] = useState<ApiConnectionTestResult>();
  const [apiLastAction, setApiLastAction] = useState<ApiAction>('save');
  const [aiAssistForm, setAiAssistForm] = useState<AiAssistFormState>(initialAiAssistForm);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [aiErrorMessage, setAiErrorMessage] = useState<string>();
  const [aiFieldEditResult, setAiFieldEditResult] = useState<AiFieldEditResult>();
  const [aiModuleSummaryResult, setAiModuleSummaryResult] = useState<AiModuleSummaryResult>();
  const [aiGameSummaryResult, setAiGameSummaryResult] = useState<AiGameSummaryResult>();
  const [activeNodeKind, setActiveNodeKind] = useState<ActiveNodeKind>('game');
  const [errorMessage, setErrorMessage] = useState<string>();
  const text = copy[language];
  const nextLanguage: Language = language === 'zh' ? 'en' : 'zh';
  const hasWorkspace = workspaceStatus === 'ready' && Boolean(workspacePath);
  const hasCurrentUser = Boolean(currentUser);
  const selectedWorkspacePath = workspacePath ?? '';
  const activeNodeTitle =
    activeNodeKind === 'content' && selectedContent
      ? selectedContent.title
      : activeNodeKind === 'module' && selectedModule
        ? selectedModule.moduleName
        : game?.gameName;
  const activeNodeImageIds = activeNodeKind === 'content' && selectedContent
    ? contentForm.imageIds
    : activeNodeKind === 'module' && selectedModule
      ? moduleForm.imageIds
      : gameForm.coverImageId.trim()
        ? [gameForm.coverImageId.trim()]
        : [];
  const activeNodeImages = activeNodeImageIds
    .map((imageId) => images.find((image) => image.id === imageId))
    .filter((image): image is ImageAssetView => Boolean(image));
  const activeMarkdownPreview =
    activeNodeKind === 'content' && selectedContent
      ? contentMarkdownPreview
      : activeNodeKind === 'module' && selectedModule
        ? moduleMarkdownPreview
        : markdownPreview;
  const activeImagesEmptyText = activeNodeTitle ? text.nodeImagesEmpty : text.imagesEmpty;
  const activePreviewEmptyText = game ? text.previewEmpty : text.noGamePreview;
  const apiStatusValue = apiConfig?.enabled ? text.apiEnabled : apiConfig ? text.apiConfiguredDisabled : text.apiDisabled;
  const apiStatusTone: 'ready' | 'muted' = apiConfig?.enabled ? 'ready' : 'muted';
  const aiEditableFields = buildAiEditableFields({
    text,
    activeNodeKind,
    game,
    gameForm,
    selectedModule,
    moduleForm,
    selectedContent,
    contentForm
  });
  const aiEditableFieldKeys = aiEditableFields.map((field) => field.key).join('|');
  const selectedAiField =
    aiEditableFields.find((field) => field.key === aiAssistForm.fieldKey) ?? aiEditableFields[0];
  const selectedModuleContentCount = selectedModule
    ? contents.filter((content) => content.moduleId === selectedModule.id).length
    : 0;
  const gameModuleCount = game ? modules.length : 0;

  useEffect(() => {
    void loadUserState();
    void loadApiConfigState();
  }, []);

  useEffect(() => {
    setAiFieldEditResult(undefined);
    setAiModuleSummaryResult(undefined);
    setAiGameSummaryResult(undefined);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
    setAiAssistForm((current) => {
      if (aiEditableFields.some((field) => field.key === current.fieldKey)) {
        return current;
      }

      return {
        ...current,
        fieldKey: aiEditableFields[0]?.key ?? ''
      };
    });
  }, [activeNodeKind, game?.id, selectedModule?.id, selectedContent?.id, aiEditableFieldKeys]);

  async function loadUserState(nextWorkspaceId?: string): Promise<void> {
    setUserStatus('loading');
    setUserErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.getUserState(nextWorkspaceId);
      applyUserState(state);
      setUserStatus('idle');
    } catch (error) {
      setUserStatus('error');
      setUserErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadGameState(nextWorkspaceId: string): Promise<void> {
    setGameStatus('loading');
    setGameErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.getGameState(nextWorkspaceId);
      applyGameState(state);
      setGameStatus('idle');
    } catch (error) {
      setGameStatus('error');
      setGameErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadImageState(nextWorkspaceId: string): Promise<void> {
    setImageStatus('loading');
    setImageErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.getImageState(nextWorkspaceId);
      applyImageState(state);
      setImageStatus('idle');
    } catch (error) {
      setImageStatus('error');
      setImageErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadModuleState(nextWorkspaceId: string, selectedModuleId?: string): Promise<void> {
    setModuleStatus('loading');
    setModuleErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.getModuleState(nextWorkspaceId, selectedModuleId);
      applyModuleState(state);
      setModuleStatus('idle');
    } catch (error) {
      setModuleStatus('error');
      setModuleErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadContentState(nextWorkspaceId: string, selectedContentId?: string, moduleId?: string): Promise<void> {
    setContentStatus('loading');
    setContentErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.getContentState(nextWorkspaceId, selectedContentId, moduleId);
      applyContentState(state);
      setContentStatus('idle');
    } catch (error) {
      setContentStatus('error');
      setContentErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadApiConfigState(): Promise<void> {
    setApiStatus('loading');
    setApiErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.getApiConfigState();
      applyApiConfigState(state);
      setApiStatus('idle');
    } catch (error) {
      setApiStatus('error');
      setApiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function applyUserState(state: { users: LocalUser[]; currentUser?: LocalUser }): void {
    setUsers(state.users);
    setCurrentUser(state.currentUser);
  }

  function applyGameState(state: { game?: GameNode; markdownPreview?: string }): void {
    setGame(state.game);
    setMarkdownPreview(state.markdownPreview ?? '');
    setGameForm(state.game ? gameNodeToForm(state.game) : initialGameForm);
  }

  function applyImageState(state: { images: ImageAssetView[] }): void {
    setImages(state.images);
  }

  function applyModuleState(state: { modules: ModuleNode[]; selectedModule?: ModuleNode; markdownPreview?: string }): void {
    setModules(state.modules);
    setSelectedModule(state.selectedModule);
    setModuleMarkdownPreview(state.markdownPreview ?? '');
    setModuleForm(state.selectedModule ? moduleNodeToForm(state.selectedModule) : initialModuleForm);
  }

  function applyContentState(state: { contents: ContentNode[]; selectedContent?: ContentNode; markdownPreview?: string }): void {
    setContents(state.contents);
    setSelectedContent(state.selectedContent);
    setContentMarkdownPreview(state.markdownPreview ?? '');
    setContentForm(state.selectedContent ? contentNodeToForm(state.selectedContent) : initialContentForm);
  }

  function applyApiConfigState(state: { config?: ApiConfig }): void {
    setApiConfig(state.config);
    setApiForm(state.config ? apiConfigToForm(state.config) : initialApiForm);
  }

  async function handleCreateWorkspace(): Promise<void> {
    setWorkspaceLastAction('create');
    setWorkspaceStatus('creating');
    setErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.createWorkspace();

      if (result.canceled) {
        setWorkspaceStatus('canceled');
        return;
      }

      const nextWorkspaceId = result.workspace?.id;
      setWorkspaceId(nextWorkspaceId);
      setWorkspacePath(result.workspace?.contextPath);
      setCreatedPaths(result.workspace?.createdPaths ?? []);
      setWorkspaceStatus('ready');
      await loadUserState(nextWorkspaceId);
      if (nextWorkspaceId) {
        await loadGameState(nextWorkspaceId);
        await loadImageState(nextWorkspaceId);
        await loadModuleState(nextWorkspaceId);
        await loadContentState(nextWorkspaceId);
      }
    } catch (error) {
      setWorkspaceStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleImportWorkspace(): Promise<void> {
    setWorkspaceLastAction('import');
    setWorkspaceStatus('importing');
    setErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.importWorkspace();

      if (result.canceled) {
        setWorkspaceStatus('canceled');
        return;
      }

      const nextWorkspaceId = result.workspace?.id;
      setWorkspaceId(nextWorkspaceId);
      setWorkspacePath(result.workspace?.contextPath);
      setCreatedPaths([
        `${result.workspace?.imported.gameCount ?? 0} game`,
        `${result.workspace?.imported.moduleCount ?? 0} modules`,
        `${result.workspace?.imported.contentCount ?? 0} contents`,
        `${result.workspace?.imported.imageCount ?? 0} images`,
        ...(result.workspace?.warnings ?? [])
      ]);
      setWorkspaceStatus('ready');
      setActiveNodeKind('game');
      await loadUserState(nextWorkspaceId);
      if (nextWorkspaceId) {
        await loadGameState(nextWorkspaceId);
        await loadImageState(nextWorkspaceId);
        await loadModuleState(nextWorkspaceId);
        await loadContentState(nextWorkspaceId);
      }
    } catch (error) {
      setWorkspaceStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleCreateUser(): Promise<void> {
    const displayName = userDisplayName.trim();

    if (!displayName) {
      setUserStatus('error');
      setUserErrorMessage(text.userNameRequired);
      return;
    }

    setUserStatus('saving');
    setUserErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.createLocalUser({ displayName }, workspaceId);
      applyUserState(state);
      setUserDisplayName('');
      setUserStatus('idle');
    } catch (error) {
      setUserStatus('error');
      setUserErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectUser(userId: string): Promise<void> {
    if (!userId) {
      return;
    }

    setUserStatus('saving');
    setUserErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.selectCurrentUser({ userId, workspaceId });
      applyUserState(state);
      setUserStatus('idle');
    } catch (error) {
      setUserStatus('error');
      setUserErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveGame(nextForm = gameForm): Promise<boolean> {
    if (!workspaceId || !currentUser) {
      setGameStatus('error');
      setGameErrorMessage(text.gameNodeRequiresUser);
      return false;
    }

    if (!nextForm.gameName.trim()) {
      setGameStatus('error');
      setGameErrorMessage(text.gameNameRequired);
      return false;
    }

    if (!nextForm.gameVersion.trim()) {
      setGameStatus('error');
      setGameErrorMessage(text.gameVersionRequired);
      return false;
    }

    setGameStatus('saving');
    setGameErrorMessage(undefined);

    try {
      const input = {
        workspaceId,
        id: nextForm.id,
        gameName: nextForm.gameName,
        gameVersion: nextForm.gameVersion,
        projectStage: nextForm.projectStage,
        gameGenre: nextForm.gameGenre,
        coreGameplay: nextForm.coreGameplay,
        mainFun: nextForm.mainFun,
        targetUsers: nextForm.targetUsers,
        currentOperationGoal: nextForm.currentOperationGoal,
        currentMainProblems: nextForm.currentMainProblems,
        mainOptimizationDirections: nextForm.mainOptimizationDirections,
        notes: nextForm.notes,
        coverImageId: nextForm.coverImageId
      };
      const state = game
        ? await window.gameContextManager.updateGameNode(input)
        : await window.gameContextManager.createGameNode(input);

      applyGameState(state);
      setActiveNodeKind('game');
      await loadImageState(workspaceId);
      await loadModuleState(workspaceId);
      await loadContentState(workspaceId);
      setGameStatus('idle');
      return true;
    } catch (error) {
      setGameStatus('error');
      setGameErrorMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async function handleUploadImage(): Promise<void> {
    if (!workspaceId) {
      return;
    }

    if (!currentUser) {
      setImageStatus('error');
      setImageErrorMessage(text.imageRequiresUser);
      return;
    }

    if (!game) {
      setImageStatus('error');
      setImageErrorMessage(text.imageRequiresGame);
      return;
    }

    if (!imageForm.displayName.trim()) {
      setImageStatus('error');
      setImageErrorMessage(text.imageNameRequired);
      return;
    }

    setImageStatus('saving');
    setImageErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.uploadImageAsset({
        workspaceId,
        displayName: imageForm.displayName,
        notes: imageForm.notes
      });

      applyImageState(state);
      await loadModuleState(workspaceId, selectedModule?.id);
      await loadContentState(workspaceId, selectedContent?.id, selectedModule?.id);
      if (!state.canceled) {
        setImageForm(initialImageForm);
      }
      setImageStatus(state.canceled ? 'canceled' : 'idle');
    } catch (error) {
      setImageStatus('error');
      setImageErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function updateGameForm<Field extends keyof GameFormState>(field: Field, value: GameFormState[Field]): void {
    setGameForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateModuleForm<Field extends keyof ModuleFormState>(field: Field, value: ModuleFormState[Field]): void {
    setModuleForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateContentForm<Field extends keyof ContentFormState>(field: Field, value: ContentFormState[Field]): void {
    setContentForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateApiForm<Field extends keyof ApiFormState>(field: Field, value: ApiFormState[Field]): void {
    setApiForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateAiAssistForm<Field extends keyof AiAssistFormState>(
    field: Field,
    value: AiAssistFormState[Field]
  ): void {
    setAiAssistForm((current) => ({
      ...current,
      [field]: value
    }));
    setAiFieldEditResult(undefined);
    setAiModuleSummaryResult(undefined);
    setAiGameSummaryResult(undefined);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  async function handleGenerateAiFieldEdit(): Promise<void> {
    if (!apiConfig?.enabled) {
      setAiStatus('error');
      setAiErrorMessage(text.aiDisabledMessage);
      return;
    }

    if (!selectedAiField) {
      setAiStatus('error');
      setAiErrorMessage(text.aiNodeRequired);
      return;
    }

    if (
      [AiEditMode.Add, AiEditMode.Modify].includes(aiAssistForm.mode) &&
      !aiAssistForm.userInstruction.trim()
    ) {
      setAiStatus('error');
      setAiErrorMessage(text.aiInstructionRequired);
      return;
    }

    setAiStatus('generating');
    setAiErrorMessage(undefined);
    setAiFieldEditResult(undefined);
    setAiModuleSummaryResult(undefined);
    setAiGameSummaryResult(undefined);

    try {
      const result = await window.gameContextManager.generateAiFieldEdit({
        nodeType: selectedAiField.nodeType,
        nodeId: selectedAiField.nodeId,
        fieldName: selectedAiField.fieldName,
        fieldLabel: selectedAiField.label,
        fieldValue: selectedAiField.value,
        mode: aiAssistForm.mode,
        userInstruction: aiAssistForm.userInstruction,
        nodeContext: buildAiNodeContext({
          game,
          selectedModule,
          selectedContent,
          selectedField: selectedAiField
        }),
        locale: language
      });

      setAiFieldEditResult(result);
      setAiStatus('idle');
    } catch (error) {
      setAiStatus('error');
      setAiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleConfirmAiFieldEdit(): Promise<void> {
    if (!aiFieldEditResult || !selectedAiField) {
      return;
    }

    setAiStatus('saving');
    setAiErrorMessage(undefined);

    const nextValue = aiFieldEditResult.candidateValue;
    let ok = false;

    if (selectedAiField.nodeKind === 'game') {
      const nextForm = {
        ...gameForm,
        [selectedAiField.fieldName]: nextValue
      } as GameFormState;
      setGameForm(nextForm);
      ok = await handleSaveGame(nextForm);
    } else if (selectedAiField.nodeKind === 'module') {
      const nextForm = {
        ...moduleForm,
        [selectedAiField.fieldName]: nextValue
      } as ModuleFormState;
      setModuleForm(nextForm);
      ok = await handleSaveModule(nextForm);
    } else {
      const nextForm = {
        ...contentForm,
        [selectedAiField.fieldName]: nextValue
      } as ContentFormState;
      setContentForm(nextForm);
      ok = await handleSaveContent(nextForm);
    }

    if (ok) {
      setAiFieldEditResult(undefined);
      setAiGameSummaryResult(undefined);
      setAiAssistForm((current) => ({
        ...current,
        userInstruction: ''
      }));
      setAiStatus('idle');
      return;
    }

    setAiStatus('error');
    setAiErrorMessage(text.aiConfirmError);
  }

  function handleCancelAiFieldEdit(): void {
    setAiFieldEditResult(undefined);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  async function handleGenerateAiModuleSummary(): Promise<void> {
    if (!apiConfig?.enabled) {
      setAiStatus('error');
      setAiErrorMessage(text.aiDisabledMessage);
      return;
    }

    if (!workspaceId || !selectedModule || activeNodeKind !== 'module') {
      setAiStatus('error');
      setAiErrorMessage(text.aiSummaryRequiresModule);
      return;
    }

    if (selectedModuleContentCount === 0) {
      setAiStatus('error');
      setAiErrorMessage(text.aiSummaryRequiresChildren);
      return;
    }

    setAiStatus('generating');
    setAiErrorMessage(undefined);
    setAiFieldEditResult(undefined);
    setAiModuleSummaryResult(undefined);
    setAiGameSummaryResult(undefined);

    try {
      const result = await window.gameContextManager.generateAiModuleSummary({
        workspaceId,
        moduleId: selectedModule.id,
        locale: language
      });

      setAiModuleSummaryResult(result);
      setAiStatus('idle');
    } catch (error) {
      setAiStatus('error');
      setAiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleConfirmAiModuleSummary(): Promise<void> {
    if (!aiModuleSummaryResult || !selectedModule) {
      return;
    }

    setAiStatus('saving');
    setAiErrorMessage(undefined);

    const nextForm = {
      ...moduleForm
    };

    for (const field of aiModuleSummaryResult.fields) {
      nextForm[field.fieldName] = field.candidateValue;
    }

    setModuleForm(nextForm);
    const ok = await handleSaveModule(nextForm);

    if (ok) {
      setAiModuleSummaryResult(undefined);
      setAiStatus('idle');
      return;
    }

    setAiStatus('error');
    setAiErrorMessage(text.aiConfirmError);
  }

  function handleCancelAiModuleSummary(): void {
    setAiModuleSummaryResult(undefined);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  async function handleGenerateAiGameSummary(): Promise<void> {
    if (!apiConfig?.enabled) {
      setAiStatus('error');
      setAiErrorMessage(text.aiDisabledMessage);
      return;
    }

    if (!workspaceId || !game || activeNodeKind !== 'game') {
      setAiStatus('error');
      setAiErrorMessage(text.aiGameSummaryRequiresGame);
      return;
    }

    if (gameModuleCount === 0) {
      setAiStatus('error');
      setAiErrorMessage(text.aiGameSummaryRequiresModules);
      return;
    }

    setAiStatus('generating');
    setAiErrorMessage(undefined);
    setAiFieldEditResult(undefined);
    setAiModuleSummaryResult(undefined);
    setAiGameSummaryResult(undefined);

    try {
      const result = await window.gameContextManager.generateAiGameSummary({
        workspaceId,
        locale: language
      });

      setAiGameSummaryResult(result);
      setAiStatus('idle');
    } catch (error) {
      setAiStatus('error');
      setAiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleConfirmAiGameSummary(): Promise<void> {
    if (!aiGameSummaryResult || !game) {
      return;
    }

    setAiStatus('saving');
    setAiErrorMessage(undefined);

    const nextForm = {
      ...gameForm
    };

    for (const field of aiGameSummaryResult.fields) {
      nextForm[field.fieldName] = field.candidateValue;
    }

    setGameForm(nextForm);
    const ok = await handleSaveGame(nextForm);

    if (ok) {
      setAiGameSummaryResult(undefined);
      setAiStatus('idle');
      return;
    }

    setAiStatus('error');
    setAiErrorMessage(text.aiConfirmError);
  }

  function handleCancelAiGameSummary(): void {
    setAiGameSummaryResult(undefined);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  async function handleSaveApiConfig(): Promise<void> {
    setApiLastAction('save');

    if (!apiForm.baseUrl.trim()) {
      setApiStatus('error');
      setApiErrorMessage(text.apiBaseUrlRequired);
      return;
    }

    if (!apiForm.modelName.trim()) {
      setApiStatus('error');
      setApiErrorMessage(text.apiModelRequired);
      return;
    }

    setApiStatus('saving');
    setApiErrorMessage(undefined);
    setApiTestResult(undefined);

    try {
      const state = await window.gameContextManager.saveApiConfig({
        baseUrl: apiForm.baseUrl,
        apiKey: apiForm.apiKey,
        modelName: apiForm.modelName,
        enabled: apiForm.enabled
      });

      applyApiConfigState(state);
      setApiStatus('idle');
    } catch (error) {
      setApiStatus('error');
      setApiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleTestApiConnection(): Promise<void> {
    setApiLastAction('test');

    if (!apiForm.baseUrl.trim()) {
      setApiStatus('error');
      setApiErrorMessage(text.apiBaseUrlRequired);
      return;
    }

    if (!apiForm.modelName.trim()) {
      setApiStatus('error');
      setApiErrorMessage(text.apiModelRequired);
      return;
    }

    setApiStatus('testing');
    setApiErrorMessage(undefined);
    setApiTestResult(undefined);

    try {
      const result = await window.gameContextManager.testApiConnection({
        baseUrl: apiForm.baseUrl,
        apiKey: apiForm.apiKey,
        modelName: apiForm.modelName,
        enabled: apiForm.enabled
      });

      setApiTestResult(result);
      setApiStatus('idle');
    } catch (error) {
      setApiStatus('error');
      setApiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectModule(moduleId: string): Promise<void> {
    if (!workspaceId) {
      return;
    }

    if (!moduleId) {
      setSelectedModule(undefined);
      setModuleForm(initialModuleForm);
      setModuleMarkdownPreview('');
      setContents([]);
      setSelectedContent(undefined);
      setContentForm(initialContentForm);
      setContentMarkdownPreview('');
      setActiveNodeKind('game');
      return;
    }

    await loadModuleState(workspaceId, moduleId);
    await loadContentState(workspaceId, undefined, moduleId);
    setActiveNodeKind('module');
  }

  async function handleSaveModule(nextForm = moduleForm): Promise<boolean> {
    if (!workspaceId || !currentUser) {
      setModuleStatus('error');
      setModuleErrorMessage(text.moduleRequiresUser);
      return false;
    }

    if (!game) {
      setModuleStatus('error');
      setModuleErrorMessage(text.moduleRequiresGame);
      return false;
    }

    if (!nextForm.moduleName.trim()) {
      setModuleStatus('error');
      setModuleErrorMessage(text.moduleNameRequired);
      return false;
    }

    setModuleStatus('saving');
    setModuleErrorMessage(undefined);

    try {
      const input = {
        workspaceId,
        id: selectedModule ? selectedModule.id : nextForm.id,
        moduleName: nextForm.moduleName,
        modulePositioning: nextForm.modulePositioning,
        systemRules: nextForm.systemRules,
        resourceFlow: nextForm.resourceFlow,
        imageIds: nextForm.imageIds,
        playerMainActions: nextForm.playerMainActions,
        subjectiveFun: nextForm.subjectiveFun,
        subjectiveProblems: nextForm.subjectiveProblems,
        subjectiveOptimizationDirections: nextForm.subjectiveOptimizationDirections
      };
      const state = selectedModule
        ? await window.gameContextManager.updateModuleNode(input)
        : await window.gameContextManager.createModuleNode(input);

      applyModuleState(state);
      await loadContentState(workspaceId, undefined, state.selectedModule?.id);
      setActiveNodeKind('module');
      setModuleStatus('idle');
      return true;
    } catch (error) {
      setModuleStatus('error');
      setModuleErrorMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async function handleDeleteModule(): Promise<void> {
    if (!workspaceId || !selectedModule) {
      return;
    }

    if (!window.confirm(text.confirmDeleteModule)) {
      return;
    }

    setModuleStatus('deleting');
    setModuleErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.deleteModuleNode({
        workspaceId,
        id: selectedModule.id
      });

      applyModuleState(state);
      await loadContentState(workspaceId);
      await loadImageState(workspaceId);
      setActiveNodeKind(state.selectedModule ? 'module' : 'game');
      setModuleStatus('idle');
    } catch (error) {
      setModuleStatus('error');
      setModuleErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectContent(contentId: string): Promise<void> {
    if (!workspaceId || !selectedModule) {
      return;
    }

    if (!contentId) {
      setSelectedContent(undefined);
      setContentForm(initialContentForm);
      setContentMarkdownPreview('');
      setActiveNodeKind(selectedModule ? 'module' : 'game');
      return;
    }

    await loadContentState(workspaceId, contentId, selectedModule.id);
    setActiveNodeKind('content');
  }

  async function handleSaveContent(nextForm = contentForm): Promise<boolean> {
    if (!workspaceId || !currentUser) {
      setContentStatus('error');
      setContentErrorMessage(text.contentRequiresUser);
      return false;
    }

    if (!selectedModule) {
      setContentStatus('error');
      setContentErrorMessage(text.contentRequiresModule);
      return false;
    }

    if (!nextForm.title.trim()) {
      setContentStatus('error');
      setContentErrorMessage(text.contentTitleRequired);
      return false;
    }

    setContentStatus('saving');
    setContentErrorMessage(undefined);

    try {
      const input = {
        workspaceId,
        id: selectedContent ? selectedContent.id : nextForm.id,
        moduleId: selectedModule.id,
        title: nextForm.title,
        imageIds: nextForm.imageIds,
        accountDay: nextForm.accountDay,
        cumulativePaymentAmount: nextForm.cumulativePaymentAmount,
        maxMainlineProgress: nextForm.maxMainlineProgress,
        characterLevel: nextForm.characterLevel,
        processDescription: nextForm.processDescription,
        subjectiveFun: nextForm.subjectiveFun,
        subjectiveKnownProblems: nextForm.subjectiveKnownProblems,
        subjectiveOptimizationDirections: nextForm.subjectiveOptimizationDirections
      };
      const state = selectedContent
        ? await window.gameContextManager.updateContentNode(input)
        : await window.gameContextManager.createContentNode(input);

      applyContentState(state);
      setActiveNodeKind('content');
      setContentStatus('idle');
      return true;
    } catch (error) {
      setContentStatus('error');
      setContentErrorMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async function handleDeleteContent(): Promise<void> {
    if (!workspaceId || !selectedContent) {
      return;
    }

    if (!window.confirm(text.confirmDeleteContent)) {
      return;
    }

    setContentStatus('deleting');
    setContentErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.deleteContentNode({
        workspaceId,
        id: selectedContent.id
      });

      applyContentState(state);
      await loadImageState(workspaceId);
      setActiveNodeKind(state.selectedContent ? 'content' : 'module');
      setContentStatus('idle');
    } catch (error) {
      setContentStatus('error');
      setContentErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDeleteImage(image: ImageAssetView): Promise<void> {
    if (!workspaceId) {
      return;
    }

    const linkedNodes = image.linkedNodes ?? [];
    const referenceSummary = linkedNodes.map((reference) => `${reference.nodeType}:${reference.nodeId} ${reference.displayName}`).join('\n');
    const confirmationMessage =
      linkedNodes.length > 0
        ? `${text.confirmDeleteReferencedImage}\n${referenceSummary}\n\n${text.confirmDeleteImage}`
        : text.confirmDeleteImage;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setImageStatus('deleting');
    setImageErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.deleteImageAsset({
        workspaceId,
        id: image.id
      });

      applyImageState(state);
      await loadGameState(workspaceId);
      await loadModuleState(workspaceId, selectedModule?.id);
      await loadContentState(workspaceId, selectedContent?.id, selectedModule?.id);
      setImageStatus('idle');
    } catch (error) {
      setImageStatus('error');
      setImageErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 text-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{text.appName}</h1>
          <p className="truncate text-xs text-slate-500">{text.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill label={text.workspace} value={hasWorkspace ? text.selectedWorkspace : text.noWorkspace} tone={hasWorkspace ? 'ready' : 'muted'} />
          <StatusPill label={text.currentUser} value={currentUser?.displayName ?? text.noUser} tone={hasCurrentUser ? 'ready' : 'muted'} />
          <StatusPill label={text.apiStatus} value={apiStatusValue} tone={apiStatusTone} />
          <StatusPill label={text.exportStatus} value={text.exportIdle} tone="muted" />
          <button
            className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            type="button"
            onClick={() => setLanguage(nextLanguage)}
          >
            {text.switchLabel}
          </button>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[280px_minmax(420px,1fr)_340px]">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">{text.treeTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{text.treeHint}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-3 py-4">
            {hasWorkspace ? (
              <WorkspaceTree
                text={text}
                workspacePath={selectedWorkspacePath}
                hasCurrentUser={hasCurrentUser}
                game={game}
                modules={modules}
                selectedModule={selectedModule}
                contents={contents}
                selectedContent={selectedContent}
              />
            ) : (
              <EmptyTree text={text} />
            )}
          </div>

          <div className="border-t border-slate-200 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">{text.imageLibrary}</p>
              {images.length > 0 ? (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {images.length} {text.imageCount}
                </span>
              ) : null}
            </div>
            <p className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              {images[0]?.displayName ?? text.imageLibraryPlaceholder}
            </p>
          </div>
        </aside>

        <section className="min-h-0 overflow-auto px-6 py-5">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-cyan-700">
                  {hasWorkspace ? (workspaceLastAction === 'import' ? text.workspaceImported : text.workspaceReady) : text.noWorkspace}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {hasWorkspace ? text.detailTitleReady : text.detailTitleEmpty}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {hasWorkspace ? text.detailSubtitleReady : text.detailSubtitleEmpty}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  type="button"
                  disabled={workspaceStatus === 'creating' || workspaceStatus === 'importing'}
                  onClick={() => {
                    void handleImportWorkspace();
                  }}
                >
                  {workspaceStatus === 'importing' ? text.importingWorkspace : text.importWorkspace}
                </button>
                <button
                  className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="button"
                  disabled={workspaceStatus === 'creating' || workspaceStatus === 'importing'}
                  onClick={() => {
                    void handleCreateWorkspace();
                  }}
                >
                  {workspaceStatus === 'creating' ? text.creatingWorkspace : text.createWorkspace}
                </button>
              </div>
            </div>

            {workspaceStatus === 'canceled' ? (
              <Notice tone="muted" title={text.workspaceCanceled} />
            ) : null}

            {workspaceStatus === 'error' ? (
              <Notice
                tone="danger"
                title={workspaceLastAction === 'import' ? text.workspaceImportError : text.workspaceError}
                detail={errorMessage}
              />
            ) : null}

            <UserPanel
              text={text}
              users={users}
              currentUser={currentUser}
              displayName={userDisplayName}
              status={userStatus}
              errorMessage={userErrorMessage}
              onDisplayNameChange={setUserDisplayName}
              onCreateUser={() => {
                void handleCreateUser();
              }}
              onSelectUser={(userId) => {
                void handleSelectUser(userId);
              }}
            />

            <ApiConfigPanel
              text={text}
              config={apiConfig}
              form={apiForm}
              status={apiStatus}
              lastAction={apiLastAction}
              errorMessage={apiErrorMessage}
              testResult={apiTestResult}
              onFormChange={updateApiForm}
              onSave={() => {
                void handleSaveApiConfig();
              }}
              onTest={() => {
                void handleTestApiConnection();
              }}
            />

            {hasWorkspace ? (
              <>
                <WorkspaceSummary text={text} workspacePath={selectedWorkspacePath} createdPaths={createdPaths} />
                <GameNodePanel
                  text={text}
                  currentUser={currentUser}
                  game={game}
                  form={gameForm}
                  status={gameStatus}
                  errorMessage={gameErrorMessage}
                  onFormChange={updateGameForm}
                  onSave={() => {
                    void handleSaveGame();
                  }}
                />
                <ImageLibraryPanel
                  text={text}
                  currentUser={currentUser}
                  game={game}
                  images={images}
                  form={imageForm}
                  status={imageStatus}
                  errorMessage={imageErrorMessage}
                  onFormChange={(field, value) => {
                    setImageForm((current) => ({
                      ...current,
                      [field]: value
                    }));
                  }}
                  onUpload={() => {
                    void handleUploadImage();
                  }}
                  onDeleteImage={(image) => {
                    void handleDeleteImage(image);
                  }}
                />
                <ModuleNodePanel
                  text={text}
                  currentUser={currentUser}
                  game={game}
                  modules={modules}
                  selectedModule={selectedModule}
                  images={images}
                  form={moduleForm}
                  status={moduleStatus}
                  errorMessage={moduleErrorMessage}
                  onFormChange={updateModuleForm}
                  onSelectModule={(moduleId) => {
                    void handleSelectModule(moduleId);
                  }}
                  onNewModule={() => {
                    setSelectedModule(undefined);
                    setModuleForm(initialModuleForm);
                    setModuleMarkdownPreview('');
                    setModuleErrorMessage(undefined);
                    setModuleStatus('idle');
                    setActiveNodeKind('game');
                  }}
                  onSave={() => {
                    void handleSaveModule();
                  }}
                  onDelete={() => {
                    void handleDeleteModule();
                  }}
                />
                <ContentNodePanel
                  text={text}
                  currentUser={currentUser}
                  selectedModule={selectedModule}
                  contents={contents}
                  selectedContent={selectedContent}
                  images={images}
                  form={contentForm}
                  status={contentStatus}
                  errorMessage={contentErrorMessage}
                  onFormChange={updateContentForm}
                  onSelectContent={(contentId) => {
                    void handleSelectContent(contentId);
                  }}
                  onNewContent={() => {
                    setSelectedContent(undefined);
                    setContentForm(initialContentForm);
                    setContentMarkdownPreview('');
                    setContentErrorMessage(undefined);
                    setContentStatus('idle');
                    setActiveNodeKind(selectedModule ? 'module' : 'game');
                  }}
                  onSave={() => {
                    void handleSaveContent();
                  }}
                  onDelete={() => {
                    void handleDeleteContent();
                  }}
                />
              </>
            ) : (
              <EmptyDetail text={text} />
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-auto border-l border-slate-200 bg-white px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-800">{text.rightPanelTitle}</h2>
          <div className="mt-4 space-y-3">
            <ImagePreviewPanel
              title={text.imagesPanel}
              nodeTitle={activeNodeTitle}
              emptyText={activeImagesEmptyText}
              images={activeNodeImages}
            />
            <PreviewPanel
              title={text.previewPanel}
              nodeTitle={activeNodeTitle}
              emptyText={activePreviewEmptyText}
              markdownPreview={activeMarkdownPreview}
            />
            <AiAssistPanel
              text={text}
              config={apiConfig}
              testResult={apiTestResult}
              fields={aiEditableFields}
              selectedField={selectedAiField}
              form={aiAssistForm}
              status={aiStatus}
              errorMessage={aiErrorMessage}
              result={aiFieldEditResult}
              moduleSummaryResult={aiModuleSummaryResult}
              gameSummaryResult={aiGameSummaryResult}
              canSummarizeModule={Boolean(apiConfig?.enabled && selectedModule && activeNodeKind === 'module')}
              canSummarizeGame={Boolean(apiConfig?.enabled && game && activeNodeKind === 'game')}
              moduleContentCount={selectedModuleContentCount}
              gameModuleCount={gameModuleCount}
              onFormChange={updateAiAssistForm}
              onGenerate={() => {
                void handleGenerateAiFieldEdit();
              }}
              onConfirm={() => {
                void handleConfirmAiFieldEdit();
              }}
              onCancel={handleCancelAiFieldEdit}
              onGenerateModuleSummary={() => {
                void handleGenerateAiModuleSummary();
              }}
              onConfirmModuleSummary={() => {
                void handleConfirmAiModuleSummary();
              }}
              onCancelModuleSummary={handleCancelAiModuleSummary}
              onGenerateGameSummary={() => {
                void handleGenerateAiGameSummary();
              }}
              onConfirmGameSummary={() => {
                void handleConfirmAiGameSummary();
              }}
              onCancelGameSummary={handleCancelAiGameSummary}
            />
            <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-xs font-semibold text-slate-700">{text.generatedFilesTitle}</h3>
              <ul className="mt-3 space-y-1">
                {text.generatedFiles.map((filePath) => (
                  <li key={filePath} className="truncate font-mono text-xs text-slate-500" title={filePath}>
                    {filePath}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatusPill({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: 'muted' | 'ready';
}): React.JSX.Element {
  const toneClass =
    tone === 'ready'
      ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
      : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className={`hidden h-8 items-center gap-2 rounded-md border px-3 text-xs lg:flex ${toneClass}`}>
      <span className="font-medium">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EmptyTree({ text }: { text: (typeof copy)[Language] }): React.JSX.Element {
  return (
    <section className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-700">{text.emptyTreeTitle}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{text.emptyTreeDescription}</p>
    </section>
  );
}

function WorkspaceTree({
  text,
  workspacePath,
  hasCurrentUser,
  game,
  modules,
  selectedModule,
  contents,
  selectedContent
}: {
  text: (typeof copy)[Language];
  workspacePath: string;
  hasCurrentUser: boolean;
  game?: GameNode;
  modules: ModuleNode[];
  selectedModule?: ModuleNode;
  contents: ContentNode[];
  selectedContent?: ContentNode;
}): React.JSX.Element {
  return (
    <nav aria-label={text.treeTitle} className="space-y-3">
      <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2">
        <p className="text-xs font-semibold text-cyan-800">{text.workspaceTreeTitle}</p>
        <p className="mt-1 truncate text-xs text-cyan-700" title={workspacePath}>
          {workspacePath}
        </p>
      </div>

      <div className="space-y-1">
        <TreeRow
          depth={0}
          label={game?.gameName ?? (hasCurrentUser ? text.gameNodePlaceholder : text.gameNodeRequiresUser)}
          active={Boolean(game) || hasCurrentUser}
        />
        {modules.length > 0 ? (
          modules.map((module) => (
            <TreeRow key={module.id} depth={1} label={module.moduleName} active={selectedModule?.id === module.id} />
          ))
        ) : (
          <TreeRow depth={1} label={text.modulePlaceholder} />
        )}
        {contents.length > 0 ? (
          contents.map((content) => (
            <TreeRow key={content.id} depth={2} label={content.title} active={selectedContent?.id === content.id} />
          ))
        ) : (
          <TreeRow depth={2} label={text.contentPlaceholder} />
        )}
      </div>
    </nav>
  );
}

function ImageLibraryPanel({
  text,
  currentUser,
  game,
  images,
  form,
  status,
  errorMessage,
  onFormChange,
  onUpload,
  onDeleteImage
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  game?: GameNode;
  images: ImageAssetView[];
  form: ImageFormState;
  status: ImageStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof ImageFormState>(field: Field, value: ImageFormState[Field]) => void;
  onUpload: () => void;
  onDeleteImage: (image: ImageAssetView) => void;
}): React.JSX.Element {
  const isSaving = status === 'saving' || status === 'deleting';
  const canUpload = Boolean(currentUser && game) && !isSaving;

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.imageUploadTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {images.length} {text.imageCount}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{text.imageUploadPrompt}</p>
        </div>

        <button
          className="h-9 shrink-0 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={!canUpload}
          onClick={onUpload}
        >
          {isSaving ? text.uploadingImage : text.uploadImage}
        </button>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.imageRequiresUser} /> : null}
      {currentUser && !game ? <Notice tone="danger" title={text.imageRequiresGame} /> : null}
      {status === 'canceled' ? <Notice tone="muted" title={text.imageUploadCanceled} /> : null}
      {status === 'error' ? <Notice tone="danger" title={text.imageUploadError} detail={errorMessage} /> : null}

      <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
        <GameFieldInput
          label={text.imageNameLabel}
          value={form.displayName}
          placeholder={text.imageNamePlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('displayName', value)}
        />
        <GameFieldInput
          label={text.imageNotesLabel}
          value={form.notes}
          placeholder={text.imageNotesPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('notes', value)}
        />
      </div>

      {images.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {images.map((image) => (
            <ImageAssetCard key={image.id} text={text} image={image} isDeleting={status === 'deleting'} onDelete={onDeleteImage} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {text.imageEmpty}
        </p>
      )}
    </section>
  );
}

function ImageAssetCard({
  text,
  image,
  isDeleting,
  onDelete
}: {
  text: (typeof copy)[Language];
  image: ImageAssetView;
  isDeleting: boolean;
  onDelete: (image: ImageAssetView) => void;
}): React.JSX.Element {
  const linkedNodes = image.linkedNodes ?? [];

  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <div className="flex aspect-video items-center justify-center bg-slate-200">
        {image.previewDataUrl ? (
          <img className="h-full w-full object-contain" src={image.previewDataUrl} alt={image.displayName} />
        ) : (
          <span className="text-xs text-slate-500">{image.displayName}</span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <h4 className="truncate text-sm font-semibold text-slate-900" title={image.displayName}>
          {image.displayName}
        </h4>
        <ImageMetaLine label={text.imageIdLabel} value={image.id} />
        <ImageMetaLine label={text.imageOriginalFile} value={image.originalFileName} />
        <ImageMetaLine label={text.imageGeneratedPath} value={image.relativePath} />
        <div className="rounded-md border border-slate-200 bg-white p-2">
          <p className="text-xs font-semibold text-slate-600">{text.imageReferencesLabel}</p>
          {linkedNodes.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {linkedNodes.map((reference) => (
                <li key={`${reference.nodeType}:${reference.nodeId}`} className="truncate text-xs text-slate-600" title={`${reference.nodeType}:${reference.nodeId}`}>
                  {reference.nodeType}:{reference.displayName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">{text.imageNoReferences}</p>
          )}
        </div>
        {image.notes ? <p className="text-xs leading-5 text-slate-600">{image.notes}</p> : null}
        <button
          className="h-8 w-full rounded-md border border-red-200 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
          type="button"
          disabled={isDeleting}
          onClick={() => onDelete(image)}
        >
          {isDeleting ? text.deletingImage : text.deleteImage}
        </button>
      </div>
    </article>
  );
}

function ImageMetaLine({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <p className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-xs text-slate-500">
      <span>{label}</span>
      <span className="truncate font-mono text-slate-700" title={value}>
        {value}
      </span>
    </p>
  );
}

function ModuleNodePanel({
  text,
  currentUser,
  game,
  modules,
  selectedModule,
  images,
  form,
  status,
  errorMessage,
  onFormChange,
  onSelectModule,
  onNewModule,
  onSave,
  onDelete
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  game?: GameNode;
  modules: ModuleNode[];
  selectedModule?: ModuleNode;
  images: ImageAssetView[];
  form: ModuleFormState;
  status: ModuleStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof ModuleFormState>(field: Field, value: ModuleFormState[Field]) => void;
  onSelectModule: (moduleId: string) => void;
  onNewModule: () => void;
  onSave: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const isSaving = status === 'saving' || status === 'deleting';
  const canSave = Boolean(currentUser && game) && !isSaving;

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.modulePanelTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {selectedModule ? selectedModule.moduleName : text.newModule}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {selectedModule ? text.moduleEditPrompt : text.moduleCreatePrompt}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSaving}
            onClick={onNewModule}
          >
            {text.newModule}
          </button>
          {selectedModule ? (
            <button
              className="h-9 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={isSaving}
              onClick={onDelete}
            >
              {status === 'deleting' ? text.deletingModule : text.deleteModule}
            </button>
          ) : null}
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canSave}
            onClick={onSave}
          >
            {status === 'saving' ? text.savingModule : selectedModule ? text.saveModule : text.createModule}
          </button>
        </div>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.moduleRequiresUser} /> : null}
      {currentUser && !game ? <Notice tone="danger" title={text.moduleRequiresGame} /> : null}
      {status === 'error' ? (
        <Notice tone="danger" title={errorMessage?.includes('delete') ? text.moduleDeleteError : text.moduleSaveError} detail={errorMessage} />
      ) : null}

      {modules.length > 0 ? (
        <label className="mt-5 block border-t border-slate-200 pt-5 text-xs font-semibold text-slate-600">
          {text.selectModule}
          <select
            className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
            value={selectedModule?.id ?? ''}
            disabled={isSaving}
            onChange={(event) => onSelectModule(event.target.value)}
          >
            <option value="">{text.newModule}</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.moduleName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-500">{text.noModules}</p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {selectedModule ? (
          <LockedField label={text.moduleIdLabel} value={selectedModule.id} />
        ) : (
          <GameFieldInput
            label={text.moduleIdLabel}
            value={form.id}
            placeholder={text.moduleIdPlaceholder}
            disabled={isSaving}
            onChange={(value) => onFormChange('id', value)}
          />
        )}
        <GameFieldInput
          label={text.moduleNameLabel}
          value={form.moduleName}
          placeholder={text.moduleNamePlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('moduleName', value)}
        />
      </div>

      <div className="mt-4 grid gap-4">
        <GameTextArea
          label={text.modulePositioningLabel}
          value={form.modulePositioning}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('modulePositioning', value)}
        />
        <GameTextArea
          label={text.systemRulesLabel}
          value={form.systemRules}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('systemRules', value)}
        />
        <GameTextArea
          label={text.resourceFlowLabel}
          value={form.resourceFlow}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('resourceFlow', value)}
        />
      </div>

      <fieldset className="mt-5 rounded-md border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold text-slate-600">{text.linkedImagesLabel}</legend>
        {images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((image) => {
              const checked = form.imageIds.includes(image.id);

              return (
                <label key={image.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={checked}
                    disabled={isSaving}
                    onChange={(event) => {
                      const nextImageIds = event.target.checked
                        ? [...form.imageIds, image.id]
                        : form.imageIds.filter((imageId) => imageId !== image.id);
                      onFormChange('imageIds', nextImageIds);
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800" title={image.displayName}>
                      {image.displayName}
                    </span>
                    <span className="block truncate font-mono text-xs text-slate-500" title={image.id}>
                      {image.id}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{text.noImagesForLink}</p>
        )}
      </fieldset>

      <div className="mt-4 grid gap-4">
        <GameTextArea
          label={text.playerMainActionsLabel}
          value={form.playerMainActions}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('playerMainActions', value)}
        />
        <GameTextArea
          label={text.subjectiveFunLabel}
          value={form.subjectiveFun}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('subjectiveFun', value)}
        />
        <GameTextArea
          label={text.subjectiveProblemsLabel}
          value={form.subjectiveProblems}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('subjectiveProblems', value)}
        />
        <GameTextArea
          label={text.subjectiveOptimizationDirectionsLabel}
          value={form.subjectiveOptimizationDirections}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('subjectiveOptimizationDirections', value)}
        />
      </div>

      {selectedModule ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.lockedFieldsTitle}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LockedField label={text.gameIdLabel} value={selectedModule.gameId} />
            <LockedField label={text.gameVersionLabel} value={selectedModule.gameVersion} />
            <LockedField label={text.creatorIdLabel} value={selectedModule.creatorId} />
            <LockedField label={text.lastEditorIdLabel} value={selectedModule.lastEditorId} />
            <LockedField label={text.createdAtLabel} value={selectedModule.createdAt} />
            <LockedField label={text.updatedAtLabel} value={selectedModule.updatedAt} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ContentNodePanel({
  text,
  currentUser,
  selectedModule,
  contents,
  selectedContent,
  images,
  form,
  status,
  errorMessage,
  onFormChange,
  onSelectContent,
  onNewContent,
  onSave,
  onDelete
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  selectedModule?: ModuleNode;
  contents: ContentNode[];
  selectedContent?: ContentNode;
  images: ImageAssetView[];
  form: ContentFormState;
  status: ContentStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof ContentFormState>(field: Field, value: ContentFormState[Field]) => void;
  onSelectContent: (contentId: string) => void;
  onNewContent: () => void;
  onSave: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const isSaving = status === 'saving' || status === 'deleting';
  const canSave = Boolean(currentUser && selectedModule) && !isSaving;

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.contentPanelTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {selectedContent ? selectedContent.title : text.newContent}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {selectedContent ? text.contentEditPrompt : text.contentCreatePrompt}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSaving}
            onClick={onNewContent}
          >
            {text.newContent}
          </button>
          {selectedContent ? (
            <button
              className="h-9 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={isSaving}
              onClick={onDelete}
            >
              {status === 'deleting' ? text.deletingContent : text.deleteContent}
            </button>
          ) : null}
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canSave}
            onClick={onSave}
          >
            {isSaving ? text.savingContent : selectedContent ? text.saveContent : text.createContent}
          </button>
        </div>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.contentRequiresUser} /> : null}
      {currentUser && !selectedModule ? <Notice tone="danger" title={text.contentRequiresModule} /> : null}
      {status === 'error' ? (
        <Notice tone="danger" title={errorMessage?.includes('delete') ? text.contentDeleteError : text.contentSaveError} detail={errorMessage} />
      ) : null}

      {contents.length > 0 ? (
        <label className="mt-5 block border-t border-slate-200 pt-5 text-xs font-semibold text-slate-600">
          {text.selectContent}
          <select
            className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
            value={selectedContent?.id ?? ''}
            disabled={isSaving}
            onChange={(event) => onSelectContent(event.target.value)}
          >
            <option value="">{text.newContent}</option>
            {contents.map((content) => (
              <option key={content.id} value={content.id}>
                {content.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-500">{text.noContents}</p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {selectedContent ? (
          <LockedField label={text.contentIdLabel} value={selectedContent.id} />
        ) : (
          <GameFieldInput
            label={text.contentIdLabel}
            value={form.id}
            placeholder={text.contentIdPlaceholder}
            disabled={isSaving}
            onChange={(value) => onFormChange('id', value)}
          />
        )}
        <GameFieldInput
          label={text.contentTitleLabel}
          value={form.title}
          placeholder={text.contentTitlePlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('title', value)}
        />
      </div>

      <fieldset className="mt-5 rounded-md border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold text-slate-600">{text.accountStatusLabel}</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <GameFieldInput
            label={text.accountDayLabel}
            value={form.accountDay}
            placeholder={text.optionalFieldPlaceholder}
            disabled={isSaving}
            onChange={(value) => onFormChange('accountDay', value)}
          />
          <GameFieldInput
            label={text.cumulativePaymentAmountLabel}
            value={form.cumulativePaymentAmount}
            placeholder={text.optionalFieldPlaceholder}
            disabled={isSaving}
            onChange={(value) => onFormChange('cumulativePaymentAmount', value)}
          />
          <GameFieldInput
            label={text.maxMainlineProgressLabel}
            value={form.maxMainlineProgress}
            placeholder={text.optionalFieldPlaceholder}
            disabled={isSaving}
            onChange={(value) => onFormChange('maxMainlineProgress', value)}
          />
          <GameFieldInput
            label={text.characterLevelLabel}
            value={form.characterLevel}
            placeholder={text.optionalFieldPlaceholder}
            disabled={isSaving}
            onChange={(value) => onFormChange('characterLevel', value)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-5 rounded-md border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold text-slate-600">{text.linkedImagesLabel}</legend>
        {images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((image) => {
              const checked = form.imageIds.includes(image.id);

              return (
                <label key={image.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={checked}
                    disabled={isSaving}
                    onChange={(event) => {
                      const nextImageIds = event.target.checked
                        ? [...form.imageIds, image.id]
                        : form.imageIds.filter((imageId) => imageId !== image.id);
                      onFormChange('imageIds', nextImageIds);
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800" title={image.displayName}>
                      {image.displayName}
                    </span>
                    <span className="block truncate font-mono text-xs text-slate-500" title={image.id}>
                      {image.id}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{text.noImagesForLink}</p>
        )}
      </fieldset>

      <div className="mt-4 grid gap-4">
        <GameTextArea
          label={text.processDescriptionLabel}
          value={form.processDescription}
          placeholder={text.processDescriptionPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('processDescription', value)}
        />
        <GameTextArea
          label={text.subjectiveFunLabel}
          value={form.subjectiveFun}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('subjectiveFun', value)}
        />
        <GameTextArea
          label={text.subjectiveKnownProblemsLabel}
          value={form.subjectiveKnownProblems}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('subjectiveKnownProblems', value)}
        />
        <GameTextArea
          label={text.subjectiveOptimizationDirectionsLabel}
          value={form.subjectiveOptimizationDirections}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('subjectiveOptimizationDirections', value)}
        />
      </div>

      {selectedContent ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.lockedFieldsTitle}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LockedField label={text.moduleIdLabel} value={selectedContent.moduleId} />
            <LockedField label={text.gameIdLabel} value={selectedContent.gameId} />
            <LockedField label={text.gameVersionLabel} value={selectedContent.gameVersion} />
            <LockedField label={text.creatorIdLabel} value={selectedContent.creatorId} />
            <LockedField label={text.lastEditorIdLabel} value={selectedContent.lastEditorId} />
            <LockedField label={text.createdAtLabel} value={selectedContent.createdAt} />
            <LockedField label={text.updatedAtLabel} value={selectedContent.updatedAt} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GameNodePanel({
  text,
  currentUser,
  game,
  form,
  status,
  errorMessage,
  onFormChange,
  onSave
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  game?: GameNode;
  form: GameFormState;
  status: GameStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof GameFormState>(field: Field, value: GameFormState[Field]) => void;
  onSave: () => void;
}): React.JSX.Element {
  const isSaving = status === 'saving';
  const canSave = Boolean(currentUser) && !isSaving;

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.createGameTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {game ? game.gameName : text.gameNodePlaceholder}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {game ? text.editGamePrompt : text.createGamePrompt}
          </p>
        </div>

        <button
          className="h-9 shrink-0 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={!canSave}
          onClick={onSave}
        >
          {isSaving ? text.savingGame : game ? text.saveGame : text.createGame}
        </button>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.gameNodeRequiresUser} /> : null}
      {status === 'error' ? <Notice tone="danger" title={text.gameSaveError} detail={errorMessage} /> : null}

      <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
        {game ? (
          <LockedField label={text.gameIdLabel} value={game.id} />
        ) : (
          <GameFieldInput
            label={text.gameIdLabel}
            value={form.id}
            placeholder={text.gameIdPlaceholder}
            disabled={isSaving}
            onChange={(value) => onFormChange('id', value)}
          />
        )}
        <GameFieldInput
          label={text.gameNameLabel}
          value={form.gameName}
          placeholder={text.gameNamePlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('gameName', value)}
        />
        <GameFieldInput
          label={text.gameVersionLabel}
          value={form.gameVersion}
          placeholder={text.gameVersionPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('gameVersion', value)}
        />
        <label className="text-xs font-semibold text-slate-600">
          {text.projectStageLabel}
          <select
            className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
            value={form.projectStage}
            disabled={isSaving}
            onChange={(event) => onFormChange('projectStage', event.target.value as ProjectStage)}
          >
            {Object.values(ProjectStage).map((stage) => (
              <option key={stage} value={stage}>
                {PROJECT_STAGE_LABELS[stage].zh} / {PROJECT_STAGE_LABELS[stage].en}
              </option>
            ))}
          </select>
        </label>
        <GameFieldInput
          label={text.gameGenreLabel}
          value={form.gameGenre}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('gameGenre', value)}
        />
        <GameFieldInput
          label={text.coverImageIdLabel}
          value={form.coverImageId}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('coverImageId', value)}
        />
      </div>

      <div className="mt-4 grid gap-4">
        <GameTextArea
          label={text.coreGameplayLabel}
          value={form.coreGameplay}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('coreGameplay', value)}
        />
        <GameTextArea
          label={text.mainFunLabel}
          value={form.mainFun}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('mainFun', value)}
        />
        <GameTextArea
          label={text.targetUsersLabel}
          value={form.targetUsers}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('targetUsers', value)}
        />
        <GameTextArea
          label={text.currentOperationGoalLabel}
          value={form.currentOperationGoal}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('currentOperationGoal', value)}
        />
        <GameTextArea
          label={text.currentMainProblemsLabel}
          value={form.currentMainProblems}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('currentMainProblems', value)}
        />
        <GameTextArea
          label={text.mainOptimizationDirectionsLabel}
          value={form.mainOptimizationDirections}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('mainOptimizationDirections', value)}
        />
        <GameTextArea
          label={text.notesLabel}
          value={form.notes}
          placeholder={text.optionalFieldPlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('notes', value)}
        />
      </div>

      {game ? (
        <div className="mt-5 border-t border-slate-200 pt-5">
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.lockedFieldsTitle}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LockedField label={text.creatorIdLabel} value={game.creatorId} />
            <LockedField label={text.lastEditorIdLabel} value={game.lastEditorId} />
            <LockedField label={text.createdAtLabel} value={game.createdAt} />
            <LockedField label={text.updatedAtLabel} value={game.updatedAt} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GameFieldInput({
  label,
  value,
  placeholder,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <input
        className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function GameTextArea({
  label,
  value,
  placeholder,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <textarea
        className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LockedField({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-700">{value}</p>
    </div>
  );
}

function UserPanel({
  text,
  users,
  currentUser,
  displayName,
  status,
  errorMessage,
  onDisplayNameChange,
  onCreateUser,
  onSelectUser
}: {
  text: (typeof copy)[Language];
  users: LocalUser[];
  currentUser?: LocalUser;
  displayName: string;
  status: UserStatus;
  errorMessage?: string;
  onDisplayNameChange: (value: string) => void;
  onCreateUser: () => void;
  onSelectUser: (userId: string) => void;
}): React.JSX.Element {
  const isSaving = status === 'saving';
  const statusTitle = currentUser ? text.userReady : text.createUserPrompt;
  const errorTitle = errorMessage ?? (users.length === 0 ? text.userCreateError : text.userLoadError);

  return (
    <section className="mt-5 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.createUserTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">{statusTitle}</h3>
          {currentUser ? (
            <p className="mt-1 text-sm text-slate-600">{currentUser.displayName}</p>
          ) : (
            <p className="mt-1 text-sm text-amber-700">{text.createUserPrompt}</p>
          )}
        </div>

        {users.length > 0 ? (
          <label className="flex min-w-56 flex-col gap-2 text-xs font-semibold text-slate-600">
            {text.selectUserLabel}
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
              value={currentUser?.id ?? ''}
              disabled={isSaving}
              onChange={(event) => onSelectUser(event.target.value)}
            >
              {currentUser ? null : <option value="">{text.noUser}</option>}
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
          {text.displayNameLabel}
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600"
            value={displayName}
            placeholder={text.displayNamePlaceholder}
            disabled={isSaving}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onCreateUser();
              }
            }}
          />
        </label>
        <button
          className="h-9 shrink-0 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={isSaving}
          onClick={onCreateUser}
        >
          {isSaving ? text.creatingUser : text.createUser}
        </button>
      </div>

      {status === 'error' ? <Notice tone="danger" title={errorTitle} detail={errorMessage} /> : null}
    </section>
  );
}

function TreeRow({
  label,
  depth,
  active = false
}: {
  label: string;
  depth: 0 | 1 | 2;
  active?: boolean;
}): React.JSX.Element {
  const padding = depth === 0 ? 'pl-2' : depth === 1 ? 'pl-6' : 'pl-10';

  return (
    <div
      className={`flex h-9 items-center gap-2 rounded-md pr-2 text-sm ${padding} ${
        active ? 'bg-slate-900 text-white' : 'text-slate-500'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-cyan-300' : 'bg-slate-300'}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function EmptyDetail({ text }: { text: (typeof copy)[Language] }): React.JSX.Element {
  return (
    <section className="mt-6 rounded-md border border-dashed border-slate-300 bg-white p-6">
      <h3 className="text-base font-semibold text-slate-800">{text.emptyStateTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text.emptyStateDescription}</p>
      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase text-slate-500">{text.nextStepsTitle}</h4>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {text.nextSteps.map((step) => (
            <li key={step} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {step}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function WorkspaceSummary({
  text,
  workspacePath,
  createdPaths
}: {
  text: (typeof copy)[Language];
  workspacePath: string;
  createdPaths: string[];
}): React.JSX.Element {
  return (
    <section className="mt-6 rounded-md border border-cyan-200 bg-white p-5">
      <div>
        <p className="text-xs font-semibold uppercase text-cyan-700">{text.workspacePathLabel}</p>
        <p className="mt-2 break-all text-sm text-slate-700">{workspacePath}</p>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <p className="text-xs font-semibold uppercase text-cyan-700">{text.createdPathsLabel}</p>
        {createdPaths.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {createdPaths.map((path) => (
              <li key={path} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                {path}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{text.noNewPaths}</p>
        )}
      </div>
    </section>
  );
}

function ApiConfigPanel({
  text,
  config,
  form,
  status,
  lastAction,
  errorMessage,
  testResult,
  onFormChange,
  onSave,
  onTest
}: {
  text: (typeof copy)[Language];
  config?: ApiConfig;
  form: ApiFormState;
  status: ApiStatus;
  lastAction: ApiAction;
  errorMessage?: string;
  testResult?: ApiConnectionTestResult;
  onFormChange: <Field extends keyof ApiFormState>(field: Field, value: ApiFormState[Field]) => void;
  onSave: () => void;
  onTest: () => void;
}): React.JSX.Element {
  const isBusy = status === 'saving' || status === 'testing';

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">{text.apiConfigTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {config?.enabled ? text.apiEnabled : config ? text.apiConfiguredDisabled : text.apiNoConfig}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{text.apiConfigPrompt}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isBusy}
            onClick={onTest}
          >
            {status === 'testing' ? text.testingApiConnection : text.testApiConnection}
          </button>
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={isBusy}
            onClick={onSave}
          >
            {status === 'saving' ? text.savingApiConfig : text.saveApiConfig}
          </button>
        </div>
      </div>

      {status === 'error' ? <Notice tone="danger" title={lastAction === 'test' ? text.apiTestError : text.apiSaveError} detail={errorMessage} /> : null}
      {testResult?.ok ? (
        <Notice
          tone="muted"
          title={text.apiTestSuccess}
          detail={`${testResult.provider} / ${testResult.modelName ?? form.modelName} / ${testResult.checkedAt}`}
        />
      ) : null}

      <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
        <GameFieldInput
          label={text.apiBaseUrlLabel}
          value={form.baseUrl}
          placeholder={text.apiBaseUrlPlaceholder}
          disabled={isBusy}
          onChange={(value) => onFormChange('baseUrl', value)}
        />
        <GameFieldInput
          label={text.apiModelLabel}
          value={form.modelName}
          placeholder={text.apiModelPlaceholder}
          disabled={isBusy}
          onChange={(value) => onFormChange('modelName', value)}
        />
        <label className="text-xs font-semibold text-slate-600">
          {text.apiKeyLabel}
          <input
            className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600"
            type="password"
            value={form.apiKey}
            placeholder={text.apiKeyPlaceholder}
            disabled={isBusy}
            onChange={(event) => onFormChange('apiKey', event.target.value)}
          />
        </label>
        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.enabled}
            disabled={isBusy}
            onChange={(event) => onFormChange('enabled', event.target.checked)}
          />
          {text.apiEnabledLabel}
        </label>
      </div>
    </section>
  );
}

function AiAssistPanel({
  text,
  config,
  testResult,
  fields,
  selectedField,
  form,
  status,
  errorMessage,
  result,
  moduleSummaryResult,
  gameSummaryResult,
  canSummarizeModule,
  canSummarizeGame,
  moduleContentCount,
  gameModuleCount,
  onFormChange,
  onGenerate,
  onConfirm,
  onCancel,
  onGenerateModuleSummary,
  onConfirmModuleSummary,
  onCancelModuleSummary,
  onGenerateGameSummary,
  onConfirmGameSummary,
  onCancelGameSummary
}: {
  text: (typeof copy)[Language];
  config?: ApiConfig;
  testResult?: ApiConnectionTestResult;
  fields: AiEditableField[];
  selectedField?: AiEditableField;
  form: AiAssistFormState;
  status: AiStatus;
  errorMessage?: string;
  result?: AiFieldEditResult;
  moduleSummaryResult?: AiModuleSummaryResult;
  gameSummaryResult?: AiGameSummaryResult;
  canSummarizeModule: boolean;
  canSummarizeGame: boolean;
  moduleContentCount: number;
  gameModuleCount: number;
  onFormChange: <Field extends keyof AiAssistFormState>(field: Field, value: AiAssistFormState[Field]) => void;
  onGenerate: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onGenerateModuleSummary: () => void;
  onConfirmModuleSummary: () => void;
  onCancelModuleSummary: () => void;
  onGenerateGameSummary: () => void;
  onConfirmGameSummary: () => void;
  onCancelGameSummary: () => void;
}): React.JSX.Element {
  const isBusy = status === 'generating' || status === 'saving';
  const canGenerate = Boolean(config?.enabled && selectedField) && !isBusy;
  const selectedFieldKey = selectedField?.key ?? '';

  return (
    <section className="rounded-md border border-slate-200 p-3">
      <h3 className="text-xs font-semibold text-slate-700">{text.aiPanel}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{config?.enabled ? text.aiReady : text.aiEmpty}</p>
      {config ? (
        <div className="mt-3 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-2">
          <p className="truncate font-mono text-[11px] text-slate-600" title={config.baseUrl}>
            {config.baseUrl}
          </p>
          <p className="truncate font-mono text-[11px] text-slate-600" title={config.modelName}>
            {config.modelName}
          </p>
        </div>
      ) : null}
      {testResult?.ok ? (
        <p className="mt-2 text-xs text-cyan-700">
          {text.apiTestSuccess}: {testResult.provider}
        </p>
      ) : null}
      {fields.length > 0 ? (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <label className="block text-xs font-semibold text-slate-600">
            {text.aiFieldLabel}
            <select
              className="mt-2 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-normal text-slate-800 outline-none transition focus:border-cyan-600"
              value={selectedFieldKey}
              disabled={isBusy}
              onChange={(event) => onFormChange('fieldKey', event.target.value)}
            >
              {fields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.nodeTitle} / {field.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            {text.aiModeLabel}
            <select
              className="mt-2 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-normal text-slate-800 outline-none transition focus:border-cyan-600"
              value={form.mode}
              disabled={isBusy}
              onChange={(event) => onFormChange('mode', event.target.value as AiAssistFormState['mode'])}
            >
              {[AiEditMode.Add, AiEditMode.Modify, AiEditMode.Polish].map((mode) => (
                <option key={mode} value={mode}>
                  {AI_EDIT_MODE_LABELS[mode].zh} / {AI_EDIT_MODE_LABELS[mode].en}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            {text.aiInstructionLabel}
            <textarea
              className="mt-2 min-h-20 w-full resize-y rounded-md border border-slate-300 px-2 py-2 text-xs font-normal leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600"
              value={form.userInstruction}
              placeholder={text.aiInstructionPlaceholder}
              disabled={isBusy}
              onChange={(event) => onFormChange('userInstruction', event.target.value)}
            />
          </label>

          <button
            className="h-8 w-full rounded-md bg-cyan-700 px-3 text-xs font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            {status === 'generating' ? text.aiGenerating : text.aiGenerate}
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          {text.aiNodeRequired}
        </p>
      )}
      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">{text.aiSummaryTitle}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {canSummarizeModule ? text.aiSummaryReady : text.aiSummaryRequiresModule}
          </p>
          {canSummarizeModule ? (
            <p className="mt-1 text-xs text-slate-500">
              {text.aiSummaryContentCount}: {moduleContentCount}
            </p>
          ) : null}
        </div>
        <button
          className="h-8 w-full rounded-md border border-cyan-700 px-3 text-xs font-medium text-cyan-800 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          type="button"
          disabled={!canSummarizeModule || moduleContentCount === 0 || isBusy}
          onClick={onGenerateModuleSummary}
        >
          {status === 'generating' ? text.aiGenerating : text.aiSummarizeChildren}
        </button>
      </div>
      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">{text.aiGameSummaryTitle}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {canSummarizeGame ? text.aiGameSummaryReady : text.aiGameSummaryRequiresGame}
          </p>
          {canSummarizeGame ? (
            <p className="mt-1 text-xs text-slate-500">
              {text.aiGameSummaryModuleCount}: {gameModuleCount}
            </p>
          ) : null}
        </div>
        <button
          className="h-8 w-full rounded-md border border-cyan-700 px-3 text-xs font-medium text-cyan-800 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          type="button"
          disabled={!canSummarizeGame || gameModuleCount === 0 || isBusy}
          onClick={onGenerateGameSummary}
        >
          {status === 'generating' ? text.aiGenerating : text.aiSummarizeModules}
        </button>
      </div>
      {status === 'error' ? (
        <Notice
          tone="danger"
          title={errorMessage === text.aiConfirmError ? text.aiConfirmError : text.aiGenerateError}
          detail={errorMessage}
        />
      ) : null}
      {result ? (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <AiResultBlock title={text.aiOriginal} value={result.originalValue || text.aiNoCandidate} />
          <AiResultBlock title={text.aiCandidate} value={result.candidateValue || text.aiNoCandidate} />
          <AiResultBlock title={text.aiDiff} value={buildSimpleDiff(result.originalValue, result.candidateValue)} />
          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={isBusy}
              onClick={onCancel}
            >
              {text.aiCancel}
            </button>
            <button
              className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              disabled={isBusy}
              onClick={onConfirm}
            >
              {status === 'saving' ? text.aiSaving : text.aiConfirm}
            </button>
          </div>
        </div>
      ) : null}
      {moduleSummaryResult ? (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-700">
            {text.aiSummaryCandidate} / {moduleSummaryResult.moduleName}
          </p>
          {moduleSummaryResult.fields.map((field) => (
            <div key={field.fieldName} className="rounded-md border border-slate-200 p-2">
              <p className="text-xs font-semibold text-slate-700">{field.fieldLabel}</p>
              <AiResultBlock title={text.aiOriginal} value={field.originalValue || text.aiNoCandidate} />
              <AiResultBlock title={text.aiCandidate} value={field.candidateValue || text.aiNoCandidate} />
              <AiResultBlock title={text.aiDiff} value={buildSimpleDiff(field.originalValue, field.candidateValue)} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={isBusy}
              onClick={onCancelModuleSummary}
            >
              {text.aiCancel}
            </button>
            <button
              className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              disabled={isBusy}
              onClick={onConfirmModuleSummary}
            >
              {status === 'saving' ? text.aiSaving : text.aiConfirm}
            </button>
          </div>
        </div>
      ) : null}
      {gameSummaryResult ? (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-700">
            {text.aiSummaryCandidate} / {gameSummaryResult.gameName}
          </p>
          {gameSummaryResult.fields.map((field) => (
            <div key={field.fieldName} className="rounded-md border border-slate-200 p-2">
              <p className="text-xs font-semibold text-slate-700">{field.fieldLabel}</p>
              <AiResultBlock title={text.aiOriginal} value={field.originalValue || text.aiNoCandidate} />
              <AiResultBlock title={text.aiCandidate} value={field.candidateValue || text.aiNoCandidate} />
              <AiResultBlock title={text.aiDiff} value={buildSimpleDiff(field.originalValue, field.candidateValue)} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={isBusy}
              onClick={onCancelGameSummary}
            >
              {text.aiCancel}
            </button>
            <button
              className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              disabled={isBusy}
              onClick={onConfirmGameSummary}
            >
              {status === 'saving' ? text.aiSaving : text.aiConfirm}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AiResultBlock({ title, value }: { title: string; value: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600">{title}</p>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-2 font-mono text-[11px] leading-5 text-slate-700">
        {value}
      </pre>
    </div>
  );
}

function PlaceholderPanel({
  title,
  body
}: {
  title: string;
  body: string;
}): React.JSX.Element {
  return (
    <section className="rounded-md border border-slate-200 p-3">
      <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
    </section>
  );
}

function ImagePreviewPanel({
  title,
  nodeTitle,
  emptyText,
  images
}: {
  title: string;
  nodeTitle?: string;
  emptyText: string;
  images: ImageAssetView[];
}): React.JSX.Element {
  return (
    <section className="rounded-md border border-slate-200 p-3">
      <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      {nodeTitle ? (
        <p className="mt-1 truncate text-xs text-slate-500" title={nodeTitle}>
          {nodeTitle}
        </p>
      ) : null}
      {images.length > 0 ? (
        <div className="mt-2 grid max-h-[420px] gap-2 overflow-auto pr-1">
          {images.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {image.previewDataUrl ? (
                <img className="aspect-video w-full object-contain" src={image.previewDataUrl} alt={image.displayName} />
              ) : null}
              <div className="px-2 py-1.5">
                <p className="truncate text-xs font-medium text-slate-700" title={image.displayName}>
                  {image.displayName}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-500" title={image.id}>
                  @{image.id}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={image.relativePath}>
                  {image.relativePath}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-500">{emptyText}</p>
      )}
    </section>
  );
}

function PreviewPanel({
  title,
  nodeTitle,
  emptyText,
  markdownPreview
}: {
  title: string;
  nodeTitle?: string;
  emptyText: string;
  markdownPreview: string;
}): React.JSX.Element {
  return (
    <section className="rounded-md border border-slate-200 p-3">
      <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      {nodeTitle ? (
        <p className="mt-1 truncate text-xs text-slate-500" title={nodeTitle}>
          {nodeTitle}
        </p>
      ) : null}
      {markdownPreview ? (
        <pre className="mt-2 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">
          {markdownPreview}
        </pre>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-500">{emptyText}</p>
      )}
    </section>
  );
}

function Notice({
  title,
  detail,
  tone
}: {
  title: string;
  detail?: string;
  tone: 'muted' | 'danger';
}): React.JSX.Element {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-slate-200 bg-white text-slate-700';

  return (
    <section className={`mt-5 rounded-md border px-4 py-3 text-sm ${toneClass}`}>
      <p className="font-medium">{title}</p>
      {detail ? <p className="mt-1 break-all">{detail}</p> : null}
    </section>
  );
}

function buildAiEditableFields({
  text,
  activeNodeKind,
  game,
  gameForm,
  selectedModule,
  moduleForm,
  selectedContent,
  contentForm
}: {
  text: (typeof copy)[Language];
  activeNodeKind: ActiveNodeKind;
  game?: GameNode;
  gameForm: GameFormState;
  selectedModule?: ModuleNode;
  moduleForm: ModuleFormState;
  selectedContent?: ContentNode;
  contentForm: ContentFormState;
}): AiEditableField[] {
  if (activeNodeKind === 'content' && selectedContent) {
    return [
      createAiEditableField('content', NodeType.Content, selectedContent.id, 'title', text.contentTitleLabel, contentForm.title, selectedContent.title),
      createAiEditableField('content', NodeType.Content, selectedContent.id, 'accountDay', text.accountDayLabel, contentForm.accountDay, selectedContent.title),
      createAiEditableField(
        'content',
        NodeType.Content,
        selectedContent.id,
        'cumulativePaymentAmount',
        text.cumulativePaymentAmountLabel,
        contentForm.cumulativePaymentAmount,
        selectedContent.title
      ),
      createAiEditableField(
        'content',
        NodeType.Content,
        selectedContent.id,
        'maxMainlineProgress',
        text.maxMainlineProgressLabel,
        contentForm.maxMainlineProgress,
        selectedContent.title
      ),
      createAiEditableField(
        'content',
        NodeType.Content,
        selectedContent.id,
        'characterLevel',
        text.characterLevelLabel,
        contentForm.characterLevel,
        selectedContent.title
      ),
      createAiEditableField(
        'content',
        NodeType.Content,
        selectedContent.id,
        'processDescription',
        text.processDescriptionLabel,
        contentForm.processDescription,
        selectedContent.title
      ),
      createAiEditableField(
        'content',
        NodeType.Content,
        selectedContent.id,
        'subjectiveFun',
        text.subjectiveFunLabel,
        contentForm.subjectiveFun,
        selectedContent.title
      ),
      createAiEditableField(
        'content',
        NodeType.Content,
        selectedContent.id,
        'subjectiveKnownProblems',
        text.subjectiveKnownProblemsLabel,
        contentForm.subjectiveKnownProblems,
        selectedContent.title
      ),
      createAiEditableField(
        'content',
        NodeType.Content,
        selectedContent.id,
        'subjectiveOptimizationDirections',
        text.subjectiveOptimizationDirectionsLabel,
        contentForm.subjectiveOptimizationDirections,
        selectedContent.title
      )
    ];
  }

  if (activeNodeKind === 'module' && selectedModule) {
    return [
      createAiEditableField('module', NodeType.Module, selectedModule.id, 'moduleName', text.moduleNameLabel, moduleForm.moduleName, selectedModule.moduleName),
      createAiEditableField(
        'module',
        NodeType.Module,
        selectedModule.id,
        'modulePositioning',
        text.modulePositioningLabel,
        moduleForm.modulePositioning,
        selectedModule.moduleName
      ),
      createAiEditableField('module', NodeType.Module, selectedModule.id, 'systemRules', text.systemRulesLabel, moduleForm.systemRules, selectedModule.moduleName),
      createAiEditableField('module', NodeType.Module, selectedModule.id, 'resourceFlow', text.resourceFlowLabel, moduleForm.resourceFlow, selectedModule.moduleName),
      createAiEditableField(
        'module',
        NodeType.Module,
        selectedModule.id,
        'playerMainActions',
        text.playerMainActionsLabel,
        moduleForm.playerMainActions,
        selectedModule.moduleName
      ),
      createAiEditableField('module', NodeType.Module, selectedModule.id, 'subjectiveFun', text.subjectiveFunLabel, moduleForm.subjectiveFun, selectedModule.moduleName),
      createAiEditableField(
        'module',
        NodeType.Module,
        selectedModule.id,
        'subjectiveProblems',
        text.subjectiveProblemsLabel,
        moduleForm.subjectiveProblems,
        selectedModule.moduleName
      ),
      createAiEditableField(
        'module',
        NodeType.Module,
        selectedModule.id,
        'subjectiveOptimizationDirections',
        text.subjectiveOptimizationDirectionsLabel,
        moduleForm.subjectiveOptimizationDirections,
        selectedModule.moduleName
      )
    ];
  }

  if (!game) {
    return [];
  }

  return [
    createAiEditableField('game', NodeType.Game, game.id, 'gameName', text.gameNameLabel, gameForm.gameName, game.gameName),
    createAiEditableField('game', NodeType.Game, game.id, 'gameVersion', text.gameVersionLabel, gameForm.gameVersion, game.gameName),
    createAiEditableField('game', NodeType.Game, game.id, 'gameGenre', text.gameGenreLabel, gameForm.gameGenre, game.gameName),
    createAiEditableField('game', NodeType.Game, game.id, 'coreGameplay', text.coreGameplayLabel, gameForm.coreGameplay, game.gameName),
    createAiEditableField('game', NodeType.Game, game.id, 'mainFun', text.mainFunLabel, gameForm.mainFun, game.gameName),
    createAiEditableField('game', NodeType.Game, game.id, 'targetUsers', text.targetUsersLabel, gameForm.targetUsers, game.gameName),
    createAiEditableField(
      'game',
      NodeType.Game,
      game.id,
      'currentOperationGoal',
      text.currentOperationGoalLabel,
      gameForm.currentOperationGoal,
      game.gameName
    ),
    createAiEditableField(
      'game',
      NodeType.Game,
      game.id,
      'currentMainProblems',
      text.currentMainProblemsLabel,
      gameForm.currentMainProblems,
      game.gameName
    ),
    createAiEditableField(
      'game',
      NodeType.Game,
      game.id,
      'mainOptimizationDirections',
      text.mainOptimizationDirectionsLabel,
      gameForm.mainOptimizationDirections,
      game.gameName
    ),
    createAiEditableField('game', NodeType.Game, game.id, 'notes', text.notesLabel, gameForm.notes, game.gameName)
  ];
}

function createAiEditableField(
  nodeKind: AiEditableNodeKind,
  nodeType: NodeType,
  nodeId: string,
  fieldName: string,
  label: string,
  value: string,
  nodeTitle: string
): AiEditableField {
  return {
    key: `${nodeKind}:${nodeId}:${fieldName}`,
    nodeKind,
    nodeType,
    nodeId,
    fieldName,
    label,
    value,
    nodeTitle
  };
}

function buildAiNodeContext({
  game,
  selectedModule,
  selectedContent,
  selectedField
}: {
  game?: GameNode;
  selectedModule?: ModuleNode;
  selectedContent?: ContentNode;
  selectedField: AiEditableField;
}): string {
  const lines = [
    game ? `Game: ${game.gameName} (${game.id})` : undefined,
    game ? `Game version: ${game.gameVersion}` : undefined,
    selectedModule ? `Module: ${selectedModule.moduleName} (${selectedModule.id})` : undefined,
    selectedContent ? `Content: ${selectedContent.title} (${selectedContent.id})` : undefined,
    `Editing field: ${selectedField.label} (${selectedField.fieldName})`
  ];

  return lines.filter((line): line is string => Boolean(line)).join('\n');
}

function buildSimpleDiff(originalValue: string, candidateValue: string): string {
  if (originalValue === candidateValue) {
    return 'No changes.';
  }

  const originalLines = originalValue.split('\n');
  const candidateLines = candidateValue.split('\n');
  const lineCount = Math.max(originalLines.length, candidateLines.length);
  const diffLines: string[] = [];

  for (let index = 0; index < lineCount; index += 1) {
    const originalLine = originalLines[index];
    const candidateLine = candidateLines[index];

    if (originalLine === candidateLine) {
      diffLines.push(`  ${originalLine ?? ''}`);
      continue;
    }

    if (originalLine !== undefined) {
      diffLines.push(`- ${originalLine}`);
    }

    if (candidateLine !== undefined) {
      diffLines.push(`+ ${candidateLine}`);
    }
  }

  return diffLines.join('\n');
}

function gameNodeToForm(game: GameNode): GameFormState {
  return {
    id: game.id,
    gameName: game.gameName,
    gameVersion: game.gameVersion,
    projectStage: game.projectStage,
    gameGenre: game.gameGenre ?? '',
    coreGameplay: game.coreGameplay ?? '',
    mainFun: game.mainFun ?? '',
    targetUsers: game.targetUsers ?? '',
    currentOperationGoal: game.currentOperationGoal ?? '',
    currentMainProblems: game.currentMainProblems ?? '',
    mainOptimizationDirections: game.mainOptimizationDirections ?? '',
    notes: game.notes ?? '',
    coverImageId: game.coverImageId ?? ''
  };
}

function moduleNodeToForm(module: ModuleNode): ModuleFormState {
  return {
    id: module.id,
    moduleName: module.moduleName,
    modulePositioning: module.modulePositioning ?? '',
    systemRules: module.systemRules ?? '',
    resourceFlow: module.resourceFlow ?? '',
    imageIds: module.imageIds,
    playerMainActions: module.playerMainActions ?? '',
    subjectiveFun: module.subjectiveFun ?? '',
    subjectiveProblems: module.subjectiveProblems ?? '',
    subjectiveOptimizationDirections: module.subjectiveOptimizationDirections ?? ''
  };
}

function contentNodeToForm(content: ContentNode): ContentFormState {
  return {
    id: content.id,
    title: content.title,
    imageIds: content.imageIds,
    accountDay: String(content.accountDay ?? ''),
    cumulativePaymentAmount: String(content.cumulativePaymentAmount ?? ''),
    maxMainlineProgress: content.maxMainlineProgress ?? '',
    characterLevel: content.characterLevel ?? '',
    processDescription: content.processDescription ?? '',
    subjectiveFun: content.subjectiveFun ?? '',
    subjectiveKnownProblems: content.subjectiveKnownProblems ?? '',
    subjectiveOptimizationDirections: content.subjectiveOptimizationDirections ?? ''
  };
}

function apiConfigToForm(config: ApiConfig): ApiFormState {
  return {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey ?? '',
    modelName: config.modelName,
    enabled: config.enabled
  };
}

export default App;
