import { useEffect, useRef, useState } from 'react';
import {
  AiEditMode,
  NodeType,
  ProjectStage,
  PROJECT_STAGE_LABELS,
  type AppLanguage,
  type ApiConfig,
  type ApiConnectionTestResult,
  type ContentNode,
  type GameNode,
  type ImageAssetView,
  type KnownWorkspaceIndexFileName,
  type KnownWorkspaceItem,
  type LocalUser,
  type ModuleNode,
  type UploadImageAssetSource,
  type WorkspaceImportSummary
} from '../../shared/index.js';

type Language = AppLanguage;
type WorkspaceStatus = 'idle' | 'creating' | 'importing' | 'refreshing' | 'ready' | 'canceled' | 'error';
type UserStatus = 'idle' | 'loading' | 'saving' | 'error';
type GameStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'error';
type ImageStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'canceled' | 'error';
type ModuleStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'error';
type ContentStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'error';
type ApiStatus = 'idle' | 'loading' | 'saving' | 'testing' | 'error';
type SettingsStatus = 'idle' | 'loading' | 'saving' | 'loggingOut' | 'error';
type ApiAction = 'save' | 'test';
type WorkspaceAction = 'create' | 'import' | 'refresh';
type AiStatus = 'idle' | 'generating' | 'saving' | 'error';
type ActiveNodeKind = 'game' | 'module' | 'content';
type AiEditableNodeKind = ActiveNodeKind;
type AiDialogKind = 'fieldEdit' | 'moduleSummary' | 'gameSummary';
type ActiveDetailKind = 'empty' | 'game' | 'module' | 'content' | 'imageLibrary' | 'image' | 'indexFile';
type ExportStatus = 'idle' | 'exportingAgentFiles' | 'exportingDirectoryIndex' | 'success' | 'error';
type CreateNodeKind = 'game' | 'module' | 'content';
type IndexFileStatus = 'idle' | 'deleting' | 'error';

interface TransientNoticeState {
  tone: 'muted' | 'danger';
  title: string;
  detail?: string;
}

interface IndexFileSelection {
  id: string;
  label: string;
  path?: string;
}

interface GameFormState {
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
  coverImageId: string;
}

interface ImageFormState {
  displayName: string;
  notes: string;
}

interface PendingImageUploadSource {
  source: UploadImageAssetSource;
  previewDataUrl: string;
  originalFileName: string;
}

interface LeftContextMenuState {
  x: number;
  y: number;
  target?: KnownWorkspaceItem;
  deleteTarget?: KnownWorkspaceItem;
}

interface ConfirmationDialogState {
  title: string;
  message: string;
  detailLines?: string[];
  confirmLabel: string;
  cancelLabel: string;
}

interface ModuleFormState {
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
}

