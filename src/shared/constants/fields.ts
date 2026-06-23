import { NodeType, type EditableFieldMap, type LockedFieldMap } from '../types/domain.js';

export const PROJECT_STAGE_LABELS = {
  planning: {
    zh: '立项',
    en: 'Planning'
  },
  testing: {
    zh: '测试',
    en: 'Testing'
  },
  live: {
    zh: '上线',
    en: 'Live'
  },
  pre_closure: {
    zh: '预备结项',
    en: 'Pre-closure'
  }
} as const;

export const AI_EDIT_MODE_LABELS = {
  add: {
    zh: '增加内容',
    en: 'Add content'
  },
  modify: {
    zh: '修改内容',
    en: 'Modify content'
  },
  polish: {
    zh: '润色内容',
    en: 'Polish content'
  },
  summarize_children: {
    zh: '从子节点汇总',
    en: 'Summarize children'
  },
  summarize_modules: {
    zh: '从模块汇总',
    en: 'Summarize modules'
  }
} as const;

export const EDITABLE_FIELDS = {
  [NodeType.Game]: [
    'gameName',
    'gameVersion',
    'projectStage',
    'gameGenre',
    'coreGameplay',
    'mainFun',
    'targetUsers',
    'currentOperationGoal',
    'currentMainProblems',
    'mainOptimizationDirections',
    'coverImageId'
  ],
  [NodeType.Module]: [
    'moduleName',
    'modulePositioning',
    'systemRules',
    'resourceFlow',
    'imageIds',
    'playerMainActions',
    'subjectiveFun',
    'subjectiveProblems',
    'subjectiveOptimizationDirections'
  ],
  [NodeType.Content]: [
    'title',
    'imageIds',
    'accountDay',
    'cumulativePaymentAmount',
    'maxMainlineProgress',
    'characterLevel',
    'processDescription',
    'subjectiveFun',
    'subjectiveKnownProblems',
    'subjectiveOptimizationDirections'
  ]
} as const satisfies {
  [Type in NodeType]: readonly EditableFieldMap[Type][];
};

export const LOCKED_FIELDS = {
  [NodeType.Game]: ['nodeType', 'id', 'creatorId', 'lastEditorId', 'createdAt', 'updatedAt'],
  [NodeType.Module]: [
    'nodeType',
    'id',
    'gameId',
    'gameVersion',
    'creatorId',
    'lastEditorId',
    'createdAt',
    'updatedAt'
  ],
  [NodeType.Content]: [
    'nodeType',
    'id',
    'gameId',
    'gameVersion',
    'moduleId',
    'creatorId',
    'lastEditorId',
    'createdAt',
    'updatedAt'
  ]
} as const satisfies {
  [Type in NodeType]: readonly LockedFieldMap[Type][];
};