interface AiAssistFormState {
  mode: AiEditMode.Add | AiEditMode.Modify | AiEditMode.Polish;
  selectedFieldKeys: string[];
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

interface AiCandidateField {
  key: string;
  fieldName: string;
  fieldLabel: string;
  originalValue: string;
  candidateValue: string;
}

interface CreateNodeDialogState {
  kind: CreateNodeKind;
  parentModuleId?: string;
  gameName: string;
  gameVersion: string;
  projectStage: ProjectStage;
  moduleName: string;
  contentTitle: string;
  errorMessage?: string;
}

const initialGameForm: GameFormState = {
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
  coverImageId: ''
};

const initialImageForm: ImageFormState = {
  displayName: '',
  notes: ''
};

const initialModuleForm: ModuleFormState = {
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
  modelName: 'mock-model'
};

const initialAiAssistForm: AiAssistFormState = {
  mode: AiEditMode.Add,
  selectedFieldKeys: [],
  userInstruction: ''
};

const initialCreateNodeDialog: CreateNodeDialogState = {
  kind: 'game',
  gameName: '',
  gameVersion: '',
  projectStage: ProjectStage.Testing,
  moduleName: '',
  contentTitle: ''
};

const copy = {
  zh: {
    appName: '游戏上下文管理器',
    subtitle: '游戏上下文管理器',
    settingsButton: '设置',
    settingsTitle: '设置',
    closeSettings: '关闭设置',
    importButton: '导入',
    leftTreeLabel: '节点与文件',
    chooseNodePrompt: '请选择一个节点来查看',
    createRootPlaceholder: '创建主节点',
    createModulePlaceholder: '创建模块节点',
    createContentPlaceholder: '创建内容节点',
    addChildNode: '新增下级节点',
    collapseTreeGroup: '折叠',
    expandTreeGroup: '展开',
    createDialogCancel: '取消',
    confirmDialogCancel: '取消',
    confirmDialogTitle: '确认删除',
    confirmDialogConfirm: '确认删除',
    contextDeleteAction: '删除',
    deleteUnavailable: '当前条目无法删除。',
    openInFolderAction: '在文件夹中打开',
    openInFolderError: '打开文件夹失败。',
    openInFolderUnavailable: '当前条目没有可打开的文件。',
    directoryIndexStaleHint: '删除节点后，请在使用前手动导出当前目录。',
    createDialogError: '创建节点失败。',
    createGameLocationHint: '点击创建后需要重新选择本地文件夹。所选文件夹是工作区根目录，AGENT 文件会在根目录下运行；主节点的游戏上下文文件夹会作为该根目录下的子文件夹生成。',
    selectLocationAndCreate: '选择位置并创建',
    createModuleRequiredHint: '只需填写模块名称，其余字段可在详情页补充。',
    createContentRequiredHint: '只需填写内容标题，其余字段可在详情页补充。',
    createFromTreeHint: '请使用左侧层级加号打开创建弹窗。',
    indexFiles: '索引文件',
    agentFiles: 'Agent 文件',
    filePreviewTitle: '文件预览',
    filePreviewLoading: '正在读取文件...',
    filePreviewEmpty: '当前文件暂无内容。',
    filePreviewError: '读取文件预览失败。',
    deleteFile: '删除',
    deletingFile: '删除中...',
    confirmDeleteFile: '删除该文件后，需要时可重新手动导出生成。确认删除？',
    fileDeleteError: '删除文件失败。',
    imageDetailTitle: '图片详情',
    mdPreviewButton: 'MD 预览',
    closeMdPreview: '关闭预览',
    saveDisabledClean: '未修改',
    selectCoverImage: '选择主图',
    noCoverImage: '不使用主图',
    viewImageDetail: '查看详情',
    addLinkedImage: '添加图片',
    removeLinkedImage: '取消关联',
    linkedImagesEmpty: '当前节点未关联图片。',
    noUnlinkedImages: '没有可添加的图片。',
    exportAgentFiles: '导出 AGENTS/CLAUDE',
    exportDirectoryIndex: '导出当前目录',
    exporting: '导出中...',
    exportSuccess: '导出完成',
    exportError: '导出失败。',
    exportRequiresWorkspace: '请先导入或创建工作区。',
    exportRequiresGame: '请先创建游戏主节点。',
    saveSuccess: '保存成功',
    saveError: '保存失败',
    languageLabel: '界面语言',
    zhLanguage: '简体中文',
    enLanguage: 'English',
    confirmLanguage: '确认',
    savingLanguage: '保存中...',
    logout: '退出账号',
    loggingOut: '退出中...',
    settingsError: '设置操作失败。',
    logoutError: '退出账号失败。',
    loginTitle: '本地用户登录',
    loginPrompt: '请先选择或创建本地用户，之后才能操作主体。',
    loginExistingPrompt: '选择已有用户',
    loginCreatePrompt: '创建新用户',
    createWorkspace: '创建工作空间',
    creatingWorkspace: '正在创建...',
    importWorkspace: '导入已有工作空间',
    importingWorkspace: '正在导入...',
    refreshWorkspace: '刷新',
    refreshingWorkspace: '刷新中...',
    refreshWorkspaceSuccess: '已刷新工作区',
    refreshWorkspaceError: '刷新工作区失败。',
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
    createGamePrompt: '创建一级游戏节点后会生成 game.md；目录索引需手动导出。',
    editGamePrompt: '编辑可编辑字段后会更新最后编辑者和 game.md；目录索引需手动导出。',
    saveGame: '保存',
    createGame: '创建游戏节点',
    savingGame: '保存中...',
    deleteGame: '删除',
    deletingGame: '删除中...',
    confirmDeleteGame: '删除游戏主节点会删除其游戏上下文文件夹，包括模块、内容和图片资源文件。确认继续？',
    gameSaveError: '保存游戏节点失败。',
    gameDeleteError: '删除游戏节点失败。',
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
    coverImageIdLabel: '主图ID',
    optionalFieldPlaceholder: '',
    creatorIdLabel: '创建者',
    lastEditorIdLabel: '最后编辑者',
    createdAtLabel: '创建时间',
    updatedAtLabel: '更新时间',
    noGamePreview: '创建游戏主节点后显示 game.md 预览。',
    gameNameRequired: '请填写游戏名称。',
    gameVersionRequired: '请填写游戏版本。',
    apiStatus: 'AI',
    apiDisabled: '未配置',
    apiConfigured: '已配置',
    apiConfigTitle: 'API 配置',
    apiConfigPrompt: 'API key 只保存在本地数据库，不会写入导出的 Markdown、manifest 或图片目录。',
    apiBaseUrlLabel: 'API Base URL',
    apiBaseUrlPlaceholder: '例如 mock://local 或 https://api.example.com/v1',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: '本地保存，mock provider 可留空',
    apiModelLabel: '模型名',
    apiModelPlaceholder: '例如 mock-model 或 gpt-4.1-mini',
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
    helpButton: '帮助',
    helpTitle: '帮助',
    helpReadmeError: '读取 README.md 失败。',
    aiApiUnavailable: 'API 未配置、配置不完整或连接失败，AI 功能暂不可用。',
    aiReady: '选择字段后生成候选，确认后才会覆盖并保存。',
    aiAssistEditTitle: 'AI辅助编辑',
    aiAssistAdd: '增加',
    aiAssistModify: '修改',
    aiAssistPolish: '润色',
    aiDialogAddTitle: 'AI 辅助增加',
    aiDialogModifyTitle: 'AI 辅助修改',
    aiDialogPolishTitle: 'AI 辅助润色',
    aiSelectedFieldsLabel: '已选字段',
    aiFieldSelectPlaceholder: '选择要处理的字段',
    aiNoFieldSelected: '请至少选择一个字段。',
    aiCloseDialog: '关闭',
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
    aiDisabledMessage: '请先在设置中保存可用的 API 配置。',
    aiSummaryTitle: '模块汇总',
    aiSummaryReady: '从当前模块的三级内容生成父节点字段候选，确认后才会覆盖模块字段。',
    aiSummarizeChildren: '汇总',
    aiSummaryRequiresModule: '请先选择已保存的模块节点。',
    aiSummaryRequiresChildren: '当前模块没有三级内容节点可汇总。',
    aiSummaryCandidate: '汇总候选',
    aiSummaryContentCount: '子节点数量',
    aiGameSummaryTitle: '游戏汇总',
    aiGameSummaryReady: '从所有二级模块生成游戏主节点字段候选，确认后才会覆盖游戏字段。',
    aiSummarizeModules: '汇总',
    aiGameSummaryRequiresGame: '请先选择已保存的游戏主节点。',
    aiGameSummaryRequiresModules: '当前游戏没有模块节点可汇总。',
    aiGameSummaryModuleCount: '模块数量',
    exportStatus: '导出',
    exportIdle: '待同步',
    treeTitle: '节点与文件',
    treeHint: '一个工作空间对应一个游戏主节点。',
    treeQuickActions: '操作',
    quickCreateGame: '建游戏',
    quickUploadImage: '传图',
    quickCreateModule: '建模块',
    quickCreateContent: '建内容',
    emptyTreeTitle: '尚未选择工作空间',
    emptyTreeDescription: '创建工作空间后，这里会显示游戏、模块和内容节点。',
    workspaceTreeTitle: '当前工作空间',
    activeNodeLabel: '当前查看',
    gameNodePlaceholder: '游戏主节点待创建',
    modulePlaceholder: '尚未创建模块节点',
    modulePanelTitle: '模块节点',
    moduleCreatePrompt: '在当前游戏下创建二级模块，保存后会生成 modules/<module_id>/module.md；目录索引需手动导出。',
    moduleEditPrompt: '编辑模块字段或图片关联后会更新最后编辑者和模块 MD；目录索引需手动导出。',
    createModule: '创建模块',
    saveModule: '保存',
    savingModule: '保存中...',
    deleteModule: '删除',
    deletingModule: '删除中...',
    confirmDeleteModule: '删除模块会连同其文件夹和所有内容节点文件一起删除，但不会删除图片资产。确认继续？',
    moduleSaveError: '保存模块失败。',
    moduleDeleteError: '删除模块失败。',
    moduleRequiresGame: '请先创建游戏主节点。',
    moduleRequiresUser: '请先选择当前用户。',
    moduleNameRequired: '请填写模块名称。',
    moduleNameLabel: '模块名称',
    moduleNamePlaceholder: '例如：战斗系统',
    moduleIdLabel: '模块 ID',
    parentModuleLabel: '所属模块',
    moduleIdPlaceholder: '可选，例如 gacha_workshop',
    modulePositioningLabel: '模块定位',
    systemRulesLabel: '系统规则',
    resourceFlowLabel: '资源产出/消耗',
    linkedImagesLabel: '关联截图',
    noImagesForLink: '暂无可关联图片，可先在图片库上传。',
    playerMainActionsLabel: '玩家主要操作',
    subjectiveFunLabel: '乐趣点',
    subjectiveProblemsLabel: '主要问题',
    subjectiveOptimizationDirectionsLabel: '优化方向',
    noModules: '尚未创建模块。',
    selectModule: '选择模块',
    newModule: '新建模块',
    contentPlaceholder: '当前模块尚无内容节点',
    imageLibrary: '图片库',
    imageLibraryPlaceholder: '创建游戏主节点后可上传图片资产。',
    imageCount: '张图片',
    imageUploadTitle: '图片库',
    imageUploadPrompt: '上传前先填写图片名，文件会按图片名重命名；图片目录需手动导出。',
    imageUploadDialogTitle: '上传图片',
    imageDropHint: '拖拽图片到这里，或点击选择图片',
    imageDropActiveHint: '松开后选择这张图片',
    imageSelectedFile: '已选择',
    imagePasteAction: '粘贴图片',
    imagePasteUnavailable: '剪贴板中没有可用图片。',
    imageFileRequired: '请先选择图片文件。',
    imageUnsupportedFile: '仅支持 png、jpg、jpeg、webp、gif 图片。',
    imageDragSidebarHint: '拖到左侧栏可打开上传弹窗。',
    imageNameLabel: '图片名',
    imageNamePlaceholder: '例如：游戏主界面',
    imageNotesLabel: '备注',
    imageNotesPlaceholder: '可选，说明截图用途或来源。',
    uploadImage: '上传图片',
    uploadingImage: '上传中...',
    deleteImage: '删除',
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
    imageIdLabel: '图片ID',
    moduleMarkdownPreview: '创建或选择模块后显示模块 MD 预览。',
    contentPanelTitle: '内容节点',
    contentCreatePrompt: '在选中模块下创建三级内容，保存后会生成 contents/<content_id>.md；目录索引需手动导出。',
    contentEditPrompt: '编辑内容字段、账号状态或图片引用后会更新内容 MD；目录索引需手动导出。',
    createContent: '创建内容',
    saveContent: '保存',
    savingContent: '保存中...',
    deleteContent: '删除',
    deletingContent: '删除中...',
    confirmDeleteContent: '删除内容节点会删除对应 MD 和图片关联，但不会删除图片资产。确认继续？',
    contentSaveError: '保存内容失败。',
    contentDeleteError: '删除内容失败。',
    contentRequiresModule: '请先选择模块节点。',
    contentRequiresUser: '请先选择当前用户。',
    contentTitleRequired: '请填写内容标题。',
    contentTitleLabel: '标题',
    contentTitlePlaceholder: '例如：创角第一天主线关卡进度',
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
    subjectiveKnownProblemsLabel: '已知问题',
    contentMarkdownPreview: '创建或选择内容后显示内容 MD 预览。',
    detailTitleEmpty: '选择或创建工作空间',
    detailTitleReady: '已打开工作区',
    detailSubtitleEmpty: '从本地目录创建或导入游戏上下文工作区，再按工作区、游戏、图片、模块、内容的顺序补充上下文。',
    detailSubtitleReady: '节点字段、关联图片、Markdown 预览和 AI 辅助都在同一个工作台内维护。',
    workspaceReady: '工作空间已创建',
    workspaceImported: '工作空间已导入',
    workspaceCanceled: '已取消选择目录。',
    workspaceError: '创建工作空间失败。',
    workspaceImportError: '导入工作空间失败。',
    workspacePathLabel: '路径',
    createdPathsLabel: '本次创建',
    noNewPaths: '所需文件已存在，未覆盖已有内容。',
    emptyStateTitle: '等待节点数据',
    emptyStateDescription: '先创建或导入工作空间，然后按推荐路径创建游戏主节点、上传图片、创建模块和内容节点。',
    nextStepsTitle: '当前可用操作',
    nextSteps: ['创建或导入工作空间', '创建游戏主节点', '上传图片并创建模块/内容'],
    workflowTitle: '推荐路径',
    workflowSteps: ['工作空间', '游戏', '图片', '模块', '内容'],
    workflowDone: '已完成',
    workflowCurrent: '当前',
    workflowPending: '待处理',
    rightPanelTitle: '详情',
    imagesPanel: '关联截图',
    imagesEmpty: '选择节点后显示关联图片。',
    nodeImagesEmpty: '当前节点未关联图片。',
    previewPanel: 'MD 预览',
    previewEmpty: '节点文件预览将在创建游戏节点后显示。',
    aiPanel: 'AI 辅助',
    aiEmpty: 'AI 默认可用；API 不可用时点击 AI 功能会提示。',
    generatedFilesTitle: '基础结构',
    generatedFiles: [
      '.game-context-manager.yml',
      'AGENTS.md（手动导出）',
      'CLAUDE.md（手动导出）',
      'manifest.yml（手动导出）',
      '<游戏名>游戏上下文/INDEX.md（手动导出）',
      '<游戏名>游戏上下文/image_catalog.yml（手动导出）'
    ]
  },
  en: {
    appName: 'Game Context Manager',
    subtitle: 'Game context manager',
    settingsButton: 'Settings',
    settingsTitle: 'Settings',
    closeSettings: 'Close settings',
    importButton: 'Import',
    leftTreeLabel: 'Nodes and files',
    chooseNodePrompt: 'Select a node to view',
    createRootPlaceholder: 'Create root node',
    createModulePlaceholder: 'Create module node',
    createContentPlaceholder: 'Create content node',
    addChildNode: 'Add child node',
    collapseTreeGroup: 'Collapse',
    expandTreeGroup: 'Expand',
    createDialogCancel: 'Cancel',
    confirmDialogCancel: 'Cancel',
    confirmDialogTitle: 'Confirm deletion',
    confirmDialogConfirm: 'Delete',
    contextDeleteAction: 'Delete',
    deleteUnavailable: 'The current item cannot be deleted.',
    openInFolderAction: 'Open in folder',
    openInFolderError: 'Failed to open folder.',
    openInFolderUnavailable: 'The current item has no known file to open.',
    directoryIndexStaleHint: 'After deleting a node, manually export the current directory before using it.',
    createDialogError: 'Failed to create node.',
    createGameLocationHint: 'After clicking create, choose a local folder again. The selected folder is the workspace root where Agent files run; the root node game context folder is created as a child folder inside it.',
    selectLocationAndCreate: 'Choose location and create',
    createModuleRequiredHint: 'Only the module name is required now. Optional fields can be filled in the detail page.',
    createContentRequiredHint: 'Only the content title is required now. Optional fields can be filled in the detail page.',
    createFromTreeHint: 'Use the plus button in the left tree to open the create dialog.',
    indexFiles: 'Index files',
    agentFiles: 'Agent files',
    filePreviewTitle: 'File preview',
    filePreviewLoading: 'Reading file...',
    filePreviewEmpty: 'This file is empty.',
    filePreviewError: 'Failed to read file preview.',
    deleteFile: 'Delete',
    deletingFile: 'Deleting...',
    confirmDeleteFile: 'After deleting this file, manually export again when needed. Delete it?',
    fileDeleteError: 'Failed to delete file.',
    imageDetailTitle: 'Image details',
    mdPreviewButton: 'MD preview',
    closeMdPreview: 'Close preview',
    saveDisabledClean: 'No changes',
    selectCoverImage: 'Select cover image',
    noCoverImage: 'No cover image',
    viewImageDetail: 'View details',
    addLinkedImage: 'Add image',
    removeLinkedImage: 'Unlink',
    linkedImagesEmpty: 'No linked images for this node.',
    noUnlinkedImages: 'No unlinked images available.',
    exportAgentFiles: 'Export AGENTS/CLAUDE',
    exportDirectoryIndex: 'Export current directory',
    exporting: 'Exporting...',
    exportSuccess: 'Export complete',
    exportError: 'Export failed.',
    exportRequiresWorkspace: 'Import or create a workspace first.',
    exportRequiresGame: 'Create the game root node first.',
    saveSuccess: 'Saved',
    saveError: 'Save failed',
    languageLabel: 'Interface language',
    zhLanguage: '简体中文',
    enLanguage: 'English',
    confirmLanguage: 'Confirm',
    savingLanguage: 'Saving...',
    logout: 'Log out',
    loggingOut: 'Logging out...',
    settingsError: 'Settings action failed.',
    logoutError: 'Failed to log out.',
    loginTitle: 'Local user login',
    loginPrompt: 'Select or create a local user before using the app.',
    loginExistingPrompt: 'Select existing user',
    loginCreatePrompt: 'Create new user',
    createWorkspace: 'Create workspace',
    creatingWorkspace: 'Creating...',
    importWorkspace: 'Import workspace',
    importingWorkspace: 'Importing...',
    refreshWorkspace: 'Refresh',
    refreshingWorkspace: 'Refreshing...',
    refreshWorkspaceSuccess: 'Workspace refreshed',
    refreshWorkspaceError: 'Failed to refresh workspace.',
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
    createGamePrompt: 'Creating the root game node writes game.md; directory indexes are exported manually.',
    editGamePrompt: 'Editing fields updates the last editor and game.md; directory indexes are exported manually.',
    saveGame: 'Save',
    createGame: 'Create game node',
    savingGame: 'Saving...',
    deleteGame: 'Delete',
    deletingGame: 'Deleting...',
    confirmDeleteGame: 'Deleting the game root node removes its game context folder, including module, content, and image asset files. Continue?',
    gameSaveError: 'Failed to save game node.',
    gameDeleteError: 'Failed to delete game node.',
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
    coverImageIdLabel: 'Cover image ID',
    optionalFieldPlaceholder: '',
    creatorIdLabel: 'Creator',
    lastEditorIdLabel: 'Last editor',
    createdAtLabel: 'Created at',
    updatedAtLabel: 'Updated at',
    noGamePreview: 'Create the game root node to show the game.md preview.',
    gameNameRequired: 'Enter the game name.',
    gameVersionRequired: 'Enter the game version.',
    apiStatus: 'AI',
    apiDisabled: 'Not configured',
    apiConfigured: 'Configured',
    apiConfigTitle: 'API settings',
    apiConfigPrompt: 'The API key is stored only in the local database and is never written to exported Markdown, manifest, or image catalogs.',
    apiBaseUrlLabel: 'API Base URL',
    apiBaseUrlPlaceholder: 'Example: mock://local or https://api.example.com/v1',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Stored locally. Leave blank for the mock provider',
    apiModelLabel: 'Model name',
    apiModelPlaceholder: 'Example: mock-model or gpt-4.1-mini',
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
    helpButton: 'Help',
    helpTitle: 'Help',
    helpReadmeError: 'Failed to read README.md.',
    aiApiUnavailable: 'The API is not configured, incomplete, or failed to connect. AI is unavailable.',
    aiReady: 'Generate candidates for selected fields, then confirm before saving.',
    aiAssistEditTitle: 'AI assisted editing',
    aiAssistAdd: 'Add',
    aiAssistModify: 'Modify',
    aiAssistPolish: 'Polish',
    aiDialogAddTitle: 'AI add',
    aiDialogModifyTitle: 'AI modify',
    aiDialogPolishTitle: 'AI polish',
    aiSelectedFieldsLabel: 'Selected fields',
    aiFieldSelectPlaceholder: 'Select fields to process',
    aiNoFieldSelected: 'Select at least one field.',
    aiCloseDialog: 'Close',
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
    aiDisabledMessage: 'Save a usable API configuration in Settings first.',
    aiSummaryTitle: 'Module summary',
    aiSummaryReady: 'Generate parent module field candidates from third-level content nodes. Confirm before overwriting module fields.',
    aiSummarizeChildren: 'Summarize',
    aiSummaryRequiresModule: 'Select a saved module node first.',
    aiSummaryRequiresChildren: 'The current module has no third-level content nodes to summarize.',
    aiSummaryCandidate: 'Summary candidate',
    aiSummaryContentCount: 'Child content count',
    aiGameSummaryTitle: 'Game summary',
    aiGameSummaryReady: 'Generate game root field candidates from all second-level modules. Confirm before overwriting game fields.',
    aiSummarizeModules: 'Summarize',
    aiGameSummaryRequiresGame: 'Select a saved game root node first.',
    aiGameSummaryRequiresModules: 'The current game has no module nodes to summarize.',
    aiGameSummaryModuleCount: 'Module count',
    exportStatus: 'Export',
    exportIdle: 'Pending',
    treeTitle: 'Nodes and files',
    treeHint: 'One workspace maps to one game root node.',
    treeQuickActions: 'Actions',
    quickCreateGame: 'Game',
    quickUploadImage: 'Image',
    quickCreateModule: 'Module',
    quickCreateContent: 'Content',
    emptyTreeTitle: 'No workspace selected',
    emptyTreeDescription: 'Create a workspace to show game, module, and content nodes here.',
    workspaceTreeTitle: 'Current workspace',
    activeNodeLabel: 'Viewing',
    gameNodePlaceholder: 'Game root node pending',
    modulePlaceholder: 'No module nodes yet',
    modulePanelTitle: 'Module node',
    moduleCreatePrompt: 'Create a second-level module under the current game. Saving writes modules/<module_id>/module.md; directory indexes are exported manually.',
    moduleEditPrompt: 'Editing fields or image links updates the last editor and module Markdown; directory indexes are exported manually.',
    createModule: 'Create module',
    saveModule: 'Save',
    savingModule: 'Saving...',
    deleteModule: 'Delete',
    deletingModule: 'Deleting...',
    confirmDeleteModule: 'Deleting this module also deletes its folder and all child content files, but keeps image assets. Continue?',
    moduleSaveError: 'Failed to save module.',
    moduleDeleteError: 'Failed to delete module.',
    moduleRequiresGame: 'Create the game root node first.',
    moduleRequiresUser: 'Select a current user first.',
    moduleNameRequired: 'Enter the module name.',
    moduleNameLabel: 'Module name',
    moduleNamePlaceholder: 'Example: Combat system',
    moduleIdLabel: 'Module ID',
    parentModuleLabel: 'Parent module',
    moduleIdPlaceholder: 'Optional, e.g. gacha_workshop',
    modulePositioningLabel: 'Module positioning',
    systemRulesLabel: 'System rules',
    resourceFlowLabel: 'Resource output/consumption',
    linkedImagesLabel: 'Linked screenshots',
    noImagesForLink: 'No image assets available. Upload images in the image library first.',
    playerMainActionsLabel: 'Player main actions',
    subjectiveFunLabel: 'Fun points',
    subjectiveProblemsLabel: 'Main problems',
    subjectiveOptimizationDirectionsLabel: 'Optimization directions',
    noModules: 'No modules created yet.',
    selectModule: 'Select module',
    newModule: 'New module',
    contentPlaceholder: 'No content nodes in the selected module',
    imageLibrary: 'Image library',
    imageLibraryPlaceholder: 'Upload image assets after creating the game root node.',
    imageCount: 'images',
    imageUploadTitle: 'Image library',
    imageUploadPrompt: 'Enter an image name first. The file is renamed from that name; the image catalog is exported manually.',
    imageUploadDialogTitle: 'Upload image',
    imageDropHint: 'Drop an image here, or click to choose one',
    imageDropActiveHint: 'Release to select this image',
    imageSelectedFile: 'Selected',
    imagePasteAction: 'Paste image',
    imagePasteUnavailable: 'No image is available in the clipboard.',
    imageFileRequired: 'Choose an image file first.',
    imageUnsupportedFile: 'Only png, jpg, jpeg, webp, and gif images are supported.',
    imageDragSidebarHint: 'Drop an image on the left sidebar to open upload.',
    imageNameLabel: 'Image name',
    imageNamePlaceholder: 'Example: Main game screen',
    imageNotesLabel: 'Notes',
    imageNotesPlaceholder: 'Optional, describe the screenshot purpose or source.',
    uploadImage: 'Upload image',
    uploadingImage: 'Uploading...',
    deleteImage: 'Delete',
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
    imageIdLabel: 'Image ID',
    moduleMarkdownPreview: 'Create or select a module to show the module Markdown preview.',
    contentPanelTitle: 'Content node',
    contentCreatePrompt: 'Create a third-level content node under the selected module. Saving writes contents/<content_id>.md; directory indexes are exported manually.',
    contentEditPrompt: 'Editing content fields, account state, or image references updates content Markdown; directory indexes are exported manually.',
    createContent: 'Create content',
    saveContent: 'Save',
    savingContent: 'Saving...',
    deleteContent: 'Delete',
    deletingContent: 'Deleting...',
    confirmDeleteContent: 'Deleting this content removes its Markdown and image links, but keeps image assets. Continue?',
    contentSaveError: 'Failed to save content.',
    contentDeleteError: 'Failed to delete content.',
    contentRequiresModule: 'Select a module node first.',
    contentRequiresUser: 'Select a current user first.',
    contentTitleRequired: 'Enter the content title.',
    contentTitleLabel: 'Title',
    contentTitlePlaceholder: 'Example: Day 1 main quest progress',
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
    subjectiveKnownProblemsLabel: 'Known problems',
    contentMarkdownPreview: 'Create or select content to show the content Markdown preview.',
    detailTitleEmpty: 'Select or create a workspace',
    detailTitleReady: 'Workspace overview',
    detailSubtitleEmpty: 'Create or import a local game context workspace, then work through workspace, game, images, modules, and content.',
    detailSubtitleReady: 'Node fields, linked images, Markdown preview, and AI assist are maintained in one workspace.',
    workspaceReady: 'Workspace created',
    workspaceImported: 'Workspace imported',
    workspaceCanceled: 'Folder selection canceled.',
    workspaceError: 'Failed to create workspace.',
    workspaceImportError: 'Failed to import workspace.',
    workspacePathLabel: 'Path',
    createdPathsLabel: 'Created now',
    noNewPaths: 'Required files already exist; existing content was not overwritten.',
    emptyStateTitle: 'Waiting for node data',
    emptyStateDescription: 'Create or import a workspace, then follow the recommended path to add the game root, images, modules, and content nodes.',
    nextStepsTitle: 'Available now',
    nextSteps: ['Create or import a workspace', 'Create the game root node', 'Upload images and add modules/content'],
    workflowTitle: 'Recommended path',
    workflowSteps: ['Workspace', 'Game', 'Images', 'Modules', 'Content'],
    workflowDone: 'Done',
    workflowCurrent: 'Current',
    workflowPending: 'Pending',
    rightPanelTitle: 'Details',
    imagesPanel: 'Linked images',
    imagesEmpty: 'Linked screenshots appear after selecting a node.',
    nodeImagesEmpty: 'No linked images on the current node.',
    previewPanel: 'MD preview',
    previewEmpty: 'Node file preview appears after creating the game node.',
    aiPanel: 'AI assist',
    aiEmpty: 'AI is available by default. If the API is unavailable, AI actions will show a prompt.',
    generatedFilesTitle: 'Base structure',
    generatedFiles: [
      '.game-context-manager.yml',
      'AGENTS.md (manual export)',
      'CLAUDE.md (manual export)',
      'manifest.yml (manual export)',
      '<game name>游戏上下文/INDEX.md (manual export)',
      '<game name>游戏上下文/image_catalog.yml (manual export)'
    ]
  }
} as const;

function App(): React.JSX.Element {
  const [language, setLanguage] = useState<Language>('zh');
  const [settingsDraftLanguage, setSettingsDraftLanguage] = useState<Language>('zh');
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
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  const [pendingImageUploadSource, setPendingImageUploadSource] = useState<PendingImageUploadSource>();
  const [isLeftDragActive, setIsLeftDragActive] = useState(false);
  const [leftContextMenu, setLeftContextMenu] = useState<LeftContextMenuState>();
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>();
  const confirmationResolver = useRef<((confirmed: boolean) => void) | undefined>(undefined);
  const [imageStatus, setImageStatus] = useState<ImageStatus>('idle');
  const [imageErrorMessage, setImageErrorMessage] = useState<string>();
  const [apiConfig, setApiConfig] = useState<ApiConfig>();
  const [apiForm, setApiForm] = useState<ApiFormState>(initialApiForm);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');
  const [apiErrorMessage, setApiErrorMessage] = useState<string>();
  const [apiTestResult, setApiTestResult] = useState<ApiConnectionTestResult>();
  const [apiLastAction, setApiLastAction] = useState<ApiAction>('save');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<SettingsStatus>('loading');
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<string>();
  const [aiDialogKind, setAiDialogKind] = useState<AiDialogKind>();
  const [aiAssistForm, setAiAssistForm] = useState<AiAssistFormState>(initialAiAssistForm);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [aiErrorMessage, setAiErrorMessage] = useState<string>();
  const [aiCandidates, setAiCandidates] = useState<AiCandidateField[]>([]);
  const [activeNodeKind, setActiveNodeKind] = useState<ActiveNodeKind>('game');
  const [activeDetailKind, setActiveDetailKind] = useState<ActiveDetailKind>('empty');
  const [selectedImage, setSelectedImage] = useState<ImageAssetView>();
  const [selectedIndexFile, setSelectedIndexFile] = useState<IndexFileSelection>();
  const [indexFileStatus, setIndexFileStatus] = useState<IndexFileStatus>('idle');
  const [indexFileErrorMessage, setIndexFileErrorMessage] = useState<string>();
  const [previewNodeKey, setPreviewNodeKey] = useState<string>();
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportErrorMessage, setExportErrorMessage] = useState<string>();
  const [transientNotice, setTransientNotice] = useState<TransientNoticeState>();
  const [contextMenuErrorMessage, setContextMenuErrorMessage] = useState<string>();
  const [exportedPaths, setExportedPaths] = useState<string[]>([]);
  const [createNodeDialog, setCreateNodeDialog] = useState<CreateNodeDialogState>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isGameCollapsed, setIsGameCollapsed] = useState(false);
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<string[]>([]);
  const [isImageLibraryCollapsed, setIsImageLibraryCollapsed] = useState(false);
  const [isAgentFilesCollapsed, setIsAgentFilesCollapsed] = useState(false);
  const [isIndexFilesCollapsed, setIsIndexFilesCollapsed] = useState(false);
  const transientNoticeTimer = useRef<number | undefined>(undefined);
  const text = copy[language];
  const hasWorkspace = Boolean(workspaceId && workspacePath);
  const hasCurrentUser = Boolean(currentUser);
  const isLoginRequired = userStatus !== 'loading' && !currentUser;
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
  const activePreviewEmptyText =
    activeDetailKind === 'content'
      ? text.contentMarkdownPreview
      : activeDetailKind === 'module'
        ? text.moduleMarkdownPreview
        : text.noGamePreview;
  const apiStatusValue = isApiConfigComplete(apiConfig) ? text.apiConfigured : text.apiDisabled;
  const apiStatusTone: 'ready' | 'muted' = isApiConfigComplete(apiConfig) ? 'ready' : 'muted';
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
  const selectedAiFields = aiAssistForm.selectedFieldKeys
    .map((fieldKey) => aiEditableFields.find((field) => field.key === fieldKey))
    .filter((field): field is AiEditableField => Boolean(field));
  const selectedModuleContentCount = selectedModule
    ? contents.filter((content) => content.moduleId === selectedModule.id).length
    : 0;
  const gameModuleCount = game ? modules.length : 0;
  const agentFileItems = buildFileSelections(exportedPaths, ['AGENTS.md', 'CLAUDE.md']);
  const rootIndexFileItems = buildFileSelections(exportedPaths, ['manifest.yml']);
  const gameIndexFileItems = buildFileSelections(exportedPaths, ['INDEX.md', 'image_catalog.yml']);
  const exportButtonDisabled =
    !workspaceId ||
    workspaceStatus === 'refreshing' ||
    exportStatus === 'exportingAgentFiles' ||
    exportStatus === 'exportingDirectoryIndex';
  const activePreviewNodeKey =
    activeDetailKind === 'game' && game
      ? buildNodePreviewKey('game', game.id)
      : activeDetailKind === 'module' && selectedModule
        ? buildNodePreviewKey('module', selectedModule.id)
        : activeDetailKind === 'content' && selectedContent
          ? buildNodePreviewKey('content', selectedContent.id)
          : undefined;
  const isActiveNodePreviewOpen = Boolean(activePreviewNodeKey && previewNodeKey === activePreviewNodeKey);
  const isGameDirty = Boolean(game && !areGameFormsEqual(gameForm, gameNodeToForm(game)));
  const isModuleDirty = Boolean(selectedModule && !areModuleFormsEqual(moduleForm, moduleNodeToForm(selectedModule)));
  const isContentDirty = Boolean(selectedContent && !areContentFormsEqual(contentForm, contentNodeToForm(selectedContent)));
  const detailContent = renderActiveDetail({
    activeDetailKind,
    text,
    workspaceId,
    language,
    currentUser,
    users,
    game,
    gameForm,
    isGameDirty,
    gameStatus,
    gameErrorMessage,
    images,
    imageStatus,
    imageErrorMessage,
    selectedImage,
    modules,
    selectedModule,
    moduleForm,
    isModuleDirty,
    moduleStatus,
    moduleErrorMessage,
    contents,
    selectedContent,
    contentForm,
    isContentDirty,
    contentStatus,
    contentErrorMessage,
    selectedIndexFile,
    indexFileStatus,
    indexFileErrorMessage,
    updateGameForm,
    updateModuleForm,
    updateContentForm,
    openCreateGameDialog,
    handleSaveGame,
    handleDeleteGame,
    openImageUploadDialog,
    handleDeleteImage,
    handleSelectModule,
    handleStartNewModule,
    handleSaveModule,
    handleDeleteModule,
    handleSelectContent,
    handleStartNewContent,
    handleSaveContent,
    handleDeleteContent,
    handleDeleteIndexFile,
    handleToggleNodePreview,
    handleSelectImageFromDetail,
    openAiFieldDialog,
    openAiModuleSummaryDialog,
    openAiGameSummaryDialog
  });

  useEffect(() => {
    void loadAppSettingsState();
    void loadUserState();
    void loadApiConfigState();
    void handleRestoreRecentWorkspace();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = text.appName;
  }, [language, text.appName]);

  useEffect(
    () => () => {
      if (transientNoticeTimer.current) {
        window.clearTimeout(transientNoticeTimer.current);
      }
    },
    []
  );

  useEffect(() => {
    function handleDocumentPaste(event: ClipboardEvent): void {
      if (!hasWorkspace || isEditablePasteTarget(event.target)) {
        return;
      }

      const file = event.clipboardData ? getFirstImageFileFromClipboard(event.clipboardData) : undefined;

      if (!file) {
        return;
      }

      event.preventDefault();
      void openImageUploadDialogFromFile(file);
    }

    document.addEventListener('paste', handleDocumentPaste);

    return () => document.removeEventListener('paste', handleDocumentPaste);
  }, [hasWorkspace, text.imageUnsupportedFile]);

  useEffect(() => {
    function handleDocumentClick(): void {
      setLeftContextMenu(undefined);
    }

    document.addEventListener('click', handleDocumentClick);

    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  useEffect(() => {
    setAiDialogKind(undefined);
    setAiCandidates([]);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
    setAiAssistForm((current) => {
      const nextSelectedFieldKeys = current.selectedFieldKeys.filter((fieldKey) =>
        aiEditableFields.some((field) => field.key === fieldKey)
      );

      return {
        ...current,
        selectedFieldKeys: nextSelectedFieldKeys.length > 0 ? nextSelectedFieldKeys : aiEditableFields.slice(0, 1).map((field) => field.key)
      };
    });
  }, [activeNodeKind, game?.id, selectedModule?.id, selectedContent?.id, aiEditableFieldKeys]);

  useEffect(() => {
    setCollapsedModuleIds((current) => current.filter((moduleId) => modules.some((module) => module.id === moduleId)));
  }, [modules]);

  function showTransientNotice(notice: TransientNoticeState): void {
    setTransientNotice(notice);

    if (transientNoticeTimer.current) {
      window.clearTimeout(transientNoticeTimer.current);
    }

    transientNoticeTimer.current = window.setTimeout(() => {
      setTransientNotice(undefined);
      transientNoticeTimer.current = undefined;
    }, 2000);
  }

  function showSaveFailure(detail?: string): void {
    showTransientNotice({ tone: 'danger', title: text.saveError, detail });
  }

  function showSaveSuccess(): void {
    showTransientNotice({ tone: 'muted', title: text.saveSuccess });
  }

  function finishExportWithNotice(status: 'success' | 'error', detail?: string): void {
    const nextStatus: ExportStatus = status;
    setExportStatus(nextStatus);
    showTransientNotice({
      tone: status === 'success' ? 'muted' : 'danger',
      title: status === 'success' ? text.exportSuccess : text.exportError,
      detail
    });

    window.setTimeout(() => {
      setExportStatus((current) => (current === nextStatus ? 'idle' : current));
      if (status === 'error') {
        setExportErrorMessage(undefined);
      }
    }, 2000);
  }

  function toggleModuleCollapse(moduleId: string): void {
    setCollapsedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((currentModuleId) => currentModuleId !== moduleId) : [...current, moduleId]
    );
  }

  function toggleGameCollapse(): void {
    setIsGameCollapsed((current) => !current);
  }

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

  async function loadAppSettingsState(): Promise<void> {
    setSettingsStatus('loading');
    setSettingsErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.getAppSettingsState();
      setLanguage(state.settings.language);
      setSettingsDraftLanguage(state.settings.language);
      setSettingsStatus('idle');
    } catch (error) {
      setSettingsStatus('error');
      setSettingsErrorMessage(error instanceof Error ? error.message : String(error));
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

  function requestConfirmation(dialog: ConfirmationDialogState): Promise<boolean> {
    setConfirmationDialog(dialog);

    return new Promise((resolve) => {
      confirmationResolver.current = resolve;
    });
  }

  function resolveConfirmationDialog(confirmed: boolean): void {
    confirmationResolver.current?.(confirmed);
    confirmationResolver.current = undefined;
    setConfirmationDialog(undefined);
  }

  function handleOpenSettings(): void {
    setSettingsDraftLanguage(language);
    setSettingsErrorMessage(undefined);
    setIsSettingsOpen(true);
  }

  async function handleConfirmLanguageChange(): Promise<void> {
    if (settingsDraftLanguage === language || settingsStatus === 'saving') {
      return;
    }

    setSettingsStatus('saving');
    setSettingsErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.saveAppSettings({ language: settingsDraftLanguage });
      setLanguage(state.settings.language);
      setSettingsDraftLanguage(state.settings.language);
      setSettingsStatus('idle');
    } catch (error) {
      setSettingsStatus('error');
      setSettingsErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleLogoutCurrentUser(): Promise<void> {
    setSettingsStatus('loggingOut');
    setSettingsErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.logoutCurrentUser();
      applyUserState(state);
      setIsSettingsOpen(false);
      setSettingsStatus('idle');
    } catch (error) {
      setSettingsStatus('error');
      setSettingsErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function applyWorkspaceSummary(summary: WorkspaceImportSummary, detailKind: ActiveDetailKind): Promise<void> {
    const nextWorkspaceId = summary.id;

    setWorkspaceId(nextWorkspaceId);
    setWorkspacePath(summary.contextPath);
    setCreatedPaths([
      `${summary.imported.gameCount} game`,
      `${summary.imported.moduleCount} modules`,
      `${summary.imported.contentCount} contents`,
      `${summary.imported.imageCount} images`,
      ...summary.warnings
    ]);
    setExportedPaths(summary.existingPaths ?? []);
    setWorkspaceStatus('ready');
    setActiveNodeKind('game');
    setActiveDetailKind(detailKind);
    setSelectedImage(undefined);
    setSelectedIndexFile(undefined);
    await loadUserState(nextWorkspaceId);
    await loadGameState(nextWorkspaceId);
    await loadImageState(nextWorkspaceId);
    await loadModuleState(nextWorkspaceId);
    await loadContentState(nextWorkspaceId);
  }

  async function handleRestoreRecentWorkspace(): Promise<void> {
    setWorkspaceLastAction('refresh');
    setWorkspaceStatus('refreshing');
    setErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.restoreRecentWorkspace();

      if (!result.workspace) {
        setWorkspaceStatus('idle');
        return;
      }

      await applyWorkspaceSummary(result.workspace, result.workspace.imported.gameCount > 0 ? 'game' : 'empty');
    } catch (error) {
      setWorkspaceStatus('idle');
      showTransientNotice({
        tone: 'danger',
        title: text.refreshWorkspaceError,
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function handleCreateWorkspace(): Promise<string | undefined> {
    const hadWorkspace = Boolean(workspaceId && workspacePath);
    setWorkspaceLastAction('create');
    setWorkspaceStatus('creating');
    setErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.createWorkspace();

      if (result.canceled) {
        setWorkspaceStatus(hadWorkspace ? 'ready' : 'canceled');
        return undefined;
      }

      const nextWorkspaceId = result.workspace?.id;
      setWorkspaceId(nextWorkspaceId);
      setWorkspacePath(result.workspace?.contextPath);
      setCreatedPaths(result.workspace?.createdPaths ?? []);
      setExportedPaths(result.workspace?.existingPaths ?? []);
      setWorkspaceStatus('ready');
      setActiveDetailKind('empty');
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      await loadUserState(nextWorkspaceId);
      if (nextWorkspaceId) {
        await loadGameState(nextWorkspaceId);
        await loadImageState(nextWorkspaceId);
        await loadModuleState(nextWorkspaceId);
        await loadContentState(nextWorkspaceId);
      }
      return nextWorkspaceId;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      if (hadWorkspace) {
        setWorkspaceStatus('ready');
        showTransientNotice({ tone: 'danger', title: text.workspaceError, detail });
        return undefined;
      }

      setWorkspaceStatus('error');
      setErrorMessage(detail);
      return undefined;
    }
  }

  async function handleImportWorkspace(): Promise<void> {
    const hadWorkspace = Boolean(workspaceId && workspacePath);
    setWorkspaceLastAction('import');
    setWorkspaceStatus('importing');
    setErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.importWorkspace();

      if (result.canceled) {
        setWorkspaceStatus(hadWorkspace ? 'ready' : 'canceled');
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
      setExportedPaths(result.workspace?.existingPaths ?? []);
      setWorkspaceStatus('ready');
      setActiveNodeKind('game');
      setActiveDetailKind('empty');
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      await loadUserState(nextWorkspaceId);
      if (nextWorkspaceId) {
        await loadGameState(nextWorkspaceId);
        await loadImageState(nextWorkspaceId);
        await loadModuleState(nextWorkspaceId);
        await loadContentState(nextWorkspaceId);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      if (hadWorkspace) {
        setWorkspaceStatus('ready');
        showTransientNotice({ tone: 'danger', title: text.workspaceImportError, detail });
        return;
      }

      setWorkspaceStatus('error');
      setErrorMessage(detail);
    }
  }

  async function handleRefreshWorkspace(): Promise<void> {
    if (!workspaceId) {
      showTransientNotice({ tone: 'danger', title: text.refreshWorkspaceError, detail: text.exportRequiresWorkspace });
      return;
    }

    const currentWorkspaceId = workspaceId;
    setWorkspaceLastAction('refresh');
    setWorkspaceStatus('refreshing');
    setErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.refreshWorkspace({ workspaceId: currentWorkspaceId });
      const nextWorkspaceId = result.workspace.id;

      setWorkspaceId(nextWorkspaceId);
      setWorkspacePath(result.workspace.contextPath);
      setCreatedPaths([
        `${result.workspace.imported.gameCount} game`,
        `${result.workspace.imported.moduleCount} modules`,
        `${result.workspace.imported.contentCount} contents`,
        `${result.workspace.imported.imageCount} images`,
        ...result.workspace.warnings
      ]);
      setExportedPaths(result.workspace.existingPaths ?? []);
      setWorkspaceStatus('ready');
      setActiveNodeKind('game');
      setActiveDetailKind(result.workspace.imported.gameCount > 0 ? 'game' : 'empty');
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      await loadUserState(nextWorkspaceId);
      await loadGameState(nextWorkspaceId);
      await loadImageState(nextWorkspaceId);
      await loadModuleState(nextWorkspaceId);
      await loadContentState(nextWorkspaceId);
      showTransientNotice({ tone: 'muted', title: text.refreshWorkspaceSuccess });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      setWorkspaceStatus('ready');
      showTransientNotice({ tone: 'danger', title: text.refreshWorkspaceError, detail });
    }
  }

  async function handleExportAgentFiles(): Promise<void> {
    if (!workspaceId) {
      setExportErrorMessage(text.exportRequiresWorkspace);
      finishExportWithNotice('error', text.exportRequiresWorkspace);
      return;
    }

    setExportStatus('exportingAgentFiles');
    setExportErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.exportAgentFiles({ workspaceId });
      setExportedPaths((current) => mergeUniquePaths(current, result.exportedPaths));
      finishExportWithNotice('success');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setExportErrorMessage(detail);
      finishExportWithNotice('error', detail);
    }
  }

  async function handleExportDirectoryIndex(): Promise<void> {
    if (!workspaceId) {
      setExportErrorMessage(text.exportRequiresWorkspace);
      finishExportWithNotice('error', text.exportRequiresWorkspace);
      return;
    }

    if (!game) {
      setExportErrorMessage(text.exportRequiresGame);
      finishExportWithNotice('error', text.exportRequiresGame);
      return;
    }

    setExportStatus('exportingDirectoryIndex');
    setExportErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.exportDirectoryIndex({ workspaceId });
      setExportedPaths((current) => mergeUniquePaths(current, result.exportedPaths));
      finishExportWithNotice('success');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setExportErrorMessage(detail);
      finishExportWithNotice('error', detail);
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
      showSaveFailure(text.gameNodeRequiresUser);
      return false;
    }

    if (!nextForm.gameName.trim()) {
      setGameStatus('error');
      setGameErrorMessage(text.gameNameRequired);
      showSaveFailure(text.gameNameRequired);
      return false;
    }

    if (!nextForm.gameVersion.trim()) {
      setGameStatus('error');
      setGameErrorMessage(text.gameVersionRequired);
      showSaveFailure(text.gameVersionRequired);
      return false;
    }

    setGameStatus('saving');
    setGameErrorMessage(undefined);

    try {
      const input = {
        workspaceId,
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
        coverImageId: nextForm.coverImageId
      };
      const state = game
        ? await window.gameContextManager.updateGameNode(input)
        : await window.gameContextManager.createGameNode(input);

      applyGameState(state);
      setActiveNodeKind('game');
      setActiveDetailKind('game');
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      await loadImageState(workspaceId);
      await loadModuleState(workspaceId);
      await loadContentState(workspaceId);
      setGameStatus('idle');
      showSaveSuccess();
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setGameStatus('error');
      setGameErrorMessage(detail);
      showSaveFailure(detail);
      return false;
    }
  }

  async function handleDeleteGame(): Promise<void> {
    if (!workspaceId || !game) {
      return;
    }

    const confirmed = await requestConfirmation({
      title: text.confirmDialogTitle,
      message: text.confirmDeleteGame,
      detailLines: [text.directoryIndexStaleHint],
      confirmLabel: text.confirmDialogConfirm,
      cancelLabel: text.confirmDialogCancel
    });

    if (!confirmed) {
      return;
    }

    setGameStatus('deleting');
    setGameErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.deleteGameNode({ workspaceId });

      applyGameState(state);
      await loadModuleState(workspaceId);
      await loadContentState(workspaceId);
      await loadImageState(workspaceId);
      setActiveNodeKind('game');
      setActiveDetailKind('empty');
      setSelectedModule(undefined);
      setSelectedContent(undefined);
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      setPreviewNodeKey(undefined);
      setGameStatus('idle');
    } catch (error) {
      setGameStatus('error');
      setGameErrorMessage(error instanceof Error ? error.message : String(error));
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

    if (!pendingImageUploadSource) {
      setImageStatus('error');
      setImageErrorMessage(text.imageFileRequired);
      return;
    }

    setImageStatus('saving');
    setImageErrorMessage(undefined);

    try {
      const previousImageIds = new Set(images.map((image) => image.id));
      const state = await window.gameContextManager.uploadImageAsset({
        workspaceId,
        displayName: imageForm.displayName,
        notes: imageForm.notes,
        source: pendingImageUploadSource.source
      });
      const nextSelectedImage = state.images.find((image) => !previousImageIds.has(image.id)) ?? state.images.at(-1);

      applyImageState(state);
      await loadModuleState(workspaceId, selectedModule?.id);
      await loadContentState(workspaceId, selectedContent?.id, selectedModule?.id);
      if (!state.canceled) {
        setImageForm(initialImageForm);
        setPendingImageUploadSource(undefined);
        setIsImageUploadDialogOpen(false);
      }
      setImageStatus(state.canceled ? 'canceled' : 'idle');
      if (!state.canceled) {
        setSelectedImage(nextSelectedImage);
        setSelectedIndexFile(undefined);
        setActiveDetailKind(nextSelectedImage ? 'image' : 'imageLibrary');
      }
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
    setAiCandidates([]);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  function openAiFieldDialog(mode: AiAssistFormState['mode']): void {
    const defaultFieldKeys = selectedAiFields.length > 0
      ? selectedAiFields.map((field) => field.key)
      : aiEditableFields.slice(0, 1).map((field) => field.key);

    setAiDialogKind('fieldEdit');
    setAiAssistForm({
      mode,
      selectedFieldKeys: defaultFieldKeys,
      userInstruction: ''
    });
    setAiCandidates([]);
    setAiErrorMessage(isApiConfigComplete(apiConfig) ? undefined : text.aiApiUnavailable);
    setAiStatus(isApiConfigComplete(apiConfig) ? 'idle' : 'error');
  }

  function openAiModuleSummaryDialog(): void {
    const summaryFieldKeys = getModuleSummaryFieldKeys(aiEditableFields);

    setAiDialogKind('moduleSummary');
    setAiAssistForm({
      mode: AiEditMode.Modify,
      selectedFieldKeys: summaryFieldKeys,
      userInstruction: ''
    });
    setAiCandidates([]);
    setAiErrorMessage(isApiConfigComplete(apiConfig) ? undefined : text.aiApiUnavailable);
    setAiStatus(isApiConfigComplete(apiConfig) ? 'idle' : 'error');
  }

  function openAiGameSummaryDialog(): void {
    const summaryFieldKeys = getGameSummaryFieldKeys(aiEditableFields);

    setAiDialogKind('gameSummary');
    setAiAssistForm({
      mode: AiEditMode.Modify,
      selectedFieldKeys: summaryFieldKeys,
      userInstruction: ''
    });
    setAiCandidates([]);
    setAiErrorMessage(isApiConfigComplete(apiConfig) ? undefined : text.aiApiUnavailable);
    setAiStatus(isApiConfigComplete(apiConfig) ? 'idle' : 'error');
  }

  function closeAiDialog(): void {
    if (aiStatus === 'generating' || aiStatus === 'saving') {
      return;
    }

    setAiDialogKind(undefined);
    setAiCandidates([]);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  function addAiSelectedField(fieldKey: string): void {
    if (!fieldKey) {
      return;
    }

    setAiAssistForm((current) => ({
      ...current,
      selectedFieldKeys: current.selectedFieldKeys.includes(fieldKey)
        ? current.selectedFieldKeys
        : [...current.selectedFieldKeys, fieldKey]
    }));
    setAiCandidates([]);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  function removeAiSelectedField(fieldKey: string): void {
    setAiAssistForm((current) => ({
      ...current,
      selectedFieldKeys: current.selectedFieldKeys.filter((selectedFieldKey) => selectedFieldKey !== fieldKey)
    }));
    setAiCandidates([]);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  function updateAiCandidateValue(fieldKey: string, candidateValue: string): void {
    setAiCandidates((current) =>
      current.map((candidate) => (candidate.key === fieldKey ? { ...candidate, candidateValue } : candidate))
    );
  }

  async function handleGenerateAiFieldEdit(): Promise<void> {
    if (!isApiConfigComplete(apiConfig)) {
      setAiStatus('error');
      setAiErrorMessage(text.aiApiUnavailable);
      return;
    }

    if (selectedAiFields.length === 0) {
      setAiStatus('error');
      setAiErrorMessage(text.aiNoFieldSelected);
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
    setAiCandidates([]);

    try {
      const results = await Promise.all(
        selectedAiFields.map((field) =>
          window.gameContextManager.generateAiFieldEdit({
            nodeType: field.nodeType,
            nodeId: field.nodeId,
            fieldName: field.fieldName,
            fieldLabel: field.label,
            fieldValue: field.value,
            mode: aiAssistForm.mode,
            userInstruction: aiAssistForm.userInstruction,
            nodeContext: buildAiNodeContext({
              game,
              selectedModule,
              selectedContent,
              selectedField: field
            }),
            locale: language
          })
        )
      );

      setAiCandidates(results.map((result) => ({
        key: `${result.nodeType}:${result.nodeId}:${result.fieldName}`,
        fieldName: result.fieldName,
        fieldLabel: result.fieldLabel,
        originalValue: result.originalValue,
        candidateValue: result.candidateValue
      })));
      setAiStatus('idle');
    } catch (error) {
      setAiStatus('error');
      setAiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleConfirmAiFieldEdit(): Promise<void> {
    if (aiCandidates.length === 0 || selectedAiFields.length === 0) {
      return;
    }

    setAiStatus('saving');
    setAiErrorMessage(undefined);

    const nodeKind = selectedAiFields[0]?.nodeKind;
    let ok = false;

    if (nodeKind === 'game') {
      const nextForm = {
        ...gameForm
      } as GameFormState;
      applyAiCandidatesToForm(nextForm, aiCandidates);
      setGameForm(nextForm);
      ok = await handleSaveGame(nextForm);
    } else if (nodeKind === 'module') {
      const nextForm = {
        ...moduleForm
      } as ModuleFormState;
      applyAiCandidatesToForm(nextForm, aiCandidates);
      setModuleForm(nextForm);
      ok = await handleSaveModule(nextForm);
    } else {
      const nextForm = {
        ...contentForm
      } as ContentFormState;
      applyAiCandidatesToForm(nextForm, aiCandidates);
      setContentForm(nextForm);
      ok = await handleSaveContent(nextForm);
    }

    if (ok) {
      setAiDialogKind(undefined);
      setAiCandidates([]);
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
    setAiCandidates([]);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  async function handleGenerateAiModuleSummary(): Promise<void> {
    if (!isApiConfigComplete(apiConfig)) {
      setAiStatus('error');
      setAiErrorMessage(text.aiApiUnavailable);
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

    if (selectedAiFields.length === 0) {
      setAiStatus('error');
      setAiErrorMessage(text.aiNoFieldSelected);
      return;
    }

    setAiStatus('generating');
    setAiErrorMessage(undefined);
    setAiCandidates([]);

    try {
      const result = await window.gameContextManager.generateAiModuleSummary({
        workspaceId,
        moduleId: selectedModule.id,
        locale: language
      });

      const selectedFieldNames = new Set(selectedAiFields.map((field) => field.fieldName));
      setAiCandidates(result.fields
        .filter((field) => selectedFieldNames.has(field.fieldName))
        .map((field) => {
          const localField = selectedAiFields.find((selectedField) => selectedField.fieldName === field.fieldName);

          return {
            key: localField?.key ?? `module:${result.moduleId}:${field.fieldName}`,
            fieldName: field.fieldName,
            fieldLabel: localField?.label ?? field.fieldLabel,
            originalValue: localField?.value ?? field.originalValue,
            candidateValue: field.candidateValue
          };
        }));
      setAiStatus('idle');
    } catch (error) {
      setAiStatus('error');
      setAiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleConfirmAiModuleSummary(): Promise<void> {
    if (aiCandidates.length === 0 || !selectedModule) {
      return;
    }

    setAiStatus('saving');
    setAiErrorMessage(undefined);

    const nextForm = {
      ...moduleForm
    } as ModuleFormState;

    applyAiCandidatesToForm(nextForm, aiCandidates);
    setModuleForm(nextForm);
    const ok = await handleSaveModule(nextForm);

    if (ok) {
      setAiDialogKind(undefined);
      setAiCandidates([]);
      setAiStatus('idle');
      return;
    }

    setAiStatus('error');
    setAiErrorMessage(text.aiConfirmError);
  }

  function handleCancelAiModuleSummary(): void {
    setAiCandidates([]);
    setAiErrorMessage(undefined);
    setAiStatus('idle');
  }

  async function handleGenerateAiGameSummary(): Promise<void> {
    if (!isApiConfigComplete(apiConfig)) {
      setAiStatus('error');
      setAiErrorMessage(text.aiApiUnavailable);
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

    if (selectedAiFields.length === 0) {
      setAiStatus('error');
      setAiErrorMessage(text.aiNoFieldSelected);
      return;
    }

    setAiStatus('generating');
    setAiErrorMessage(undefined);
    setAiCandidates([]);

    try {
      const result = await window.gameContextManager.generateAiGameSummary({
        workspaceId,
        locale: language
      });

      const selectedFieldNames = new Set(selectedAiFields.map((field) => field.fieldName));
      setAiCandidates(result.fields
        .filter((field) => selectedFieldNames.has(field.fieldName))
        .map((field) => {
          const localField = selectedAiFields.find((selectedField) => selectedField.fieldName === field.fieldName);

          return {
            key: localField?.key ?? `game:${result.gameId}:${field.fieldName}`,
            fieldName: field.fieldName,
            fieldLabel: localField?.label ?? field.fieldLabel,
            originalValue: localField?.value ?? field.originalValue,
            candidateValue: field.candidateValue
          };
        }));
      setAiStatus('idle');
    } catch (error) {
      setAiStatus('error');
      setAiErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleConfirmAiGameSummary(): Promise<void> {
    if (aiCandidates.length === 0 || !game) {
      return;
    }

    setAiStatus('saving');
    setAiErrorMessage(undefined);

    const nextForm = {
      ...gameForm
    } as GameFormState;

    applyAiCandidatesToForm(nextForm, aiCandidates);
    setGameForm(nextForm);
    const ok = await handleSaveGame(nextForm);

    if (ok) {
      setAiDialogKind(undefined);
      setAiCandidates([]);
      setAiStatus('idle');
      return;
    }

    setAiStatus('error');
    setAiErrorMessage(text.aiConfirmError);
  }

  function handleCancelAiGameSummary(): void {
    setAiCandidates([]);
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
        modelName: apiForm.modelName
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
        modelName: apiForm.modelName
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
      setActiveDetailKind(game ? 'game' : 'empty');
      return;
    }

    await loadModuleState(workspaceId, moduleId);
    await loadContentState(workspaceId, undefined, moduleId);
    setActiveNodeKind('module');
    setActiveDetailKind('module');
    setSelectedImage(undefined);
    setSelectedIndexFile(undefined);
  }

  async function handleSaveModule(nextForm = moduleForm): Promise<boolean> {
    if (!workspaceId || !currentUser) {
      setModuleStatus('error');
      setModuleErrorMessage(text.moduleRequiresUser);
      showSaveFailure(text.moduleRequiresUser);
      return false;
    }

    if (!game) {
      setModuleStatus('error');
      setModuleErrorMessage(text.moduleRequiresGame);
      showSaveFailure(text.moduleRequiresGame);
      return false;
    }

    if (!nextForm.moduleName.trim()) {
      setModuleStatus('error');
      setModuleErrorMessage(text.moduleNameRequired);
      showSaveFailure(text.moduleNameRequired);
      return false;
    }

    setModuleStatus('saving');
    setModuleErrorMessage(undefined);

    try {
      const input = {
        workspaceId,
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
        ? await window.gameContextManager.updateModuleNode({ ...input, id: selectedModule.id })
        : await window.gameContextManager.createModuleNode(input);

      applyModuleState(state);
      await loadContentState(workspaceId, undefined, state.selectedModule?.id);
      setActiveNodeKind('module');
      setActiveDetailKind('module');
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      setModuleStatus('idle');
      showSaveSuccess();
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setModuleStatus('error');
      setModuleErrorMessage(detail);
      showSaveFailure(detail);
      return false;
    }
  }

  async function handleDeleteModule(moduleToDelete = selectedModule): Promise<void> {
    if (!workspaceId || !moduleToDelete) {
      return;
    }

    const confirmed = await requestConfirmation({
      title: text.confirmDialogTitle,
      message: text.confirmDeleteModule,
      detailLines: [text.directoryIndexStaleHint],
      confirmLabel: text.confirmDialogConfirm,
      cancelLabel: text.confirmDialogCancel
    });

    if (!confirmed) {
      return;
    }

    setModuleStatus('deleting');
    setModuleErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.deleteModuleNode({
        workspaceId,
        id: moduleToDelete.id
      });

      applyModuleState(state);
      await loadContentState(workspaceId);
      await loadImageState(workspaceId);
      setActiveNodeKind(state.selectedModule ? 'module' : 'game');
      setActiveDetailKind(state.selectedModule ? 'module' : game ? 'game' : 'empty');
      setModuleStatus('idle');
    } catch (error) {
      setModuleStatus('error');
      setModuleErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectContent(contentId: string): Promise<void> {
    if (!workspaceId) {
      return;
    }

    if (!contentId) {
      setSelectedContent(undefined);
      setContentForm(initialContentForm);
      setContentMarkdownPreview('');
      setActiveNodeKind(selectedModule ? 'module' : 'game');
      setActiveDetailKind(selectedModule ? 'module' : game ? 'game' : 'empty');
      return;
    }

    const targetContent = contents.find((content) => content.id === contentId);
    const parentModuleId = targetContent?.moduleId ?? selectedModule?.id;

    if (!parentModuleId) {
      return;
    }

    if (selectedModule?.id !== parentModuleId) {
      await loadModuleState(workspaceId, parentModuleId);
    }

    await loadContentState(workspaceId, contentId, parentModuleId);
    setActiveNodeKind('content');
    setActiveDetailKind('content');
    setSelectedImage(undefined);
    setSelectedIndexFile(undefined);
  }

  async function handleSaveContent(nextForm = contentForm): Promise<boolean> {
    if (!workspaceId || !currentUser) {
      setContentStatus('error');
      setContentErrorMessage(text.contentRequiresUser);
      showSaveFailure(text.contentRequiresUser);
      return false;
    }

    if (!selectedModule) {
      setContentStatus('error');
      setContentErrorMessage(text.contentRequiresModule);
      showSaveFailure(text.contentRequiresModule);
      return false;
    }

    if (!nextForm.title.trim()) {
      setContentStatus('error');
      setContentErrorMessage(text.contentTitleRequired);
      showSaveFailure(text.contentTitleRequired);
      return false;
    }

    setContentStatus('saving');
    setContentErrorMessage(undefined);

    try {
      const input = {
        workspaceId,
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
        ? await window.gameContextManager.updateContentNode({ ...input, id: selectedContent.id })
        : await window.gameContextManager.createContentNode(input);

      applyContentState(state);
      setActiveNodeKind('content');
      setActiveDetailKind('content');
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      setContentStatus('idle');
      showSaveSuccess();
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setContentStatus('error');
      setContentErrorMessage(detail);
      showSaveFailure(detail);
      return false;
    }
  }

  async function handleDeleteContent(contentToDelete = selectedContent): Promise<void> {
    if (!workspaceId || !contentToDelete) {
      return;
    }

    const confirmed = await requestConfirmation({
      title: text.confirmDialogTitle,
      message: text.confirmDeleteContent,
      detailLines: [text.directoryIndexStaleHint],
      confirmLabel: text.confirmDialogConfirm,
      cancelLabel: text.confirmDialogCancel
    });

    if (!confirmed) {
      return;
    }

    setContentStatus('deleting');
    setContentErrorMessage(undefined);

    try {
      const state = await window.gameContextManager.deleteContentNode({
        workspaceId,
        id: contentToDelete.id
      });

      applyContentState(state);
      await loadImageState(workspaceId);
      setActiveNodeKind(state.selectedContent ? 'content' : 'module');
      setActiveDetailKind(state.selectedContent ? 'content' : selectedModule ? 'module' : game ? 'game' : 'empty');
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
    const confirmed = await requestConfirmation({
      title: text.confirmDialogTitle,
      message: linkedNodes.length > 0 ? text.confirmDeleteReferencedImage : text.confirmDeleteImage,
      detailLines: [
        ...linkedNodes.map((reference) => `${reference.nodeType}:${reference.nodeId} ${reference.displayName}`),
        ...(linkedNodes.length > 0 ? [text.confirmDeleteImage] : []),
        text.directoryIndexStaleHint
      ],
      confirmLabel: text.confirmDialogConfirm,
      cancelLabel: text.confirmDialogCancel
    });

    if (!confirmed) {
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

  function openImageUploadDialog(source?: PendingImageUploadSource): void {
    setImageStatus('idle');
    setImageErrorMessage(undefined);
    setPendingImageUploadSource(source);
    setImageForm({
      displayName: source ? suggestImageDisplayName(source.originalFileName) : '',
      notes: ''
    });
    setSelectedImage(undefined);
    setSelectedIndexFile(undefined);
    setActiveDetailKind(hasWorkspace ? 'imageLibrary' : 'empty');
    setIsImageUploadDialogOpen(true);
  }

  function closeImageUploadDialog(): void {
    if (imageStatus === 'saving') {
      return;
    }

    setIsImageUploadDialogOpen(false);
    setPendingImageUploadSource(undefined);
    setImageForm(initialImageForm);
    setImageStatus('idle');
    setImageErrorMessage(undefined);
  }

  async function setImageUploadSourceFromFile(file: File): Promise<void> {
    try {
      const source = await createPendingImageUploadSource(file, text.imageUnsupportedFile);
      setPendingImageUploadSource(source);
      setImageErrorMessage(undefined);
      setImageStatus('idle');
      setImageForm((current) => ({
        ...current,
        displayName: current.displayName.trim() ? current.displayName : suggestImageDisplayName(source.originalFileName)
      }));
    } catch (error) {
      setImageStatus('error');
      setImageErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function openImageUploadDialogFromFile(file: File): Promise<void> {
    try {
      const source = await createPendingImageUploadSource(file, text.imageUnsupportedFile);
      openImageUploadDialog(source);
    } catch (error) {
      setImageStatus('error');
      setImageErrorMessage(error instanceof Error ? error.message : String(error));
      setActiveDetailKind(hasWorkspace ? 'imageLibrary' : 'empty');
    }
  }

  function handleLeftSidebarDragOver(event: React.DragEvent<HTMLElement>): void {
    if (!hasWorkspace || !hasImageDragData(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsLeftDragActive(true);
  }

  function handleLeftSidebarDragLeave(event: React.DragEvent<HTMLElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsLeftDragActive(false);
    }
  }

  function handleLeftSidebarDrop(event: React.DragEvent<HTMLElement>): void {
    if (!hasWorkspace) {
      return;
    }

    const file = getFirstImageFile(event.dataTransfer.files);

    if (!file) {
      return;
    }

    event.preventDefault();
    setIsLeftDragActive(false);
    void openImageUploadDialogFromFile(file);
  }

  function handleLeftSidebarPaste(event: React.ClipboardEvent<HTMLElement>): void {
    const file = getFirstImageFileFromClipboard(event.clipboardData);

    if (!hasWorkspace || !file) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void openImageUploadDialogFromFile(file);
  }

  function handleLeftSidebarContextMenu(event: React.MouseEvent<HTMLElement>): void {
    if (!hasWorkspace) {
      return;
    }

    event.preventDefault();
    const clickedTarget = getKnownWorkspaceItemFromEventTarget(event.target);
    const target = clickedTarget ?? getActiveKnownWorkspaceItem();
    setContextMenuErrorMessage(undefined);
    setLeftContextMenu({ x: event.clientX, y: event.clientY, target, deleteTarget: clickedTarget });
  }

  async function handlePasteFromNavigatorClipboard(): Promise<void> {
    setLeftContextMenu(undefined);

    if (!hasWorkspace) {
      return;
    }

    try {
      const file = await readImageFileFromNavigatorClipboard();

      if (!file) {
        setImageStatus('error');
        setImageErrorMessage(text.imagePasteUnavailable);
        setActiveDetailKind('imageLibrary');
        return;
      }

      await openImageUploadDialogFromFile(file);
    } catch (error) {
      setImageStatus('error');
      setImageErrorMessage(error instanceof Error ? error.message : text.imagePasteUnavailable);
      setActiveDetailKind('imageLibrary');
    }
  }

  async function handleOpenKnownItemInFolder(): Promise<void> {
    const target = leftContextMenu?.target;
    setLeftContextMenu(undefined);

    if (!workspaceId || !target) {
      setContextMenuErrorMessage(text.openInFolderUnavailable);
      return;
    }

    try {
      await window.gameContextManager.openKnownWorkspaceItem({
        workspaceId,
        item: target
      });
      setContextMenuErrorMessage(undefined);
    } catch (error) {
      setContextMenuErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDeleteIndexFile(file = selectedIndexFile): Promise<void> {
    if (!workspaceId || !file || !isKnownWorkspaceIndexFileName(file.label)) {
      setContextMenuErrorMessage(text.deleteUnavailable);
      return;
    }

    const confirmed = await requestConfirmation({
      title: text.confirmDialogTitle,
      message: text.confirmDeleteFile,
      detailLines: [file.label, ...(file.path ? [file.path] : [])],
      confirmLabel: text.confirmDialogConfirm,
      cancelLabel: text.confirmDialogCancel
    });

    if (!confirmed) {
      return;
    }

    setIndexFileStatus('deleting');
    setIndexFileErrorMessage(undefined);

    try {
      const result = await window.gameContextManager.deleteKnownWorkspaceItem({
        workspaceId,
        item: {
          kind: 'indexFile',
          fileName: file.label
        }
      });

      setExportedPaths((current) => current.filter((path) => path !== result.deletedPath && path !== file.path));

      if (selectedIndexFile?.id === file.id) {
        setSelectedIndexFile(undefined);
        setActiveDetailKind(game ? 'game' : 'empty');
      }

      setIndexFileStatus('idle');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setIndexFileStatus('error');
      setIndexFileErrorMessage(detail);
      showTransientNotice({ tone: 'danger', title: text.fileDeleteError, detail });
    }
  }

  async function handleDeleteContextTarget(): Promise<void> {
    const target = leftContextMenu?.deleteTarget;
    setLeftContextMenu(undefined);

    if (!target) {
      setContextMenuErrorMessage(text.deleteUnavailable);
      return;
    }

    if (target.kind === 'game') {
      await handleDeleteGame();
      return;
    }

    if (target.kind === 'module') {
      const moduleToDelete = modules.find((module) => module.id === target.id);

      if (!moduleToDelete) {
        setContextMenuErrorMessage(text.deleteUnavailable);
        return;
      }

      await handleDeleteModule(moduleToDelete);
      return;
    }

    if (target.kind === 'content') {
      const contentToDelete = contents.find((content) => content.id === target.id);

      if (!contentToDelete) {
        setContextMenuErrorMessage(text.deleteUnavailable);
        return;
      }

      await handleDeleteContent(contentToDelete);
      return;
    }

    if (target.kind === 'image') {
      const imageToDelete = images.find((image) => image.id === target.id);

      if (!imageToDelete) {
        setContextMenuErrorMessage(text.deleteUnavailable);
        return;
      }

      await handleDeleteImage(imageToDelete);
      return;
    }

    const file = findIndexFileSelectionByName(
      [...agentFileItems, ...rootIndexFileItems, ...gameIndexFileItems],
      target.fileName
    );

    await handleDeleteIndexFile(file);
  }

  function getActiveKnownWorkspaceItem(): KnownWorkspaceItem | undefined {
    if (activeDetailKind === 'game' && game) {
      return { kind: 'game' };
    }

    if (activeDetailKind === 'module' && selectedModule) {
      return { kind: 'module', id: selectedModule.id };
    }

    if (activeDetailKind === 'content' && selectedContent) {
      return { kind: 'content', id: selectedContent.id };
    }

    if (activeDetailKind === 'image' && selectedImage) {
      return { kind: 'image', id: selectedImage.id };
    }

    if (activeDetailKind === 'indexFile' && selectedIndexFile && isKnownWorkspaceIndexFileName(selectedIndexFile.label)) {
      return { kind: 'indexFile', fileName: selectedIndexFile.label };
    }

    return undefined;
  }

  function scrollToPanel(panelId: string): void {
    document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleShowGamePanel(): void {
    setSelectedModule(undefined);
    setModuleForm(initialModuleForm);
    setModuleMarkdownPreview('');
    setSelectedContent(undefined);
    setContentForm(initialContentForm);
    setContentMarkdownPreview('');
    setActiveNodeKind('game');
    setActiveDetailKind(hasWorkspace ? 'game' : 'empty');
    setSelectedImage(undefined);
    setSelectedIndexFile(undefined);
  }

  function handleShowImagePanel(): void {
    setActiveDetailKind(hasWorkspace ? 'imageLibrary' : 'empty');
    setSelectedImage(undefined);
    setSelectedIndexFile(undefined);
  }

  function handleSelectImage(image: ImageAssetView): void {
    setSelectedImage(image);
    setSelectedIndexFile(undefined);
    setActiveDetailKind('image');
  }

  function handleSelectImageFromDetail(image: ImageAssetView): void {
    handleSelectImage(image);
  }

  function handleToggleNodePreview(kind: ActiveNodeKind, nodeId: string): void {
    const nextPreviewNodeKey = buildNodePreviewKey(kind, nodeId);
    setPreviewNodeKey((current) => (current === nextPreviewNodeKey ? undefined : nextPreviewNodeKey));
  }

  function handleSelectIndexFile(file: IndexFileSelection): void {
    setSelectedIndexFile(file);
    setIndexFileStatus('idle');
    setIndexFileErrorMessage(undefined);
    setSelectedImage(undefined);
    setActiveDetailKind('indexFile');
  }

  function openCreateGameDialog(): void {
    setCreateNodeDialog({
      ...initialCreateNodeDialog,
      kind: 'game'
    });
  }

  function openCreateModuleDialog(): void {
    setCreateNodeDialog({
      ...initialCreateNodeDialog,
      kind: 'module'
    });
  }

  function openCreateContentDialog(parentModuleId?: string): void {
    const nextParentModuleId = parentModuleId ?? selectedModule?.id;

    if (!nextParentModuleId) {
      setContentStatus('error');
      setContentErrorMessage(text.contentRequiresModule);
      setActiveDetailKind(game ? 'game' : 'empty');
      return;
    }

    setCreateNodeDialog({
      ...initialCreateNodeDialog,
      kind: 'content',
      parentModuleId: nextParentModuleId
    });
  }

  function updateCreateNodeDialog<Field extends keyof CreateNodeDialogState>(
    field: Field,
    value: CreateNodeDialogState[Field]
  ): void {
    setCreateNodeDialog((current) => (current ? { ...current, [field]: value, errorMessage: undefined } : current));
  }

  async function handleSubmitCreateNodeDialog(): Promise<void> {
    if (!createNodeDialog) {
      return;
    }

    if (!currentUser) {
      setCreateNodeDialog((current) => (current ? { ...current, errorMessage: text.gameNodeRequiresUser } : current));
      return;
    }

    if (createNodeDialog.kind === 'game') {
      if (!createNodeDialog.gameName.trim()) {
        setCreateNodeDialog((current) => (current ? { ...current, errorMessage: text.gameNameRequired } : current));
        return;
      }

      if (!createNodeDialog.gameVersion.trim()) {
        setCreateNodeDialog((current) => (current ? { ...current, errorMessage: text.gameVersionRequired } : current));
        return;
      }

      setGameStatus('saving');
      setGameErrorMessage(undefined);

      try {
        const nextWorkspaceId = await handleCreateWorkspace();

        if (!nextWorkspaceId) {
          setGameStatus('idle');
          return;
        }

        const state = await window.gameContextManager.createGameNode({
          workspaceId: nextWorkspaceId,
          gameName: createNodeDialog.gameName,
          gameVersion: createNodeDialog.gameVersion,
          projectStage: createNodeDialog.projectStage,
          gameGenre: '',
          coreGameplay: '',
          mainFun: '',
          targetUsers: '',
          currentOperationGoal: '',
          currentMainProblems: '',
          mainOptimizationDirections: '',
          coverImageId: ''
        });

        applyGameState(state);
        setActiveNodeKind('game');
        setActiveDetailKind('game');
        setSelectedModule(undefined);
        setSelectedContent(undefined);
        setSelectedImage(undefined);
        setSelectedIndexFile(undefined);
        await loadImageState(nextWorkspaceId);
        await loadModuleState(nextWorkspaceId);
        await loadContentState(nextWorkspaceId);
        setCreateNodeDialog(undefined);
        setGameStatus('idle');
      } catch (error) {
        const nextErrorMessage = error instanceof Error ? error.message : String(error);
        setGameStatus('error');
        setGameErrorMessage(nextErrorMessage);
        setCreateNodeDialog((current) => (current ? { ...current, errorMessage: nextErrorMessage } : current));
      }
      return;
    }

    if (createNodeDialog.kind === 'module') {
      if (!workspaceId || !game) {
        setCreateNodeDialog((current) => (current ? { ...current, errorMessage: text.moduleRequiresGame } : current));
        return;
      }

      if (!createNodeDialog.moduleName.trim()) {
        setCreateNodeDialog((current) => (current ? { ...current, errorMessage: text.moduleNameRequired } : current));
        return;
      }

      setModuleStatus('saving');
      setModuleErrorMessage(undefined);

      try {
        const state = await window.gameContextManager.createModuleNode({
          workspaceId,
          moduleName: createNodeDialog.moduleName,
          modulePositioning: '',
          systemRules: '',
          resourceFlow: '',
          imageIds: [],
          playerMainActions: '',
          subjectiveFun: '',
          subjectiveProblems: '',
          subjectiveOptimizationDirections: ''
        });

        applyModuleState(state);
        await loadContentState(workspaceId, undefined, state.selectedModule?.id);
        setActiveNodeKind('module');
        setActiveDetailKind('module');
        setSelectedImage(undefined);
        setSelectedIndexFile(undefined);
        setCreateNodeDialog(undefined);
        setModuleStatus('idle');
      } catch (error) {
        const nextErrorMessage = error instanceof Error ? error.message : String(error);
        setModuleStatus('error');
        setModuleErrorMessage(nextErrorMessage);
        setCreateNodeDialog((current) => (current ? { ...current, errorMessage: nextErrorMessage } : current));
      }
      return;
    }

    if (!workspaceId || !createNodeDialog.parentModuleId) {
      setCreateNodeDialog((current) => (current ? { ...current, errorMessage: text.contentRequiresModule } : current));
      return;
    }

    if (!createNodeDialog.contentTitle.trim()) {
      setCreateNodeDialog((current) => (current ? { ...current, errorMessage: text.contentTitleRequired } : current));
      return;
    }

    setContentStatus('saving');
    setContentErrorMessage(undefined);

    try {
      await loadModuleState(workspaceId, createNodeDialog.parentModuleId);
      const state = await window.gameContextManager.createContentNode({
        workspaceId,
        moduleId: createNodeDialog.parentModuleId,
        title: createNodeDialog.contentTitle,
        imageIds: [],
        accountDay: '',
        cumulativePaymentAmount: '',
        maxMainlineProgress: '',
        characterLevel: '',
        processDescription: '',
        subjectiveFun: '',
        subjectiveKnownProblems: '',
        subjectiveOptimizationDirections: ''
      });

      applyContentState(state);
      setActiveNodeKind('content');
      setActiveDetailKind('content');
      setSelectedImage(undefined);
      setSelectedIndexFile(undefined);
      setCreateNodeDialog(undefined);
      setContentStatus('idle');
    } catch (error) {
      const nextErrorMessage = error instanceof Error ? error.message : String(error);
      setContentStatus('error');
      setContentErrorMessage(nextErrorMessage);
      setCreateNodeDialog((current) => (current ? { ...current, errorMessage: nextErrorMessage } : current));
    }
  }

  function handleStartNewModule(): void {
    openCreateModuleDialog();
  }

  function handleStartNewContent(): void {
    openCreateContentDialog();
  }

  return (
    <main className="grid h-screen overflow-hidden grid-cols-[320px_minmax(0,1fr)] bg-slate-100 text-slate-950">
      <aside
        className={`relative flex h-screen min-h-0 flex-col border-r bg-white transition ${
          isLeftDragActive ? 'border-orange-300 ring-4 ring-inset ring-orange-200' : 'border-slate-200'
        }`}
        onDragOver={handleLeftSidebarDragOver}
        onDragLeave={handleLeftSidebarDragLeave}
        onDrop={handleLeftSidebarDrop}
        onPaste={handleLeftSidebarPaste}
        onContextMenu={handleLeftSidebarContextMenu}
      >
        {isLeftDragActive ? (
          <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-md border border-dashed border-orange-400 bg-orange-50/90 text-sm font-medium text-orange-800">
            {text.imageDropActiveHint}
          </div>
        ) : null}
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-sm font-semibold text-slate-950">{text.appName}</h1>
            <button
              className="h-8 rounded-md bg-cyan-700 px-3 text-xs font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              disabled={workspaceStatus === 'creating' || workspaceStatus === 'importing' || workspaceStatus === 'refreshing'}
              onClick={() => {
                void handleImportWorkspace();
              }}
            >
              {workspaceStatus === 'importing' ? text.importingWorkspace : text.importButton}
            </button>
          </div>
          {hasWorkspace ? (
            <p className="mt-2 truncate text-xs text-slate-500" title={selectedWorkspacePath}>
              {selectedWorkspacePath}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 py-4">
          {hasWorkspace ? (
            <WorkspaceTree
              text={text}
              game={game}
              modules={modules}
              selectedModule={selectedModule}
              contents={contents}
              selectedContent={selectedContent}
              images={images}
              selectedImage={selectedImage}
              activeDetailKind={activeDetailKind}
              activeNodeKind={activeNodeKind}
              agentFiles={agentFileItems}
              rootIndexFiles={rootIndexFileItems}
              gameIndexFiles={gameIndexFileItems}
              selectedIndexFile={selectedIndexFile}
              isGameCollapsed={isGameCollapsed}
              collapsedModuleIds={collapsedModuleIds}
              isImageLibraryCollapsed={isImageLibraryCollapsed}
              isAgentFilesCollapsed={isAgentFilesCollapsed}
              isIndexFilesCollapsed={isIndexFilesCollapsed}
              onSelectGame={handleShowGamePanel}
              onCreateGame={openCreateGameDialog}
              onSelectModule={(moduleId) => {
                void handleSelectModule(moduleId);
              }}
              onSelectContent={(contentId) => {
                void handleSelectContent(contentId);
              }}
              onShowImageLibrary={handleShowImagePanel}
              onSelectImage={handleSelectImage}
              onSelectIndexFile={handleSelectIndexFile}
              onNewModule={handleStartNewModule}
              onNewContent={openCreateContentDialog}
              onOpenImageUpload={() => openImageUploadDialog()}
              onToggleGameCollapse={toggleGameCollapse}
              onToggleModuleCollapse={toggleModuleCollapse}
              onToggleImageLibraryCollapse={() => setIsImageLibraryCollapsed((current) => !current)}
              onToggleAgentFilesCollapse={() => setIsAgentFilesCollapsed((current) => !current)}
              onToggleIndexFilesCollapse={() => setIsIndexFilesCollapsed((current) => !current)}
            />
          ) : (
            <EmptyTree text={text} onCreateGame={openCreateGameDialog} />
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 px-3 py-3">
          {workspaceStatus === 'canceled' ? <Notice tone="muted" title={text.workspaceCanceled} /> : null}
          {workspaceStatus === 'error' ? (
            <Notice
              tone="danger"
              title={workspaceLastAction === 'import' ? text.workspaceImportError : text.workspaceError}
              detail={errorMessage}
            />
          ) : null}
          {exportStatus === 'success' ? <Notice tone="muted" title={text.exportSuccess} /> : null}
          {exportStatus === 'error' ? <Notice tone="danger" title={text.exportError} detail={exportErrorMessage} /> : null}
          {contextMenuErrorMessage ? <Notice tone="danger" title={text.openInFolderError} detail={contextMenuErrorMessage} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-9 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              type="button"
              disabled={exportButtonDisabled}
              onClick={() => {
                void handleExportAgentFiles();
              }}
            >
              {exportStatus === 'exportingAgentFiles' ? text.exporting : text.exportAgentFiles}
            </button>
            <button
              className="h-9 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              type="button"
              disabled={exportButtonDisabled || !game}
              onClick={() => {
                void handleExportDirectoryIndex();
              }}
            >
              {exportStatus === 'exportingDirectoryIndex' ? text.exporting : text.exportDirectoryIndex}
            </button>
          </div>
          <button
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-700"
            type="button"
            onClick={handleOpenSettings}
          >
            <span>{text.settingsButton}</span>
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7A2 2 0 0 1 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </aside>

      <section className="min-h-0 overflow-auto px-6 py-5">
        <div className="mb-3 flex justify-end">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            type="button"
            aria-label={text.refreshWorkspace}
            title={workspaceStatus === 'refreshing' ? text.refreshingWorkspace : text.refreshWorkspace}
            disabled={!hasWorkspace || workspaceStatus === 'creating' || workspaceStatus === 'importing' || workspaceStatus === 'refreshing'}
            onClick={() => {
              void handleRefreshWorkspace();
            }}
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 ${workspaceStatus === 'refreshing' ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 0 1-15.4 6.4L4 16.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 12A9 9 0 0 1 18.4 5.6L20 7.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 22v-5.2h5.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 2v5.2h-5.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="w-full">{hasWorkspace ? detailContent : <EmptyDetail text={text} />}</div>
      </section>

      {isSettingsOpen ? (
        <SettingsModal
          text={text}
          language={language}
          draftLanguage={settingsDraftLanguage}
          currentUser={currentUser}
          settingsStatus={settingsStatus}
          settingsErrorMessage={settingsErrorMessage}
          apiConfig={apiConfig}
          apiForm={apiForm}
          apiStatus={apiStatus}
          apiLastAction={apiLastAction}
          apiErrorMessage={apiErrorMessage}
          apiTestResult={apiTestResult}
          onDraftLanguageChange={setSettingsDraftLanguage}
          onConfirmLanguageChange={() => {
            void handleConfirmLanguageChange();
          }}
          onLogout={() => {
            void handleLogoutCurrentUser();
          }}
          onClose={() => setIsSettingsOpen(false)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onApiFormChange={updateApiForm}
          onSaveApi={() => {
            void handleSaveApiConfig();
          }}
          onTestApi={() => {
            void handleTestApiConnection();
          }}
        />
      ) : null}

      {isHelpOpen ? <HelpReadmeModal text={text} onClose={() => setIsHelpOpen(false)} /> : null}

      {createNodeDialog ? (
        <CreateNodeDialog
          text={text}
          language={language}
          dialog={createNodeDialog}
          gameStatus={gameStatus}
          moduleStatus={moduleStatus}
          contentStatus={contentStatus}
          onDialogChange={updateCreateNodeDialog}
          onSubmit={() => {
            void handleSubmitCreateNodeDialog();
          }}
          onClose={() => setCreateNodeDialog(undefined)}
        />
      ) : null}

      {isImageUploadDialogOpen ? (
        <ImageUploadDialog
          text={text}
          currentUser={currentUser}
          game={game}
          form={imageForm}
          source={pendingImageUploadSource}
          status={imageStatus}
          errorMessage={imageErrorMessage}
          onFormChange={(field, value) => {
            setImageForm((current) => ({
              ...current,
              [field]: value
            }));
            setImageErrorMessage(undefined);
            setImageStatus('idle');
          }}
          onSelectFile={(file) => {
            void setImageUploadSourceFromFile(file);
          }}
          onSubmit={() => {
            void handleUploadImage();
          }}
          onClose={closeImageUploadDialog}
        />
      ) : null}

      {aiDialogKind ? (
        <AiAssistDialog
          text={text}
          kind={aiDialogKind}
          mode={aiAssistForm.mode}
          fields={
            aiDialogKind === 'moduleSummary'
              ? aiEditableFields.filter((field) => getModuleSummaryFieldKeys(aiEditableFields).includes(field.key))
              : aiDialogKind === 'gameSummary'
                ? aiEditableFields.filter((field) => getGameSummaryFieldKeys(aiEditableFields).includes(field.key))
                : aiEditableFields
          }
          selectedFields={selectedAiFields}
          candidates={aiCandidates}
          userInstruction={aiAssistForm.userInstruction}
          status={aiStatus}
          errorMessage={aiErrorMessage}
          onModeChange={(mode) => updateAiAssistForm('mode', mode)}
          onInstructionChange={(value) => updateAiAssistForm('userInstruction', value)}
          onAddField={addAiSelectedField}
          onRemoveField={removeAiSelectedField}
          onCandidateChange={updateAiCandidateValue}
          onGenerate={() => {
            void (aiDialogKind === 'moduleSummary'
              ? handleGenerateAiModuleSummary()
              : aiDialogKind === 'gameSummary'
                ? handleGenerateAiGameSummary()
                : handleGenerateAiFieldEdit());
          }}
          onConfirm={() => {
            void (aiDialogKind === 'moduleSummary'
              ? handleConfirmAiModuleSummary()
              : aiDialogKind === 'gameSummary'
                ? handleConfirmAiGameSummary()
                : handleConfirmAiFieldEdit());
          }}
          onCancelCandidates={
            aiDialogKind === 'moduleSummary'
              ? handleCancelAiModuleSummary
              : aiDialogKind === 'gameSummary'
                ? handleCancelAiGameSummary
                : handleCancelAiFieldEdit
          }
          onClose={closeAiDialog}
        />
      ) : null}

      {leftContextMenu ? (
        <div
          className="fixed z-50 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
          style={{ left: leftContextMenu.x, top: leftContextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="h-8 w-full rounded px-2 text-left text-sm text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
            type="button"
            onClick={() => {
              void handlePasteFromNavigatorClipboard();
            }}
          >
            {text.imagePasteAction}
          </button>
          <button
            className="h-8 w-full rounded px-2 text-left text-sm text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={!leftContextMenu.target}
            onClick={() => {
              void handleOpenKnownItemInFolder();
            }}
          >
            {text.openInFolderAction}
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            className="h-8 w-full rounded px-2 text-left text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={!leftContextMenu.deleteTarget}
            onClick={() => {
              void handleDeleteContextTarget();
            }}
          >
            {text.contextDeleteAction}
          </button>
        </div>
      ) : null}

      {confirmationDialog ? (
        <ConfirmationDialog dialog={confirmationDialog} onCancel={() => resolveConfirmationDialog(false)} onConfirm={() => resolveConfirmationDialog(true)} />
      ) : null}

      {transientNotice ? <TransientNotice notice={transientNotice} /> : null}

      {isActiveNodePreviewOpen ? (
        <MarkdownPreviewModal
          text={text}
          nodeTitle={activeNodeTitle}
          emptyText={activePreviewEmptyText}
          markdownPreview={activeMarkdownPreview}
          onClose={() => setPreviewNodeKey(undefined)}
        />
      ) : null}

      {isLoginRequired ? (
        <LoginModal
          text={text}
          users={users}
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
      ) : null}
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

function WorkflowGuide({
  text,
  hasWorkspace,
  hasGame,
  hasImages,
  hasModules,
  hasContents
}: {
  text: (typeof copy)[Language];
  hasWorkspace: boolean;
  hasGame: boolean;
  hasImages: boolean;
  hasModules: boolean;
  hasContents: boolean;
}): React.JSX.Element {
  const states = [hasWorkspace, hasGame, hasImages, hasModules, hasContents];
  const currentIndex = states.findIndex((done) => !done);
  const activeIndex = currentIndex === -1 ? states.length - 1 : currentIndex;

  return (
    <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase text-cyan-700">{text.workflowTitle}</h3>
        <p className="text-xs text-slate-500">{text.detailSubtitleReady}</p>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-5">
        {text.workflowSteps.map((step, index) => {
          const done = states[index];
          const current = index === activeIndex && !done;
          const statusText = done ? text.workflowDone : current ? text.workflowCurrent : text.workflowPending;
          const tone = done
            ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
            : current
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-slate-50 text-slate-500';

          return (
            <li key={step} className={`rounded-md border px-3 py-2 ${tone}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{index + 1}</span>
                <span className="text-[10px]">{statusText}</span>
              </div>
              <p className="mt-2 truncate text-sm font-medium" title={step}>
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EmptyTree({
  text,
  onCreateGame
}: {
  text: (typeof copy)[Language];
  onCreateGame: () => void;
}): React.JSX.Element {
  return (
    <nav aria-label={text.leftTreeLabel} className="space-y-1">
      <TreeRow depth={0} label={text.createRootPlaceholder} tone="placeholder" actionLabel={text.createGame} onAction={onCreateGame} />
      <TreeRow depth={1} label={text.createModulePlaceholder} tone="placeholder" />
      <TreeRow depth={2} label={text.createContentPlaceholder} tone="placeholder" />
    </nav>
  );
}

function WorkspaceTree({
  text,
  game,
  modules,
  selectedModule,
  contents,
  selectedContent,
  images,
  selectedImage,
  activeDetailKind,
  activeNodeKind,
  agentFiles,
  rootIndexFiles,
  gameIndexFiles,
  selectedIndexFile,
  isGameCollapsed,
  collapsedModuleIds,
  isImageLibraryCollapsed,
  isAgentFilesCollapsed,
  isIndexFilesCollapsed,
  onSelectGame,
  onCreateGame,
  onSelectModule,
  onSelectContent,
  onShowImageLibrary,
  onSelectImage,
  onSelectIndexFile,
  onNewModule,
  onNewContent,
  onOpenImageUpload,
  onToggleGameCollapse,
  onToggleModuleCollapse,
  onToggleImageLibraryCollapse,
  onToggleAgentFilesCollapse,
  onToggleIndexFilesCollapse
}: {
  text: (typeof copy)[Language];
  game?: GameNode;
  modules: ModuleNode[];
  selectedModule?: ModuleNode;
  contents: ContentNode[];
  selectedContent?: ContentNode;
  images: ImageAssetView[];
  selectedImage?: ImageAssetView;
  activeDetailKind: ActiveDetailKind;
  activeNodeKind: ActiveNodeKind;
  agentFiles: IndexFileSelection[];
  rootIndexFiles: IndexFileSelection[];
  gameIndexFiles: IndexFileSelection[];
  selectedIndexFile?: IndexFileSelection;
  isGameCollapsed: boolean;
  collapsedModuleIds: string[];
  isImageLibraryCollapsed: boolean;
  isAgentFilesCollapsed: boolean;
  isIndexFilesCollapsed: boolean;
  onSelectGame: () => void;
  onCreateGame: () => void;
  onSelectModule: (moduleId: string) => void;
  onSelectContent: (contentId: string) => void;
  onShowImageLibrary: () => void;
  onSelectImage: (image: ImageAssetView) => void;
  onSelectIndexFile: (file: IndexFileSelection) => void;
  onNewModule: () => void;
  onNewContent: (moduleId?: string) => void;
  onOpenImageUpload: () => void;
  onToggleGameCollapse: () => void;
  onToggleModuleCollapse: (moduleId: string) => void;
  onToggleImageLibraryCollapse: () => void;
  onToggleAgentFilesCollapse: () => void;
  onToggleIndexFilesCollapse: () => void;
}): React.JSX.Element {
  const indexFiles = [...rootIndexFiles, ...gameIndexFiles];
  const hasCollapsibleGameChildren = Boolean(game);

  return (
    <nav aria-label={text.leftTreeLabel} className="space-y-3">
      <div className="space-y-1">
        <TreeRow
          depth={0}
          label={game?.gameName ?? text.createRootPlaceholder}
          active={activeDetailKind === 'game' && activeNodeKind === 'game'}
          tone={game ? 'node' : 'placeholder'}
          contextTarget={game ? { kind: 'game' } : undefined}
          onClick={onSelectGame}
          actionLabel={game ? text.createModule : text.createGame}
          onAction={game ? onNewModule : onCreateGame}
          collapsed={isGameCollapsed}
          collapseDisabled={!hasCollapsibleGameChildren}
          collapseLabel={isGameCollapsed ? text.expandTreeGroup : text.collapseTreeGroup}
          onToggleCollapse={game ? onToggleGameCollapse : undefined}
        />
        {isGameCollapsed ? null : modules.length > 0 ? (
          modules.map((module) => {
            const moduleContents = contents.filter((content) => content.moduleId === module.id);
            const isModuleCollapsed = collapsedModuleIds.includes(module.id);

            return (
              <div key={module.id} className="space-y-1">
                <TreeRow
                  depth={1}
                  label={module.moduleName}
                  active={activeDetailKind === 'module' && activeNodeKind === 'module' && selectedModule?.id === module.id}
                  tone="node"
                  contextTarget={{ kind: 'module', id: module.id }}
                  onClick={() => onSelectModule(module.id)}
                  actionLabel={text.createContent}
                  onAction={() => onNewContent(module.id)}
                  collapsed={isModuleCollapsed}
                  collapseDisabled={moduleContents.length === 0}
                  collapseLabel={isModuleCollapsed ? text.expandTreeGroup : text.collapseTreeGroup}
                  onToggleCollapse={() => onToggleModuleCollapse(module.id)}
                />
                {isModuleCollapsed ? null : moduleContents.length > 0 ? (
                  moduleContents.map((content) => (
                    <TreeRow
                      key={content.id}
                      depth={2}
                      label={content.title}
                      active={activeDetailKind === 'content' && activeNodeKind === 'content' && selectedContent?.id === content.id}
                      tone="node"
                      contextTarget={{ kind: 'content', id: content.id }}
                      onClick={() => onSelectContent(content.id)}
                    />
                  ))
                ) : (
                  <TreeRow
                    depth={2}
                    label={text.createContentPlaceholder}
                    tone="placeholder"
                    onClick={() => onNewContent(module.id)}
                    actionLabel={text.createContent}
                    onAction={() => onNewContent(module.id)}
                  />
                )}
              </div>
            );
          })
        ) : (
          <TreeRow
            depth={1}
            label={text.createModulePlaceholder}
            tone="placeholder"
            onClick={onNewModule}
            actionLabel={text.createModule}
            onAction={onNewModule}
          />
        )}
      </div>

      {isGameCollapsed ? null : <div className="space-y-1">
        <TreeRow
          depth={1}
          label={text.imageLibrary}
          active={activeDetailKind === 'imageLibrary'}
          tone="image"
          onClick={onShowImageLibrary}
          actionLabel={text.uploadImage}
          onAction={onOpenImageUpload}
          collapsed={isImageLibraryCollapsed}
          collapseDisabled={images.length === 0}
          collapseLabel={isImageLibraryCollapsed ? text.expandTreeGroup : text.collapseTreeGroup}
          onToggleCollapse={onToggleImageLibraryCollapse}
        />
        {isImageLibraryCollapsed ? null : images.map((image) => (
          <TreeRow
            key={image.id}
            depth={2}
            label={image.displayName}
            active={activeDetailKind === 'image' && selectedImage?.id === image.id}
            tone="image"
            thumbnailSrc={image.previewDataUrl}
            contextTarget={{ kind: 'image', id: image.id }}
            onClick={() => onSelectImage(image)}
          />
        ))}
      </div>}

      {agentFiles.length > 0 || rootIndexFiles.length > 0 || gameIndexFiles.length > 0 ? (
        <div className="space-y-1 border-t border-slate-200 pt-3">
          {agentFiles.length > 0 ? (
            <TreeSectionLabel
              label={text.agentFiles}
              collapsed={isAgentFilesCollapsed}
              collapseDisabled={agentFiles.length === 0}
              collapseLabel={isAgentFilesCollapsed ? text.expandTreeGroup : text.collapseTreeGroup}
              onToggleCollapse={onToggleAgentFilesCollapse}
            />
          ) : null}
          {isAgentFilesCollapsed ? null : agentFiles.map((file) => (
            <TreeRow
              key={file.id}
              depth={0}
              label={file.label}
              active={activeDetailKind === 'indexFile' && selectedIndexFile?.id === file.id}
              tone="file"
              contextTarget={{ kind: 'indexFile', fileName: file.label as KnownWorkspaceIndexFileName }}
              onClick={() => onSelectIndexFile(file)}
            />
          ))}
          {indexFiles.length > 0 ? (
            <TreeSectionLabel
              label={text.indexFiles}
              collapsed={isIndexFilesCollapsed}
              collapseDisabled={indexFiles.length === 0}
              collapseLabel={isIndexFilesCollapsed ? text.expandTreeGroup : text.collapseTreeGroup}
              onToggleCollapse={onToggleIndexFilesCollapse}
            />
          ) : null}
          {isIndexFilesCollapsed
            ? null
            : rootIndexFiles.map((file) => (
                <TreeRow
                  key={file.id}
                  depth={0}
                  label={file.label}
                  active={activeDetailKind === 'indexFile' && selectedIndexFile?.id === file.id}
                  tone="file"
                  contextTarget={{ kind: 'indexFile', fileName: file.label as KnownWorkspaceIndexFileName }}
                  onClick={() => onSelectIndexFile(file)}
                />
              ))}
          {isIndexFilesCollapsed
            ? null
            : gameIndexFiles.map((file) => (
                <TreeRow
                  key={file.id}
                  depth={0}
                  label={file.label}
                  active={activeDetailKind === 'indexFile' && selectedIndexFile?.id === file.id}
                  tone="file"
                  contextTarget={{ kind: 'indexFile', fileName: file.label as KnownWorkspaceIndexFileName }}
                  onClick={() => onSelectIndexFile(file)}
                />
              ))}
        </div>
      ) : null}
    </nav>
  );
}

function renderActiveDetail({
  activeDetailKind,
  text,
  workspaceId,
  language,
  currentUser,
  users,
  game,
  gameForm,
  isGameDirty,
  gameStatus,
  gameErrorMessage,
  images,
  imageStatus,
  imageErrorMessage,
  selectedImage,
  modules,
  selectedModule,
  moduleForm,
  isModuleDirty,
  moduleStatus,
  moduleErrorMessage,
  contents,
  selectedContent,
  contentForm,
  isContentDirty,
  contentStatus,
  contentErrorMessage,
  selectedIndexFile,
  indexFileStatus,
  indexFileErrorMessage,
  updateGameForm,
  updateModuleForm,
  updateContentForm,
  openCreateGameDialog,
  handleSaveGame,
  handleDeleteGame,
  openImageUploadDialog,
  handleDeleteImage,
  handleSelectModule,
  handleStartNewModule,
  handleSaveModule,
  handleDeleteModule,
  handleSelectContent,
  handleStartNewContent,
  handleSaveContent,
  handleDeleteContent,
  handleDeleteIndexFile,
  handleToggleNodePreview,
  handleSelectImageFromDetail,
  openAiFieldDialog,
  openAiModuleSummaryDialog,
  openAiGameSummaryDialog
}: {
  activeDetailKind: ActiveDetailKind;
  text: (typeof copy)[Language];
  workspaceId?: string;
  language: Language;
  currentUser?: LocalUser;
  users: LocalUser[];
  game?: GameNode;
  gameForm: GameFormState;
  isGameDirty: boolean;
  gameStatus: GameStatus;
  gameErrorMessage?: string;
  images: ImageAssetView[];
  imageStatus: ImageStatus;
  imageErrorMessage?: string;
  selectedImage?: ImageAssetView;
  modules: ModuleNode[];
  selectedModule?: ModuleNode;
  moduleForm: ModuleFormState;
  isModuleDirty: boolean;
  moduleStatus: ModuleStatus;
  moduleErrorMessage?: string;
  contents: ContentNode[];
  selectedContent?: ContentNode;
  contentForm: ContentFormState;
  isContentDirty: boolean;
  contentStatus: ContentStatus;
  contentErrorMessage?: string;
  selectedIndexFile?: IndexFileSelection;
  indexFileStatus: IndexFileStatus;
  indexFileErrorMessage?: string;
  updateGameForm: <Field extends keyof GameFormState>(field: Field, value: GameFormState[Field]) => void;
  updateModuleForm: <Field extends keyof ModuleFormState>(field: Field, value: ModuleFormState[Field]) => void;
  updateContentForm: <Field extends keyof ContentFormState>(field: Field, value: ContentFormState[Field]) => void;
  openCreateGameDialog: () => void;
  handleSaveGame: () => void;
  handleDeleteGame: () => void;
  openImageUploadDialog: () => void;
  handleDeleteImage: (image: ImageAssetView) => void;
  handleSelectModule: (moduleId: string) => void;
  handleStartNewModule: () => void;
  handleSaveModule: () => void;
  handleDeleteModule: () => void;
  handleSelectContent: (contentId: string) => void;
  handleStartNewContent: () => void;
  handleSaveContent: () => void;
  handleDeleteContent: () => void;
  handleDeleteIndexFile: (file?: IndexFileSelection) => void;
  handleToggleNodePreview: (kind: ActiveNodeKind, nodeId: string) => void;
  handleSelectImageFromDetail: (image: ImageAssetView) => void;
  openAiFieldDialog: (mode: AiAssistFormState['mode']) => void;
  openAiModuleSummaryDialog: () => void;
  openAiGameSummaryDialog: () => void;
}): React.JSX.Element {
  if (activeDetailKind === 'game') {
    return (
      <GameNodePanel
        text={text}
        language={language}
        currentUser={currentUser}
        users={users}
        game={game}
        images={images}
        form={gameForm}
        isDirty={isGameDirty}
        status={gameStatus}
        errorMessage={gameErrorMessage}
        onFormChange={updateGameForm}
        onCreate={openCreateGameDialog}
        onSave={handleSaveGame}
        onDelete={handleDeleteGame}
        onTogglePreview={handleToggleNodePreview}
        onSelectImage={handleSelectImageFromDetail}
        onOpenAiFieldDialog={openAiFieldDialog}
        onOpenAiGameSummaryDialog={openAiGameSummaryDialog}
      />
    );
  }

  if (activeDetailKind === 'module') {
    return (
      <ModuleNodePanel
        text={text}
        currentUser={currentUser}
        users={users}
        game={game}
        modules={modules}
        selectedModule={selectedModule}
        images={images}
        form={moduleForm}
        isDirty={isModuleDirty}
        status={moduleStatus}
        errorMessage={moduleErrorMessage}
        onFormChange={updateModuleForm}
        onSelectModule={handleSelectModule}
        onNewModule={handleStartNewModule}
        onSave={handleSaveModule}
        onDelete={() => {
          void handleDeleteModule();
        }}
        onTogglePreview={handleToggleNodePreview}
        onSelectImage={handleSelectImageFromDetail}
        onOpenAiFieldDialog={openAiFieldDialog}
        onOpenAiModuleSummaryDialog={openAiModuleSummaryDialog}
      />
    );
  }

  if (activeDetailKind === 'content') {
    return (
      <ContentNodePanel
        text={text}
        currentUser={currentUser}
        users={users}
        selectedModule={selectedModule}
        contents={contents}
        selectedContent={selectedContent}
        images={images}
        form={contentForm}
        isDirty={isContentDirty}
        status={contentStatus}
        errorMessage={contentErrorMessage}
        onFormChange={updateContentForm}
        onSelectContent={handleSelectContent}
        onNewContent={handleStartNewContent}
        onSave={handleSaveContent}
        onDelete={() => {
          void handleDeleteContent();
        }}
        onTogglePreview={handleToggleNodePreview}
        onSelectImage={handleSelectImageFromDetail}
        onOpenAiFieldDialog={openAiFieldDialog}
      />
    );
  }

  if (activeDetailKind === 'imageLibrary') {
    return (
      <ImageLibraryPanel
        text={text}
        currentUser={currentUser}
        game={game}
        images={images}
        status={imageStatus}
        errorMessage={imageErrorMessage}
        onOpenUpload={openImageUploadDialog}
        onDeleteImage={handleDeleteImage}
      />
    );
  }

  if (activeDetailKind === 'image' && selectedImage) {
    return <ImageDetailPanel text={text} currentUser={currentUser} image={selectedImage} status={imageStatus} onDeleteImage={handleDeleteImage} />;
  }

  if (activeDetailKind === 'indexFile' && selectedIndexFile) {
    return (
      <IndexFileDetailPanel
        text={text}
        workspaceId={workspaceId}
        file={selectedIndexFile}
        status={indexFileStatus}
        errorMessage={indexFileErrorMessage}
        onDelete={handleDeleteIndexFile}
      />
    );
  }

  return <EmptyDetail text={text} />;
}

function ImageDetailPanel({
  text,
  currentUser,
  image,
  status,
  onDeleteImage
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  image: ImageAssetView;
  status: ImageStatus;
  onDeleteImage: (image: ImageAssetView) => void;
}): React.JSX.Element {
  const canDelete = Boolean(currentUser && currentUser.id === image.uploaderId) && status !== 'deleting';
  const linkedNodes = image.linkedNodes ?? [];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-orange-600">{text.imageDetailTitle}</p>
          <h2 className="mt-2 truncate text-lg font-semibold text-slate-950">{image.displayName}</h2>
          <p className="mt-1 truncate font-mono text-xs text-slate-500">{image.id}</p>
        </div>
        <button
          className="h-9 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
          type="button"
          disabled={!canDelete}
          onClick={() => onDeleteImage(image)}
        >
          {status === 'deleting' ? text.deletingImage : text.deleteImage}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        {image.previewDataUrl ? (
          <img className="max-h-[520px] w-full object-contain" src={image.previewDataUrl} alt={image.displayName} />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">{image.displayName}</div>
        )}
      </div>

      {image.notes ? <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{image.notes}</p> : null}
      <ImageReferencesBlock text={text} linkedNodes={linkedNodes} />
    </section>
  );
}

function IndexFileDetailPanel({
  text,
  workspaceId,
  file,
  status,
  errorMessage,
  onDelete
}: {
  text: (typeof copy)[Language];
  workspaceId?: string;
  file: IndexFileSelection;
  status: IndexFileStatus;
  errorMessage?: string;
  onDelete: (file?: IndexFileSelection) => void;
}): React.JSX.Element {
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [previewContent, setPreviewContent] = useState('');
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string>();
  const sectionTitle = isAgentInstructionFile(file.label) ? text.agentFiles : text.indexFiles;

  useEffect(() => {
    let isMounted = true;

    async function loadFilePreview(): Promise<void> {
      if (!workspaceId || !isKnownWorkspaceIndexFileName(file.label)) {
        setPreviewStatus('error');
        setPreviewErrorMessage(text.filePreviewError);
        return;
      }

      setPreviewStatus('loading');
      setPreviewErrorMessage(undefined);

      try {
        const result = await window.gameContextManager.readKnownWorkspaceItem({
          workspaceId,
          item: {
            kind: 'indexFile',
            fileName: file.label
          }
        });

        if (!isMounted) {
          return;
        }

        setPreviewContent(result.content);
        setPreviewStatus('ready');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPreviewStatus('error');
        setPreviewErrorMessage(error instanceof Error ? error.message : String(error));
      }
    }

    void loadFilePreview();

    return () => {
      isMounted = false;
    };
  }, [file.label, text.filePreviewError, workspaceId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-700">{sectionTitle}</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{file.label}</h2>
        </div>
        <button
          className="h-9 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
          type="button"
          disabled={status === 'deleting'}
          onClick={() => onDelete(file)}
        >
          {status === 'deleting' ? text.deletingFile : text.deleteFile}
        </button>
      </div>
      {status === 'error' ? <Notice tone="danger" title={text.fileDeleteError} detail={errorMessage} /> : null}
      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-600">{text.filePreviewTitle}</p>
        {previewStatus === 'loading' ? (
          <p className="mt-3 text-sm text-slate-500">{text.filePreviewLoading}</p>
        ) : previewStatus === 'error' ? (
          <Notice tone="danger" title={text.filePreviewError} detail={previewErrorMessage} />
        ) : previewContent ? (
          <pre className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 shadow-inner">
            {previewContent}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-slate-500">{text.filePreviewEmpty}</p>
        )}
      </div>
    </section>
  );
}

function ImageLibraryPanel({
  text,
  currentUser,
  game,
  images,
  status,
  errorMessage,
  onOpenUpload,
  onDeleteImage
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  game?: GameNode;
  images: ImageAssetView[];
  status: ImageStatus;
  errorMessage?: string;
  onOpenUpload: () => void;
  onDeleteImage: (image: ImageAssetView) => void;
}): React.JSX.Element {
  const isSaving = status === 'saving' || status === 'deleting';
  const canUpload = Boolean(currentUser && game) && !isSaving;

  return (
    <section id="image-library-panel" className="mt-6 rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-orange-600">{text.imageUploadTitle}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {images.length} {text.imageCount}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{text.imageUploadPrompt}</p>
          <p className="mt-1 text-xs text-slate-500">{text.imageDragSidebarHint}</p>
        </div>

        <button
          className="h-9 shrink-0 rounded-md bg-orange-600 px-4 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={!canUpload}
          onClick={onOpenUpload}
        >
          {text.uploadImage}
        </button>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.imageRequiresUser} /> : null}
      {currentUser && !game ? <Notice tone="danger" title={text.imageRequiresGame} /> : null}
      {status === 'canceled' ? <Notice tone="muted" title={text.imageUploadCanceled} /> : null}
      {status === 'error' ? <Notice tone="danger" title={text.imageUploadError} detail={errorMessage} /> : null}

      {images.length > 0 ? (
        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
          {images.map((image) => (
            <ImageAssetCard
              key={image.id}
              text={text}
              currentUser={currentUser}
              image={image}
              isDeleting={status === 'deleting'}
              onDelete={onDeleteImage}
            />
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
  currentUser,
  image,
  isDeleting,
  onDelete
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  image: ImageAssetView;
  isDeleting: boolean;
  onDelete: (image: ImageAssetView) => void;
}): React.JSX.Element {
  const linkedNodes = image.linkedNodes ?? [];
  const canDelete = Boolean(currentUser && currentUser.id === image.uploaderId) && !isDeleting;

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
        <ImageReferencesBlock text={text} linkedNodes={linkedNodes} compact />
        {image.notes ? <p className="text-xs leading-5 text-slate-600">{image.notes}</p> : null}
        <button
          className="h-8 w-full rounded-md border border-red-200 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
          type="button"
          disabled={!canDelete}
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

function ImageReferencesBlock({
  text,
  linkedNodes,
  compact = false
}: {
  text: (typeof copy)[Language];
  linkedNodes: NonNullable<ImageAssetView['linkedNodes']>;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <div className={`${compact ? '' : 'mt-5'} rounded-md border border-slate-200 bg-slate-50 p-3`}>
      <p className="text-xs font-semibold text-slate-600">{text.imageReferencesLabel}</p>
      {linkedNodes.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {linkedNodes.map((reference) => (
            <li
              key={`${reference.nodeType}:${reference.nodeId}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <span className="font-medium">{getImageReferenceNodeTypeLabel(text, reference.nodeType)}</span>
              <span className="mx-1 text-slate-400">/</span>
              <span>{reference.displayName}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">@{reference.nodeId}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{text.imageNoReferences}</p>
      )}
    </div>
  );
}

function ModuleNodePanel({
  text,
  currentUser,
  users,
  game,
  modules,
  selectedModule,
  images,
  form,
  isDirty,
  status,
  errorMessage,
  onFormChange,
  onSelectModule,
  onNewModule,
  onSave,
  onDelete,
  onTogglePreview,
  onSelectImage,
  onOpenAiFieldDialog,
  onOpenAiModuleSummaryDialog
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  users: LocalUser[];
  game?: GameNode;
  modules: ModuleNode[];
  selectedModule?: ModuleNode;
  images: ImageAssetView[];
  form: ModuleFormState;
  isDirty: boolean;
  status: ModuleStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof ModuleFormState>(field: Field, value: ModuleFormState[Field]) => void;
  onSelectModule: (moduleId: string) => void;
  onNewModule: () => void;
  onSave: () => void | Promise<boolean>;
  onDelete: () => void;
  onTogglePreview: (kind: ActiveNodeKind, nodeId: string) => void;
  onSelectImage: (image: ImageAssetView) => void;
  onOpenAiFieldDialog: (mode: AiAssistFormState['mode']) => void;
  onOpenAiModuleSummaryDialog: () => void;
}): React.JSX.Element {
  const isSaving = status === 'saving' || status === 'deleting';
  const canSave = Boolean(currentUser && game && isDirty) && !isSaving;
  const canDelete = Boolean(currentUser && currentUser.id === selectedModule?.creatorId) && !isSaving;

  if (!selectedModule) {
    return (
      <section id="module-node-panel" className="mt-6 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-700">{text.modulePanelTitle}</p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">{text.createModulePlaceholder}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{text.createFromTreeHint}</p>
          </div>
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!currentUser || !game || isSaving}
            onClick={onNewModule}
          >
            {text.createModule}
          </button>
        </div>

        {!currentUser ? <Notice tone="danger" title={text.moduleRequiresUser} /> : null}
        {currentUser && !game ? <Notice tone="danger" title={text.moduleRequiresGame} /> : null}
        {status === 'error' ? <Notice tone="danger" title={text.moduleSaveError} detail={errorMessage} /> : null}

        {modules.length > 0 ? (
          <label className="mt-5 block border-t border-slate-200 pt-5 text-xs font-semibold text-slate-600">
            {text.selectModule}
            <select
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
              value=""
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
      </section>
    );
  }

  return (
    <section id="module-node-panel" className="mt-6 rounded-md border border-slate-200 bg-white p-5">
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
          {selectedModule ? (
            <button
              className="h-9 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={!canDelete}
              onClick={onDelete}
            >
              {status === 'deleting' ? text.deletingModule : text.deleteModule}
            </button>
          ) : null}
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canSave}
            onClick={() => {
              void onSave();
            }}
            title={!isDirty ? text.saveDisabledClean : undefined}
          >
            {status === 'saving' ? text.savingModule : selectedModule ? text.saveModule : text.createModule}
          </button>
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSaving}
            onClick={() => onTogglePreview('module', selectedModule.id)}
          >
            {text.mdPreviewButton}
          </button>
        </div>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.moduleRequiresUser} /> : null}
      {currentUser && !game ? <Notice tone="danger" title={text.moduleRequiresGame} /> : null}
      {status === 'error' ? (
        <Notice tone="danger" title={errorMessage?.includes('delete') ? text.moduleDeleteError : text.moduleSaveError} detail={errorMessage} />
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {selectedModule ? <LockedField label={text.moduleIdLabel} value={selectedModule.id} /> : null}
        <GameFieldInput
          label={text.moduleNameLabel}
          value={form.moduleName}
          placeholder={text.moduleNamePlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('moduleName', value)}
        />
      </div>

      <AiActionBar
        text={text}
        disabled={isSaving}
        showSummary
        summaryLabel={text.aiSummarizeChildren}
        onOpenAiFieldDialog={onOpenAiFieldDialog}
        onOpenSummaryDialog={onOpenAiModuleSummaryDialog}
      />

      <fieldset className="mt-5 min-w-0 max-w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-xs font-semibold text-slate-600">{text.linkedImagesLabel}</legend>
        <LinkedImagePicker
          text={text}
          images={images}
          selectedImageIds={form.imageIds}
          disabled={isSaving}
          onChange={(imageIds) => onFormChange('imageIds', imageIds)}
          onSelectImage={onSelectImage}
        />
      </fieldset>

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
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <LockedField label={text.gameIdLabel} value={selectedModule.gameId} />
            <LockedField label={text.gameVersionLabel} value={selectedModule.gameVersion} />
            <LockedField label={text.creatorIdLabel} value={getUserDisplayName(users, selectedModule.creatorId)} />
            <LockedField label={text.lastEditorIdLabel} value={getUserDisplayName(users, selectedModule.lastEditorId)} />
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
  users,
  selectedModule,
  contents,
  selectedContent,
  images,
  form,
  isDirty,
  status,
  errorMessage,
  onFormChange,
  onSelectContent,
  onNewContent,
  onSave,
  onDelete,
  onTogglePreview,
  onSelectImage,
  onOpenAiFieldDialog
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  users: LocalUser[];
  selectedModule?: ModuleNode;
  contents: ContentNode[];
  selectedContent?: ContentNode;
  images: ImageAssetView[];
  form: ContentFormState;
  isDirty: boolean;
  status: ContentStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof ContentFormState>(field: Field, value: ContentFormState[Field]) => void;
  onSelectContent: (contentId: string) => void;
  onNewContent: () => void;
  onSave: () => void | Promise<boolean>;
  onDelete: () => void;
  onTogglePreview: (kind: ActiveNodeKind, nodeId: string) => void;
  onSelectImage: (image: ImageAssetView) => void;
  onOpenAiFieldDialog: (mode: AiAssistFormState['mode']) => void;
}): React.JSX.Element {
  const isSaving = status === 'saving' || status === 'deleting';
  const canSave = Boolean(currentUser && selectedModule && isDirty) && !isSaving;
  const canDelete = Boolean(currentUser && currentUser.id === selectedContent?.creatorId) && !isSaving;

  if (!selectedContent) {
    return (
      <section id="content-node-panel" className="mt-6 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-700">{text.contentPanelTitle}</p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">{text.createContentPlaceholder}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{text.createFromTreeHint}</p>
          </div>
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!currentUser || !selectedModule || isSaving}
            onClick={onNewContent}
          >
            {text.createContent}
          </button>
        </div>

        {!currentUser ? <Notice tone="danger" title={text.contentRequiresUser} /> : null}
        {currentUser && !selectedModule ? <Notice tone="danger" title={text.contentRequiresModule} /> : null}
        {status === 'error' ? <Notice tone="danger" title={text.contentSaveError} detail={errorMessage} /> : null}

        {contents.length > 0 ? (
          <label className="mt-5 block border-t border-slate-200 pt-5 text-xs font-semibold text-slate-600">
            {text.selectContent}
            <select
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
              value=""
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
      </section>
    );
  }

  return (
    <section id="content-node-panel" className="mt-6 rounded-md border border-slate-200 bg-white p-5">
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
          {selectedContent ? (
            <button
              className="h-9 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
              type="button"
              disabled={!canDelete}
              onClick={onDelete}
            >
              {status === 'deleting' ? text.deletingContent : text.deleteContent}
            </button>
          ) : null}
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canSave}
            onClick={() => {
              void onSave();
            }}
            title={!isDirty ? text.saveDisabledClean : undefined}
          >
            {isSaving ? text.savingContent : selectedContent ? text.saveContent : text.createContent}
          </button>
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSaving}
            onClick={() => onTogglePreview('content', selectedContent.id)}
          >
            {text.mdPreviewButton}
          </button>
        </div>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.contentRequiresUser} /> : null}
      {currentUser && !selectedModule ? <Notice tone="danger" title={text.contentRequiresModule} /> : null}
      {status === 'error' ? (
        <Notice tone="danger" title={errorMessage?.includes('delete') ? text.contentDeleteError : text.contentSaveError} detail={errorMessage} />
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {selectedContent ? <LockedField label={text.contentIdLabel} value={selectedContent.id} /> : null}
        <GameFieldInput
          label={text.contentTitleLabel}
          value={form.title}
          placeholder={text.contentTitlePlaceholder}
          disabled={isSaving}
          onChange={(value) => onFormChange('title', value)}
        />
      </div>

      <AiActionBar
        text={text}
        disabled={isSaving}
        onOpenAiFieldDialog={onOpenAiFieldDialog}
      />

      <fieldset className="mt-5 min-w-0 max-w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-4">
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

      <fieldset className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-xs font-semibold text-slate-600">{text.linkedImagesLabel}</legend>
        <LinkedImagePicker
          text={text}
          images={images}
          selectedImageIds={form.imageIds}
          disabled={isSaving}
          onChange={(imageIds) => onFormChange('imageIds', imageIds)}
          onSelectImage={onSelectImage}
        />
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
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <LockedField label={text.moduleIdLabel} value={selectedContent.moduleId} />
            <LockedField label={text.parentModuleLabel} value={selectedModule?.moduleName ?? selectedContent.moduleId} />
            <LockedField label={text.gameIdLabel} value={selectedContent.gameId} />
            <LockedField label={text.gameVersionLabel} value={selectedContent.gameVersion} />
            <LockedField label={text.creatorIdLabel} value={getUserDisplayName(users, selectedContent.creatorId)} />
            <LockedField label={text.lastEditorIdLabel} value={getUserDisplayName(users, selectedContent.lastEditorId)} />
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
  language,
  currentUser,
  users,
  game,
  images,
  form,
  isDirty,
  status,
  errorMessage,
  onFormChange,
  onCreate,
  onSave,
  onDelete,
  onTogglePreview,
  onSelectImage,
  onOpenAiFieldDialog,
  onOpenAiGameSummaryDialog
}: {
  text: (typeof copy)[Language];
  language: Language;
  currentUser?: LocalUser;
  users: LocalUser[];
  game?: GameNode;
  images: ImageAssetView[];
  form: GameFormState;
  isDirty: boolean;
  status: GameStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof GameFormState>(field: Field, value: GameFormState[Field]) => void;
  onCreate: () => void;
  onSave: () => void | Promise<boolean>;
  onDelete: () => void;
  onTogglePreview: (kind: ActiveNodeKind, nodeId: string) => void;
  onSelectImage: (image: ImageAssetView) => void;
  onOpenAiFieldDialog: (mode: AiAssistFormState['mode']) => void;
  onOpenAiGameSummaryDialog: () => void;
}): React.JSX.Element {
  const isSaving = status === 'saving' || status === 'deleting';
  const canSave = Boolean(currentUser && isDirty) && !isSaving;
  const canDelete = Boolean(currentUser && currentUser.id === game?.creatorId) && !isSaving;

  if (!game) {
    return (
      <section id="game-node-panel" className="mt-6 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-700">{text.createGameTitle}</p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">{text.gameNodePlaceholder}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{text.createFromTreeHint}</p>
          </div>
          <button
            className="h-9 shrink-0 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!currentUser || isSaving}
            onClick={onCreate}
          >
            {text.createGame}
          </button>
        </div>
        {!currentUser ? <Notice tone="danger" title={text.gameNodeRequiresUser} /> : null}
        {status === 'error' ? <Notice tone="danger" title={text.gameSaveError} detail={errorMessage} /> : null}
      </section>
    );
  }

  return (
    <section id="game-node-panel" className="mt-6 rounded-md border border-slate-200 bg-white p-5">
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

        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 shrink-0 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={!canDelete}
            onClick={onDelete}
          >
            {status === 'deleting' ? text.deletingGame : text.deleteGame}
          </button>
          <button
            className="h-9 shrink-0 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canSave}
            onClick={() => {
              void onSave();
            }}
            title={!isDirty ? text.saveDisabledClean : undefined}
          >
            {isSaving ? text.savingGame : game ? text.saveGame : text.createGame}
          </button>
          <button
            className="h-9 shrink-0 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSaving}
            onClick={() => onTogglePreview('game', game.id)}
          >
            {text.mdPreviewButton}
          </button>
        </div>
      </div>

      {!currentUser ? <Notice tone="danger" title={text.gameNodeRequiresUser} /> : null}
      {status === 'error' ? (
        <Notice tone="danger" title={errorMessage?.includes('delete') ? text.gameDeleteError : text.gameSaveError} detail={errorMessage} />
      ) : null}

      <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
        {game ? <LockedField label={text.gameIdLabel} value={game.id} /> : null}
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
                {PROJECT_STAGE_LABELS[stage][language]}
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
        <GameCoverImagePicker
          text={text}
          images={images}
          selectedImageId={form.coverImageId}
          disabled={isSaving}
          onChange={(imageId) => onFormChange('coverImageId', imageId)}
          onSelectImage={onSelectImage}
        />
      </div>

      <AiActionBar
        text={text}
        disabled={isSaving}
        showSummary
        summaryLabel={text.aiSummarizeModules}
        onOpenAiFieldDialog={onOpenAiFieldDialog}
        onOpenSummaryDialog={onOpenAiGameSummaryDialog}
      />

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
      </div>

      {game ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <LockedField label={text.creatorIdLabel} value={getUserDisplayName(users, game.creatorId)} />
            <LockedField label={text.lastEditorIdLabel} value={getUserDisplayName(users, game.lastEditorId)} />
            <LockedField label={text.createdAtLabel} value={game.createdAt} />
            <LockedField label={text.updatedAtLabel} value={game.updatedAt} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AiActionBar({
  text,
  disabled,
  showSummary = false,
  summaryLabel,
  onOpenAiFieldDialog,
  onOpenSummaryDialog
}: {
  text: (typeof copy)[Language];
  disabled: boolean;
  showSummary?: boolean;
  summaryLabel?: string;
  onOpenAiFieldDialog: (mode: AiAssistFormState['mode']) => void;
  onOpenSummaryDialog?: () => void;
}): React.JSX.Element {
  return (
    <fieldset className="mt-5 rounded-md border border-cyan-100 bg-cyan-50/40 p-4">
      <legend className="px-1 text-xs font-semibold text-cyan-800">{text.aiAssistEditTitle}</legend>
      <div className="flex flex-wrap gap-2">
        <button
          className="h-9 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={disabled}
          onClick={() => onOpenAiFieldDialog(AiEditMode.Add)}
        >
          {text.aiAssistAdd}
        </button>
        <button
          className="h-9 rounded-md bg-blue-700 px-4 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={disabled}
          onClick={() => onOpenAiFieldDialog(AiEditMode.Modify)}
        >
          {text.aiAssistModify}
        </button>
        <button
          className="h-9 rounded-md bg-violet-700 px-4 text-sm font-medium text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="button"
          disabled={disabled}
          onClick={() => onOpenAiFieldDialog(AiEditMode.Polish)}
        >
          {text.aiAssistPolish}
        </button>
        {showSummary && onOpenSummaryDialog && summaryLabel ? (
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={disabled}
            onClick={onOpenSummaryDialog}
          >
            {summaryLabel}
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}

function GameCoverImagePicker({
  text,
  images,
  selectedImageId,
  disabled,
  onChange,
  onSelectImage
}: {
  text: (typeof copy)[Language];
  images: ImageAssetView[];
  selectedImageId: string;
  disabled: boolean;
  onChange: (imageId: string) => void;
  onSelectImage: (image: ImageAssetView) => void;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const selectedImage = images.find((image) => image.id === selectedImageId);

  return (
    <div className="relative text-xs font-semibold text-slate-600">
      <span>{text.coverImageIdLabel}</span>
      <button
        className="mt-2 flex min-h-14 w-full items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm font-normal text-slate-800 outline-none transition hover:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        type="button"
        disabled={disabled || images.length === 0}
        onClick={() => setIsOpen((current) => !current)}
      >
        {selectedImage ? <ImageThumb image={selectedImage} /> : <span className="h-10 w-14 rounded bg-slate-100" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{selectedImage ? selectedImage.displayName : text.noCoverImage}</span>
          <span className="block truncate font-mono text-xs text-slate-500">{selectedImage ? selectedImage.id : text.selectCoverImage}</span>
        </span>
      </button>
      {images.length === 0 ? <p className="mt-2 text-xs font-normal text-slate-500">{text.noImagesForLink}</p> : null}
      {isOpen ? (
        <div className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <button
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-normal text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
          >
            <span className="h-10 w-14 rounded bg-slate-100" />
            <span>{text.noCoverImage}</span>
          </button>
          {images.map((image) => (
            <div key={image.id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-50">
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm font-normal text-slate-800"
                type="button"
                onClick={() => {
                  onChange(image.id);
                  setIsOpen(false);
                }}
              >
                <ImageThumb image={image} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{image.displayName}</span>
                  <span className="block truncate font-mono text-xs text-slate-500">{image.id}</span>
                </span>
              </button>
              <button
                className="h-8 shrink-0 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-700"
                type="button"
                onClick={() => onSelectImage(image)}
              >
                {text.viewImageDetail}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LinkedImagePicker({
  text,
  images,
  selectedImageIds,
  disabled,
  onChange,
  onSelectImage
}: {
  text: (typeof copy)[Language];
  images: ImageAssetView[];
  selectedImageIds: string[];
  disabled: boolean;
  onChange: (imageIds: string[]) => void;
  onSelectImage: (image: ImageAssetView) => void;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const selectedImages = selectedImageIds
    .map((imageId) => images.find((image) => image.id === imageId))
    .filter((image): image is ImageAssetView => Boolean(image));
  const unlinkedImages = images.filter((image) => !selectedImageIds.includes(image.id));

  if (images.length === 0) {
    return <p className="text-sm text-slate-500">{text.noImagesForLink}</p>;
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-hidden">
      <div className="flex min-w-0 max-w-full items-start justify-between gap-3">
        {selectedImages.length > 0 ? (
          <div className="linked-image-scroll min-w-0 max-w-full flex-1 overflow-x-auto overflow-y-hidden pb-3">
            <div className="flex w-max gap-3">
              {selectedImages.map((image) => (
                <article key={image.id} className="w-64 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                  <button className="block w-full bg-slate-100" type="button" onClick={() => onSelectImage(image)}>
                    {image.previewDataUrl ? (
                      <img className="aspect-video w-full object-contain" src={image.previewDataUrl} alt={image.displayName} />
                    ) : (
                      <div className="flex aspect-video items-center justify-center text-xs text-slate-500">{image.displayName}</div>
                    )}
                  </button>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-medium text-slate-800" title={image.displayName}>
                      {image.displayName}
                    </p>
                    <p className="truncate font-mono text-xs text-slate-500" title={image.id}>
                      @{image.id}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="h-8 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-700"
                        type="button"
                        onClick={() => onSelectImage(image)}
                      >
                        {text.viewImageDetail}
                      </button>
                      <button
                        className="h-8 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(selectedImageIds.filter((imageId) => imageId !== image.id))}
                      >
                        {text.removeLinkedImage}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="min-w-0 flex-1 rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
            {text.linkedImagesEmpty}
          </p>
        )}
        <div className="relative">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-lg font-semibold leading-none text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            type="button"
            disabled={disabled}
            aria-label={text.addLinkedImage}
            title={text.addLinkedImage}
            onClick={() => setIsOpen((current) => !current)}
          >
            +
          </button>
          {isOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              {unlinkedImages.length > 0 ? (
                <div className="max-h-80 space-y-1 overflow-auto">
                  {unlinkedImages.map((image) => (
                    <div key={image.id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-50">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm text-slate-800"
                        type="button"
                        onClick={() => {
                          onChange([...selectedImageIds, image.id]);
                          setIsOpen(false);
                        }}
                      >
                        <ImageThumb image={image} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{image.displayName}</span>
                          <span className="block truncate font-mono text-xs text-slate-500">@{image.id}</span>
                        </span>
                      </button>
                      <button
                        className="h-8 shrink-0 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-700"
                        type="button"
                        onClick={() => onSelectImage(image)}
                      >
                        {text.viewImageDetail}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-3 text-sm text-slate-500">{text.noUnlinkedImages}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ImageThumb({ image }: { image: ImageAssetView }): React.JSX.Element {
  return image.previewDataUrl ? (
    <img className="h-10 w-14 shrink-0 rounded bg-slate-100 object-contain" src={image.previewDataUrl} alt={image.displayName} />
  ) : (
    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-500">IMG</span>
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

function CreateNodeDialog({
  text,
  language,
  dialog,
  gameStatus,
  moduleStatus,
  contentStatus,
  onDialogChange,
  onSubmit,
  onClose
}: {
  text: (typeof copy)[Language];
  language: Language;
  dialog: CreateNodeDialogState;
  gameStatus: GameStatus;
  moduleStatus: ModuleStatus;
  contentStatus: ContentStatus;
  onDialogChange: <Field extends keyof CreateNodeDialogState>(field: Field, value: CreateNodeDialogState[Field]) => void;
  onSubmit: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const isSaving =
    (dialog.kind === 'game' && gameStatus === 'saving') ||
    (dialog.kind === 'module' && moduleStatus === 'saving') ||
    (dialog.kind === 'content' && contentStatus === 'saving');
  const submitLabel =
    dialog.kind === 'game'
      ? text.selectLocationAndCreate
      : dialog.kind === 'module'
        ? text.createModule
        : text.createContent;
  const busyLabel =
    dialog.kind === 'game'
      ? text.savingGame
      : dialog.kind === 'module'
        ? text.savingModule
        : text.savingContent;

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent): void {
      if (!shouldTriggerDialogSubmitFromSpace(event, isSaving)) {
        return;
      }

      event.preventDefault();
      onSubmit();
    }

    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isSaving, onSubmit]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <section className="max-h-full w-full max-w-lg overflow-auto rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div>
          <div>
            {dialog.kind === 'game' ? <p className="text-xs font-semibold uppercase text-cyan-700">{text.createGameTitle}</p> : null}
            <h2 className={dialog.kind === 'game' ? 'mt-2 text-lg font-semibold text-slate-950' : 'text-lg font-semibold text-slate-950'}>{submitLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {dialog.kind === 'game'
                ? text.createGameLocationHint
                : dialog.kind === 'module'
                  ? text.createModuleRequiredHint
                  : text.createContentRequiredHint}
            </p>
          </div>
        </div>

        {dialog.errorMessage ? <Notice tone="danger" title={text.createDialogError} detail={dialog.errorMessage} /> : null}

        <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          {dialog.kind === 'game' ? (
            <>
              <GameFieldInput
                label={text.gameNameLabel}
                value={dialog.gameName}
                placeholder={text.gameNamePlaceholder}
                disabled={isSaving}
                onChange={(value) => onDialogChange('gameName', value)}
              />
              <GameFieldInput
                label={text.gameVersionLabel}
                value={dialog.gameVersion}
                placeholder={text.gameVersionPlaceholder}
                disabled={isSaving}
                onChange={(value) => onDialogChange('gameVersion', value)}
              />
              <label className="block text-xs font-semibold text-slate-600">
                {text.projectStageLabel}
                <select
                  className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
                  value={dialog.projectStage}
                  disabled={isSaving}
                  onChange={(event) => onDialogChange('projectStage', event.target.value as ProjectStage)}
                >
                  {Object.values(ProjectStage).map((stage) => (
                    <option key={stage} value={stage}>
                      {PROJECT_STAGE_LABELS[stage][language]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {dialog.kind === 'module' ? (
            <GameFieldInput
              label={text.moduleNameLabel}
              value={dialog.moduleName}
              placeholder={text.moduleNamePlaceholder}
              disabled={isSaving}
              onChange={(value) => onDialogChange('moduleName', value)}
            />
          ) : null}

          {dialog.kind === 'content' ? (
            <GameFieldInput
              label={text.contentTitleLabel}
              value={dialog.contentTitle}
              placeholder={text.contentTitlePlaceholder}
              disabled={isSaving}
              onChange={(value) => onDialogChange('contentTitle', value)}
            />
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSaving}
            onClick={onClose}
          >
            {text.createDialogCancel}
          </button>
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={isSaving}
            onClick={onSubmit}
          >
            {isSaving ? busyLabel : submitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function ImageUploadDialog({
  text,
  currentUser,
  game,
  form,
  source,
  status,
  errorMessage,
  onFormChange,
  onSelectFile,
  onSubmit,
  onClose
}: {
  text: (typeof copy)[Language];
  currentUser?: LocalUser;
  game?: GameNode;
  form: ImageFormState;
  source?: PendingImageUploadSource;
  status: ImageStatus;
  errorMessage?: string;
  onFormChange: <Field extends keyof ImageFormState>(field: Field, value: ImageFormState[Field]) => void;
  onSelectFile: (file: File) => void;
  onSubmit: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const [isDropActive, setIsDropActive] = useState(false);
  const isSaving = status === 'saving';
  const canSubmit = Boolean(currentUser && game) && !isSaving;

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent): void {
      if (!shouldTriggerDialogSubmitFromSpace(event, !canSubmit)) {
        return;
      }

      event.preventDefault();
      onSubmit();
    }

    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [canSubmit, onSubmit]);

  function handleDrop(event: React.DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setIsDropActive(false);

    const file = getFirstImageFile(event.dataTransfer.files);

    if (file) {
      onSelectFile(file);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <section className="max-h-full w-full max-w-2xl overflow-auto rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{text.imageUploadDialogTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text.imageUploadPrompt}</p>
          </div>
        </div>

        {!currentUser ? <Notice tone="danger" title={text.imageRequiresUser} /> : null}
        {currentUser && !game ? <Notice tone="danger" title={text.imageRequiresGame} /> : null}
        {status === 'error' ? <Notice tone="danger" title={text.imageUploadError} detail={errorMessage} /> : null}

        <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          <label
            className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-5 text-center transition ${
              isDropActive ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:border-orange-400'
            }`}
            onDragOver={(event) => {
              if (!hasImageDragData(event.dataTransfer)) {
                return;
              }

              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
              setIsDropActive(true);
            }}
            onDragLeave={() => setIsDropActive(false)}
            onDrop={handleDrop}
          >
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={isSaving}
              onChange={(event) => {
                const file = getFirstImageFile(event.target.files);

                if (file) {
                  onSelectFile(file);
                }

                event.currentTarget.value = '';
              }}
            />
            {source ? (
              <>
                <img className="max-h-56 max-w-full rounded-md bg-white object-contain" src={source.previewDataUrl} alt={source.originalFileName} />
                <p className="mt-3 text-sm font-medium text-slate-800">
                  {text.imageSelectedFile}: {source.originalFileName}
                </p>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-slate-700">{isDropActive ? text.imageDropActiveHint : text.imageDropHint}</span>
                <span className="mt-2 text-xs text-slate-500">{text.imageUnsupportedFile}</span>
              </>
            )}
          </label>

          <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSaving}
            onClick={onClose}
          >
            {text.createDialogCancel}
          </button>
          <button
            className="h-9 rounded-md bg-orange-600 px-4 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            {isSaving ? text.uploadingImage : text.uploadImage}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConfirmationDialog({
  dialog,
  onCancel,
  onConfirm
}: {
  dialog: ConfirmationDialogState;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <section className="w-full max-w-md rounded-md border border-red-100 bg-white p-5 shadow-xl">
        <p className="text-xs font-semibold uppercase text-red-700">{dialog.title}</p>
        <p className="mt-3 text-sm leading-6 text-slate-700">{dialog.message}</p>
        {dialog.detailLines && dialog.detailLines.length > 0 ? (
          <ul className="mt-4 max-h-48 space-y-2 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3">
            {dialog.detailLines.map((line, index) => (
              <li key={`${line}:${index}`} className="text-xs leading-5 text-slate-600">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400"
            type="button"
            onClick={onCancel}
          >
            {dialog.cancelLabel}
          </button>
          <button
            className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
            type="button"
            onClick={onConfirm}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function LoginModal({
  text,
  users,
  displayName,
  status,
  errorMessage,
  onDisplayNameChange,
  onCreateUser,
  onSelectUser
}: {
  text: (typeof copy)[Language];
  users: LocalUser[];
  displayName: string;
  status: UserStatus;
  errorMessage?: string;
  onDisplayNameChange: (value: string) => void;
  onCreateUser: () => void;
  onSelectUser: (userId: string) => void;
}): React.JSX.Element {
  const isSaving = status === 'saving';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <p className="text-xs font-semibold uppercase text-cyan-700">{text.createUserTitle}</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">{text.loginTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text.loginPrompt}</p>

        {status === 'error' ? <Notice tone="danger" title={text.userCreateError} detail={errorMessage} /> : null}

        {users.length > 0 ? (
          <label className="mt-5 block text-xs font-semibold text-slate-600">
            {text.loginExistingPrompt}
            <select
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
              value=""
              disabled={isSaving}
              onChange={(event) => onSelectUser(event.target.value)}
            >
              <option value="">{text.selectUserLabel}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="mt-5 border-t border-slate-200 pt-5">
          <label className="block text-xs font-semibold text-slate-600">
            {text.loginCreatePrompt}
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
            className="mt-3 h-9 w-full rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={isSaving}
            onClick={onCreateUser}
          >
            {isSaving ? text.creatingUser : text.createUser}
          </button>
        </div>
      </section>
    </div>
  );
}

function HelpReadmeModal({
  text,
  onClose
}: {
  text: (typeof copy)[Language];
  onClose: () => void;
}): React.JSX.Element {
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [previewContent, setPreviewContent] = useState('');
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadReadme(): Promise<void> {
      setPreviewStatus('loading');
      setPreviewErrorMessage(undefined);

      try {
        const result = await window.gameContextManager.readAppReadme();

        if (!isMounted) {
          return;
        }

        setPreviewContent(result.content);
        setPreviewStatus('ready');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPreviewStatus('error');
        setPreviewErrorMessage(error instanceof Error ? error.message : String(error));
      }
    }

    void loadReadme();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 py-8">
      <section className="max-h-full w-full max-w-5xl overflow-auto rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-700">{text.helpTitle}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">README.md</h2>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            type="button"
            aria-label={text.closeMdPreview}
            title={text.closeMdPreview}
            onClick={onClose}
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" strokeLinecap="round" />
              <path d="m6 6 12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-600">{text.filePreviewTitle}</p>
          {previewStatus === 'loading' ? (
            <p className="mt-3 text-sm text-slate-500">{text.filePreviewLoading}</p>
          ) : previewStatus === 'error' ? (
            <Notice tone="danger" title={text.helpReadmeError} detail={previewErrorMessage} />
          ) : previewContent ? (
            <pre className="mt-3 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 shadow-inner">
              {previewContent}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{text.filePreviewEmpty}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsModal({
  text,
  language,
  draftLanguage,
  currentUser,
  settingsStatus,
  settingsErrorMessage,
  apiConfig,
  apiForm,
  apiStatus,
  apiLastAction,
  apiErrorMessage,
  apiTestResult,
  onDraftLanguageChange,
  onConfirmLanguageChange,
  onLogout,
  onClose,
  onOpenHelp,
  onApiFormChange,
  onSaveApi,
  onTestApi
}: {
  text: (typeof copy)[Language];
  language: Language;
  draftLanguage: Language;
  currentUser?: LocalUser;
  settingsStatus: SettingsStatus;
  settingsErrorMessage?: string;
  apiConfig?: ApiConfig;
  apiForm: ApiFormState;
  apiStatus: ApiStatus;
  apiLastAction: ApiAction;
  apiErrorMessage?: string;
  apiTestResult?: ApiConnectionTestResult;
  onDraftLanguageChange: (language: Language) => void;
  onConfirmLanguageChange: () => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenHelp: () => void;
  onApiFormChange: <Field extends keyof ApiFormState>(field: Field, value: ApiFormState[Field]) => void;
  onSaveApi: () => void;
  onTestApi: () => void;
}): React.JSX.Element {
  const isLoggingOut = settingsStatus === 'loggingOut';
  const isSavingLanguage = settingsStatus === 'saving';
  const hasLanguageChange = draftLanguage !== language;
  const isSettingsBusy = isSavingLanguage || isLoggingOut;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <section className="max-h-full w-full max-w-3xl overflow-auto rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{text.settingsTitle}</h2>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            type="button"
            aria-label={text.closeSettings}
            title={text.closeSettings}
            onClick={onClose}
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" strokeLinecap="round" />
              <path d="m6 6 12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {settingsStatus === 'error' ? <Notice tone="danger" title={text.settingsError} detail={settingsErrorMessage} /> : null}

        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-xs font-semibold text-slate-600">
            {text.languageLabel}
            <select
              className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
              value={draftLanguage}
              disabled={isSettingsBusy}
              onChange={(event) => onDraftLanguageChange(event.target.value as Language)}
            >
              <option value="zh">{text.zhLanguage}</option>
              <option value="en">{text.enLanguage}</option>
            </select>
          </label>
          <button
            className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            type="button"
            disabled={!hasLanguageChange || isSettingsBusy}
            onClick={onConfirmLanguageChange}
          >
            {isSavingLanguage ? text.savingLanguage : text.confirmLanguage}
          </button>
        </div>

        <ApiConfigPanel
          text={text}
          config={apiConfig}
          form={apiForm}
          status={apiStatus}
          lastAction={apiLastAction}
          errorMessage={apiErrorMessage}
          testResult={apiTestResult}
          onFormChange={onApiFormChange}
          onSave={onSaveApi}
          onTest={onTestApi}
        />

        <div className="mt-5 border-t border-slate-200 pt-5">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSettingsBusy}
            onClick={onOpenHelp}
          >
            {text.helpButton}
          </button>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold text-slate-600">{text.currentUser}</p>
            <p className="mt-1 text-sm text-slate-800">{currentUser?.displayName ?? text.noUser}</p>
          </div>
          <button
            className="mt-4 h-9 rounded-md border border-rose-200 px-4 text-sm font-medium text-rose-700 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isSettingsBusy}
            onClick={onLogout}
          >
            {isLoggingOut ? text.loggingOut : text.logout}
          </button>
        </div>
      </section>
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
  active = false,
  tone = 'node',
  meta,
  thumbnailSrc,
  contextTarget,
  actionLabel,
  onAction,
  collapsed = false,
  collapseDisabled = false,
  collapseLabel,
  onToggleCollapse,
  onClick
}: {
  label: string;
  depth: 0 | 1 | 2 | 3;
  active?: boolean;
  tone?: 'node' | 'image' | 'file' | 'placeholder';
  meta?: string;
  thumbnailSrc?: string;
  contextTarget?: KnownWorkspaceItem;
  actionLabel?: string;
  onAction?: () => void;
  collapsed?: boolean;
  collapseDisabled?: boolean;
  collapseLabel?: string;
  onToggleCollapse?: () => void;
  onClick?: () => void;
}): React.JSX.Element {
  const padding = depth === 0 ? 'pl-2' : depth === 1 ? 'pl-5' : depth === 2 ? 'pl-8' : 'pl-11';
  const buttonState = onClick
    ? active
      ? 'bg-slate-900 text-white shadow-sm'
      : 'text-slate-600 hover:bg-white hover:text-slate-950'
    : 'cursor-default text-slate-400';
  const dotClass = active
    ? tone === 'image'
      ? 'bg-orange-300'
      : tone === 'file'
        ? 'bg-emerald-300'
        : 'bg-cyan-300'
    : tone === 'image'
      ? 'bg-orange-500'
      : tone === 'file'
        ? 'bg-emerald-500'
        : tone === 'placeholder'
          ? 'bg-slate-300'
          : 'bg-cyan-600';
  const metaClass =
    tone === 'image'
      ? active
        ? 'bg-white/10 text-orange-100'
        : 'bg-orange-50 text-orange-700'
      : active
        ? 'bg-white/10 text-cyan-100'
        : 'bg-cyan-50 text-cyan-700';
  const contextTargetId = contextTarget && 'id' in contextTarget ? contextTarget.id : undefined;

  return (
    <div
      className="group flex min-h-9 w-full items-center gap-1"
      data-open-kind={contextTarget?.kind}
      data-open-id={contextTargetId}
      data-open-file-name={contextTarget?.kind === 'indexFile' ? contextTarget.fileName : undefined}
    >
      <button
        className={`flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md pr-2 text-left text-sm transition ${padding} ${buttonState}`}
        type="button"
        disabled={!onClick}
        onClick={onClick}
      >
        {thumbnailSrc ? (
          <img className="h-7 w-9 shrink-0 rounded border border-orange-200 bg-orange-50 object-cover" src={thumbnailSrc} alt="" />
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {meta ? (
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${metaClass}`}>
            {meta}
          </span>
        ) : null}
      </button>
      {onAction ? (
        <button
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-700 bg-cyan-700 text-base leading-none text-white shadow-sm transition hover:border-cyan-800 hover:bg-cyan-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
          type="button"
          title={actionLabel ?? '+'}
          aria-label={actionLabel ?? '+'}
          onClick={onAction}
        >
          +
        </button>
      ) : null}
      {onToggleCollapse ? (
        <button
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-base leading-none text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
          type="button"
          title={collapseLabel}
          aria-label={collapseLabel}
          disabled={collapseDisabled}
          onClick={onToggleCollapse}
        >
          {collapsed ? '+' : '-'}
        </button>
      ) : null}
    </div>
  );
}

function TreeSectionLabel({
  label,
  collapsed = false,
  collapseDisabled = false,
  collapseLabel,
  onToggleCollapse
}: {
  label: string;
  collapsed?: boolean;
  collapseDisabled?: boolean;
  collapseLabel?: string;
  onToggleCollapse?: () => void;
}): React.JSX.Element {
  return (
    <div className="flex min-h-8 items-center gap-1 px-2 pt-2">
      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {onToggleCollapse ? (
        <button
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-base leading-none text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
          type="button"
          title={collapseLabel}
          aria-label={collapseLabel}
          disabled={collapseDisabled}
          onClick={onToggleCollapse}
        >
          {collapsed ? '+' : '-'}
        </button>
      ) : null}
    </div>
  );
}

function TreeActionButton({
  label,
  disabled,
  onClick
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {label}
    </button>
  );
}

function EmptyDetail({ text }: { text: (typeof copy)[Language] }): React.JSX.Element {
  return (
    <section className="flex min-h-[calc(100vh-40px)] items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-6">
      <p className="text-sm font-medium text-slate-500">{text.chooseNodePrompt}</p>
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
            {isApiConfigComplete(config) ? text.apiConfigured : text.apiNoConfig}
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
      </div>
    </section>
  );
}

function AiAssistDialog({
  text,
  kind,
  mode,
  fields,
  selectedFields,
  candidates,
  userInstruction,
  status,
  errorMessage,
  onModeChange,
  onInstructionChange,
  onAddField,
  onRemoveField,
  onCandidateChange,
  onGenerate,
  onConfirm,
  onCancelCandidates,
  onClose
}: {
  text: (typeof copy)[Language];
  kind: AiDialogKind;
  mode: AiAssistFormState['mode'];
  fields: AiEditableField[];
  selectedFields: AiEditableField[];
  candidates: AiCandidateField[];
  userInstruction: string;
  status: AiStatus;
  errorMessage?: string;
  onModeChange: (mode: AiAssistFormState['mode']) => void;
  onInstructionChange: (value: string) => void;
  onAddField: (fieldKey: string) => void;
  onRemoveField: (fieldKey: string) => void;
  onCandidateChange: (fieldKey: string, candidateValue: string) => void;
  onGenerate: () => void;
  onConfirm: () => void;
  onCancelCandidates: () => void;
  onClose: () => void;
}): React.JSX.Element {
  const isBusy = status === 'generating' || status === 'saving';
  const title = kind === 'moduleSummary'
    ? text.aiSummaryTitle
    : kind === 'gameSummary'
      ? text.aiGameSummaryTitle
      : mode === AiEditMode.Add
        ? text.aiDialogAddTitle
        : mode === AiEditMode.Modify
          ? text.aiDialogModifyTitle
          : text.aiDialogPolishTitle;
  const selectedFieldKeys = new Set(selectedFields.map((field) => field.key));
  const selectableFields = fields.filter((field) => !selectedFieldKeys.has(field.key));
  const canGenerate = selectedFields.length > 0 && !isBusy;
  const canConfirm = candidates.length > 0 && !isBusy;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4">
      <section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-cyan-700">{text.aiPanel}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{text.aiReady}</p>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isBusy}
            aria-label={text.aiCloseDialog}
            title={text.aiCloseDialog}
            onClick={onClose}
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" strokeLinecap="round" />
              <path d="m6 6 12 12" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block text-xs font-semibold text-slate-600">
              {text.aiFieldSelectPlaceholder}
              <select
                className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
                value=""
                disabled={isBusy || selectableFields.length === 0}
                onChange={(event) => onAddField(event.target.value)}
              >
                <option value="">{text.aiFieldSelectPlaceholder}</option>
                {selectableFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>

            {kind === 'fieldEdit' ? (
              <label className="block text-xs font-semibold text-slate-600">
                {text.aiModeLabel}
                <select
                  className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition focus:border-cyan-600"
                  value={mode}
                  disabled={isBusy}
                  onChange={(event) => onModeChange(event.target.value as AiAssistFormState['mode'])}
                >
                  <option value={AiEditMode.Add}>{text.aiAssistAdd}</option>
                  <option value={AiEditMode.Modify}>{text.aiAssistModify}</option>
                  <option value={AiEditMode.Polish}>{text.aiAssistPolish}</option>
                </select>
              </label>
            ) : null}
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">{text.aiSelectedFieldsLabel}</p>
            {selectedFields.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFields.map((field) => (
                  <span key={field.key} className="inline-flex max-w-full items-center gap-2 rounded-md border border-cyan-200 bg-white px-2 py-1 text-xs text-cyan-800">
                    <span className="truncate">{field.label}</span>
                    <button
                      className="rounded px-1 font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:text-slate-400"
                      type="button"
                      disabled={isBusy}
                      onClick={() => onRemoveField(field.key)}
                      aria-label={`${text.aiCancel} ${field.label}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{text.aiNoFieldSelected}</p>
            )}
          </div>

          <label className="mt-4 block text-xs font-semibold text-slate-600">
            {text.aiInstructionLabel}
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600"
              value={userInstruction}
              placeholder={text.aiInstructionPlaceholder}
              disabled={isBusy}
              onChange={(event) => onInstructionChange(event.target.value)}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="h-9 rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              disabled={!canGenerate}
              onClick={onGenerate}
            >
              {status === 'generating' ? text.aiGenerating : text.aiGenerate}
            </button>
            {candidates.length > 0 ? (
              <button
                className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
                type="button"
                disabled={isBusy}
                onClick={onCancelCandidates}
              >
                {text.aiCancel}
              </button>
            ) : null}
          </div>

          {status === 'error' ? (
            <Notice
              tone="danger"
              title={errorMessage === text.aiConfirmError ? text.aiConfirmError : text.aiGenerateError}
              detail={errorMessage}
            />
          ) : null}

          {candidates.length > 0 ? (
            <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
              {candidates.map((candidate) => (
                <div key={candidate.key} className="rounded-md border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">{candidate.fieldLabel}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <AiResultBlock title={text.aiOriginal} value={candidate.originalValue || text.aiNoCandidate} />
                    <label className="block text-xs font-semibold text-slate-600">
                      {text.aiCandidate}
                      <textarea
                        className="mt-1 min-h-40 w-full resize-y rounded-md border border-slate-300 px-3 py-2 font-mono text-xs font-normal leading-5 text-slate-900 outline-none transition focus:border-cyan-600"
                        value={candidate.candidateValue}
                        disabled={isBusy}
                        onChange={(event) => onCandidateChange(candidate.key, event.target.value)}
                      />
                    </label>
                  </div>
                  <AiResultBlock title={text.aiDiff} value={buildSimpleDiff(candidate.originalValue, candidate.candidateValue)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-500">
              {text.aiNoCandidate}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-400"
            type="button"
            disabled={isBusy}
            onClick={onClose}
          >
            {text.aiCancel}
          </button>
          <button
            className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {status === 'saving' ? text.aiSaving : text.aiConfirm}
          </button>
        </footer>
      </section>
    </div>
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
    <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{images.length}</span>
      </div>
      {nodeTitle ? (
        <p className="mt-1 truncate text-xs text-slate-500" title={nodeTitle}>
          {nodeTitle}
        </p>
      ) : null}
      {images.length > 0 ? (
        <div className="mt-2 grid max-h-[420px] gap-2 overflow-auto pr-1">
          {images.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              {image.previewDataUrl ? (
                <img className="aspect-video w-full bg-slate-100 object-contain" src={image.previewDataUrl} alt={image.displayName} />
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

function MarkdownPreviewModal({
  text,
  nodeTitle,
  emptyText,
  markdownPreview,
  onClose
}: {
  text: (typeof copy)[Language];
  nodeTitle?: string;
  emptyText: string;
  markdownPreview: string;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8">
      <section className="flex max-h-full w-full max-w-4xl flex-col rounded-md border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{text.previewPanel}</h2>
            {nodeTitle ? (
              <p className="mt-1 max-w-2xl truncate text-sm text-slate-500" title={nodeTitle}>
                {nodeTitle}
              </p>
            ) : null}
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            type="button"
            aria-label={text.closeMdPreview}
            title={text.closeMdPreview}
            onClick={onClose}
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" strokeLinecap="round" />
              <path d="m6 6 12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 overflow-auto p-5">
          {markdownPreview ? (
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 shadow-inner">
              {markdownPreview}
            </pre>
          ) : (
            <p className="text-sm leading-6 text-slate-500">{emptyText}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function TransientNotice({ notice }: { notice: TransientNoticeState }): React.JSX.Element {
  const toneClass =
    notice.tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900 before:bg-red-500'
      : 'border-cyan-200 bg-cyan-50 text-cyan-900 before:bg-cyan-600';

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-80 max-w-[calc(100vw-2.5rem)]">
      <section className={`relative overflow-hidden rounded-md border px-4 py-3 pl-5 text-sm shadow-lg before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneClass}`}>
        <p className="font-medium">{notice.title}</p>
        {notice.detail ? <p className="mt-1 break-all text-xs leading-5">{notice.detail}</p> : null}
      </section>
    </div>
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
      ? 'border-red-200 bg-red-50 text-red-900 before:bg-red-500'
      : 'border-cyan-200 bg-cyan-50 text-cyan-900 before:bg-cyan-600';

  return (
    <section className={`relative mt-5 overflow-hidden rounded-md border px-4 py-3 pl-5 text-sm shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 ${toneClass}`}>
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
    )
  ];
}

function getModuleSummaryFieldKeys(fields: AiEditableField[]): string[] {
  const summaryFieldNames = new Set([
    'modulePositioning',
    'systemRules',
    'resourceFlow',
    'playerMainActions',
    'subjectiveFun',
    'subjectiveProblems',
    'subjectiveOptimizationDirections'
  ]);

  return fields.filter((field) => field.nodeKind === 'module' && summaryFieldNames.has(field.fieldName)).map((field) => field.key);
}

function getGameSummaryFieldKeys(fields: AiEditableField[]): string[] {
  const summaryFieldNames = new Set([
    'coreGameplay',
    'mainFun',
    'mainOptimizationDirections',
    'currentMainProblems'
  ]);

  return fields.filter((field) => field.nodeKind === 'game' && summaryFieldNames.has(field.fieldName)).map((field) => field.key);
}

function applyAiCandidatesToForm(form: GameFormState | ModuleFormState | ContentFormState, candidates: AiCandidateField[]): void {
  const writableForm = form as unknown as Record<string, string>;

  for (const candidate of candidates) {
    writableForm[candidate.fieldName] = candidate.candidateValue;
  }
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
    coverImageId: game.coverImageId ?? ''
  };
}

function moduleNodeToForm(module: ModuleNode): ModuleFormState {
  return {
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
    modelName: config.modelName
  };
}

function mergeUniquePaths(current: string[], next: string[]): string[] {
  return [...new Set([...current, ...next])];
}

function buildFileSelections(paths: string[], fileNames: string[]): IndexFileSelection[] {
  return fileNames.flatMap((fileName) => {
    const path = findPathByFileName(paths, fileName);

    if (!path) {
      return [];
    }

    return [
      {
        id: `${fileName}:${path}`,
        label: fileName,
        path
      }
    ];
  });
}

function findIndexFileSelectionByName(files: IndexFileSelection[], fileName: KnownWorkspaceIndexFileName): IndexFileSelection | undefined {
  return files.find((file) => file.label === fileName);
}

function getUserDisplayName(users: LocalUser[], userId: string): string {
  return users.find((user) => user.id === userId)?.displayName ?? userId;
}

function getImageReferenceNodeTypeLabel(text: (typeof copy)[Language], nodeType: NodeType): string {
  if (nodeType === NodeType.Game) {
    return text.createGameTitle;
  }

  if (nodeType === NodeType.Module) {
    return text.modulePanelTitle;
  }

  return text.contentPanelTitle;
}

function getKnownWorkspaceItemFromEventTarget(target: EventTarget | null): KnownWorkspaceItem | undefined {
  if (!(target instanceof HTMLElement)) {
    return undefined;
  }

  const row = target.closest<HTMLElement>('[data-open-kind]');
  const kind = row?.dataset.openKind;

  if (!kind) {
    return undefined;
  }

  if (kind === 'game') {
    return { kind };
  }

  if (kind === 'module' || kind === 'content' || kind === 'image') {
    const id = row.dataset.openId;

    return id ? { kind, id } : undefined;
  }

  if (kind === 'indexFile') {
    const fileName = row.dataset.openFileName;

    return isKnownWorkspaceIndexFileName(fileName) ? { kind, fileName } : undefined;
  }

  return undefined;
}

function isKnownWorkspaceIndexFileName(fileName: string | undefined): fileName is KnownWorkspaceIndexFileName {
  return (
    fileName === 'AGENTS.md' ||
    fileName === 'CLAUDE.md' ||
    fileName === 'manifest.yml' ||
    fileName === 'INDEX.md' ||
    fileName === 'image_catalog.yml'
  );
}

function isAgentInstructionFile(fileName: string): boolean {
  return fileName === 'AGENTS.md' || fileName === 'CLAUDE.md';
}

function findPathByFileName(paths: string[], fileName: string): string | undefined {
  const normalizedFileName = fileName.toLowerCase();

  return paths.find((path) => {
    const normalizedPath = path.replaceAll('\\', '/').toLowerCase();
    return normalizedPath === normalizedFileName || normalizedPath.endsWith(`/${normalizedFileName}`);
  });
}

function isApiConfigComplete(config?: Pick<ApiConfig, 'baseUrl' | 'apiKey' | 'modelName'>): boolean {
  if (!config?.baseUrl.trim() || !config.modelName.trim()) {
    return false;
  }

  return config.baseUrl.trim().toLowerCase().startsWith('mock://') || Boolean(config.apiKey?.trim());
}

function buildNodePreviewKey(kind: ActiveNodeKind, nodeId: string): string {
  return `${kind}:${nodeId}`;
}

function areGameFormsEqual(left: GameFormState, right: GameFormState): boolean {
  return (
    left.gameName === right.gameName &&
    left.gameVersion === right.gameVersion &&
    left.projectStage === right.projectStage &&
    left.gameGenre === right.gameGenre &&
    left.coreGameplay === right.coreGameplay &&
    left.mainFun === right.mainFun &&
    left.targetUsers === right.targetUsers &&
    left.currentOperationGoal === right.currentOperationGoal &&
    left.currentMainProblems === right.currentMainProblems &&
    left.mainOptimizationDirections === right.mainOptimizationDirections &&
    left.coverImageId === right.coverImageId
  );
}

function areModuleFormsEqual(left: ModuleFormState, right: ModuleFormState): boolean {
  return (
    left.moduleName === right.moduleName &&
    left.modulePositioning === right.modulePositioning &&
    left.systemRules === right.systemRules &&
    left.resourceFlow === right.resourceFlow &&
    areStringArraysEqual(left.imageIds, right.imageIds) &&
    left.playerMainActions === right.playerMainActions &&
    left.subjectiveFun === right.subjectiveFun &&
    left.subjectiveProblems === right.subjectiveProblems &&
    left.subjectiveOptimizationDirections === right.subjectiveOptimizationDirections
  );
}

function areContentFormsEqual(left: ContentFormState, right: ContentFormState): boolean {
  return (
    left.title === right.title &&
    areStringArraysEqual(left.imageIds, right.imageIds) &&
    left.accountDay === right.accountDay &&
    left.cumulativePaymentAmount === right.cumulativePaymentAmount &&
    left.maxMainlineProgress === right.maxMainlineProgress &&
    left.characterLevel === right.characterLevel &&
    left.processDescription === right.processDescription &&
    left.subjectiveFun === right.subjectiveFun &&
    left.subjectiveKnownProblems === right.subjectiveKnownProblems &&
    left.subjectiveOptimizationDirections === right.subjectiveOptimizationDirections
  );
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

async function createPendingImageUploadSource(
  file: File,
  unsupportedMessage: string
): Promise<PendingImageUploadSource> {
  if (!isSupportedImageFile(file)) {
    throw new Error(unsupportedMessage);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const originalFileName = file.name || `clipboard-image${getExtensionFromMimeType(file.type)}`;

  return {
    source: {
      kind: 'dataUrl',
      dataUrl,
      originalFileName
    },
    previewDataUrl: dataUrl,
    originalFileName
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Invalid image data.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image.'));
    reader.readAsDataURL(file);
  });
}

function getFirstImageFile(files: FileList | null): File | undefined {
  if (!files) {
    return undefined;
  }

  return Array.from(files).find((file) => isSupportedImageFile(file));
}

function getFirstImageFileFromClipboard(clipboardData: DataTransfer): File | undefined {
  const itemFile = Array.from(clipboardData.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .find((file): file is File => Boolean(file && isSupportedImageFile(file)));

  return itemFile ?? getFirstImageFile(clipboardData.files);
}

function hasImageDragData(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.items).some((item) => item.kind === 'file' && item.type.startsWith('image/'));
}

async function readImageFileFromNavigatorClipboard(): Promise<File | undefined> {
  if (!navigator.clipboard?.read) {
    return undefined;
  }

  const clipboardItems = await navigator.clipboard.read();

  for (const item of clipboardItems) {
    const imageType = item.types.find((type) => type.startsWith('image/') && SUPPORTED_IMAGE_MIME_TYPES.has(type));

    if (!imageType) {
      continue;
    }

    const blob = await item.getType(imageType);
    return new File([blob], `clipboard-image${getExtensionFromMimeType(imageType)}`, { type: imageType });
  }

  return undefined;
}

function isSupportedImageFile(file: File): boolean {
  if (SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) {
    return true;
  }

  return SUPPORTED_IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex < 0) {
    return '';
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }

  if (mimeType === 'image/webp') {
    return '.webp';
  }

  if (mimeType === 'image/gif') {
    return '.gif';
  }

  return '.png';
}

function suggestImageDisplayName(originalFileName: string): string {
  const extension = getFileExtension(originalFileName);
  const baseName = extension ? originalFileName.slice(0, -extension.length) : originalFileName;
  return baseName.trim() || 'clipboard-image';
}

function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
}

function shouldTriggerDialogSubmitFromSpace(event: KeyboardEvent, disabled: boolean): boolean {
  if (disabled || event.repeat || (event.key !== ' ' && event.code !== 'Space')) {
    return false;
  }

  if (!(event.target instanceof HTMLElement)) {
    return true;
  }

  return !event.target.closest('input, textarea, select, button, [contenteditable="true"]');
}

export default App;
