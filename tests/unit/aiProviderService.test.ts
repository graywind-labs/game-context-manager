import assert from 'node:assert/strict';
import {
  buildFieldEditPrompt,
  buildGameSummaryPrompt,
  buildModuleSummaryPrompt,
  createAiProvider,
  createMockAiProvider
} from '../../src/main/services/aiProviderService.js';
import { AiEditMode, NodeType, ProjectStage, type AiGameSummaryInput, type AiModuleSummaryInput } from '../../src/shared/index.js';

const mockProvider = createMockAiProvider({ modelName: 'mock-model' });
const mockResult = await mockProvider.testConnection();

assert.equal(mockResult.ok, true);
assert.equal(mockResult.provider, 'mock');
assert.equal(mockResult.modelName, 'mock-model');

const providerFromConfig = createAiProvider({
  baseUrl: 'mock://local',
  modelName: 'mock-model'
});
const configResult = await providerFromConfig.testConnection();

assert.equal(configResult.ok, true);
assert.equal(configResult.provider, 'mock');

const addPrompt = buildFieldEditPrompt({
  nodeType: NodeType.Content,
  nodeId: 'content_001',
  fieldName: 'processDescription',
  fieldLabel: 'Process description',
  fieldValue: 'Original observation.',
  mode: AiEditMode.Add,
  userInstruction: 'Add the first login flow.',
  nodeContext: 'Game: Demo'
});

assert.match(addPrompt.userPrompt, /Preserve all existing information/);
assert.match(addPrompt.userPrompt, /Add the first login flow/);

const modifyPrompt = buildFieldEditPrompt({
  nodeType: NodeType.Module,
  nodeId: 'module_001',
  fieldName: 'systemRules',
  fieldLabel: 'System rules',
  fieldValue: 'Original rules.',
  mode: AiEditMode.Modify,
  userInstruction: 'Replace reward wording.',
  nodeContext: 'Game: Demo'
});

assert.match(modifyPrompt.userPrompt, /Modify only according to the user instruction/);

const polishPrompt = buildFieldEditPrompt({
  nodeType: NodeType.Game,
  nodeId: 'game_001',
  fieldName: 'mainFun',
  fieldLabel: 'Main fun',
  fieldValue: 'fun but messy',
  mode: AiEditMode.Polish,
  nodeContext: 'Game: Demo'
});

assert.match(polishPrompt.userPrompt, /Only polish expression/);

const addCandidate = await mockProvider.generateFieldEdit({
  nodeType: NodeType.Content,
  nodeId: 'content_001',
  fieldName: 'processDescription',
  fieldLabel: 'Process description',
  fieldValue: 'Original observation.',
  mode: AiEditMode.Add,
  userInstruction: 'Add the first login flow.',
  nodeContext: 'Game: Demo'
});

assert.equal(addCandidate.provider, 'mock');
assert.equal(addCandidate.originalValue, 'Original observation.');
assert.match(addCandidate.candidateValue, /Original observation/);
assert.match(addCandidate.candidateValue, /Mock added content: Add the first login flow/);

const modifyCandidate = await mockProvider.generateFieldEdit({
  nodeType: NodeType.Module,
  nodeId: 'module_001',
  fieldName: 'systemRules',
  fieldLabel: 'System rules',
  fieldValue: 'Original rules.',
  mode: AiEditMode.Modify,
  userInstruction: 'Use the edited rule.',
  nodeContext: 'Game: Demo'
});

assert.equal(modifyCandidate.candidateValue, 'Use the edited rule.');

const polishCandidate = await mockProvider.generateFieldEdit({
  nodeType: NodeType.Game,
  nodeId: 'game_001',
  fieldName: 'mainFun',
  fieldLabel: 'Main fun',
  fieldValue: 'fun   but messy',
  mode: AiEditMode.Polish,
  nodeContext: 'Game: Demo'
});

assert.equal(polishCandidate.candidateValue, 'fun but messy.');

const moduleSummaryInput: AiModuleSummaryInput = {
  module: {
    nodeType: NodeType.Module,
    id: 'module_001',
    gameId: 'game_001',
    gameVersion: 'v1',
    moduleName: 'Workshop',
    modulePositioning: 'Existing parent positioning.',
    systemRules: '',
    resourceFlow: '',
    imageIds: [],
    playerMainActions: '',
    subjectiveFun: 'Existing subjective fun.',
    subjectiveProblems: '',
    subjectiveOptimizationDirections: '',
    creatorId: 'user_001',
    lastEditorId: 'user_001',
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-19T00:00:00.000Z'
  },
  contents: [
    {
      nodeType: NodeType.Content,
      id: 'content_001',
      gameId: 'game_001',
      gameVersion: 'v1',
      moduleId: 'module_001',
      title: 'Day 1 workshop entry',
      imageIds: [],
      processDescription: 'Player taps the workshop button and receives one free box.',
      subjectiveFun: 'Opening boxes feels clear.',
      subjectiveKnownProblems: 'Reward explanation is weak.',
      subjectiveOptimizationDirections: 'Clarify the first reward preview.',
      creatorId: 'user_001',
      lastEditorId: 'user_001',
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-19T00:00:00.000Z'
    }
  ],
  locale: 'en' as const
};

const moduleSummaryPrompt = buildModuleSummaryPrompt(moduleSummaryInput);

assert.match(moduleSummaryPrompt.systemPrompt, /Prefer supplementing missing parent-node information/);
assert.match(moduleSummaryPrompt.systemPrompt, /Preserve existing parent-node information/);
assert.match(moduleSummaryPrompt.systemPrompt, /Do not invent game facts/);
assert.match(moduleSummaryPrompt.userPrompt, /Day 1 workshop entry/);
assert.match(moduleSummaryPrompt.userPrompt, /Existing parent positioning/);

const moduleSummaryCandidate = await mockProvider.generateModuleSummary(moduleSummaryInput);

assert.equal(moduleSummaryCandidate.provider, 'mock');
assert.equal(moduleSummaryCandidate.moduleId, 'module_001');
assert.equal(moduleSummaryCandidate.contentCount, 1);
assert.equal(moduleSummaryCandidate.fields.length, 7);
assert.match(
  moduleSummaryCandidate.fields.find((field) => field.fieldName === 'modulePositioning')?.candidateValue ?? '',
  /Existing parent positioning/
);
assert.match(
  moduleSummaryCandidate.fields.find((field) => field.fieldName === 'modulePositioning')?.candidateValue ?? '',
  /Day 1 workshop entry/
);
assert.match(
  moduleSummaryCandidate.fields.find((field) => field.fieldName === 'subjectiveFun')?.candidateValue ?? '',
  /Existing subjective fun/
);
assert.match(
  moduleSummaryCandidate.fields.find((field) => field.fieldName === 'subjectiveProblems')?.candidateValue ?? '',
  /Reward explanation is weak/
);

const gameSummaryInput: AiGameSummaryInput = {
  game: {
    nodeType: NodeType.Game,
    id: 'game_001',
    gameName: 'Demo Game',
    gameVersion: 'v1',
    projectStage: ProjectStage.Testing,
    gameGenre: 'Idle RPG',
    coreGameplay: 'Existing game loop.',
    mainFun: 'Existing game fun.',
    targetUsers: '',
    currentOperationGoal: '',
    currentMainProblems: '',
    mainOptimizationDirections: '',
    creatorId: 'user_001',
    lastEditorId: 'user_001',
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-19T00:00:00.000Z'
  },
  modules: [
    {
      nodeType: NodeType.Module,
      id: 'module_001',
      gameId: 'game_001',
      gameVersion: 'v1',
      moduleName: 'Workshop',
      modulePositioning: 'The workshop drives the repeatable box-opening loop.',
      systemRules: 'Players tap to open boxes and receive equipment.',
      resourceFlow: '',
      imageIds: [],
      playerMainActions: 'Tap boxes, compare rewards, equip upgrades.',
      subjectiveFun: 'Fast reward reveals are satisfying.',
      subjectiveProblems: 'The reward comparison is hard to scan.',
      subjectiveOptimizationDirections: 'Clarify reward rarity and upgrade value.',
      creatorId: 'user_001',
      lastEditorId: 'user_001',
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-19T00:00:00.000Z'
    }
  ],
  locale: 'en' as const
};

const gameSummaryPrompt = buildGameSummaryPrompt(gameSummaryInput);

assert.match(gameSummaryPrompt.systemPrompt, /Prefer supplementing missing parent-node information/);
assert.match(gameSummaryPrompt.systemPrompt, /Preserve existing parent-node information/);
assert.match(gameSummaryPrompt.systemPrompt, /Do not invent game facts/);
assert.match(gameSummaryPrompt.userPrompt, /Existing game loop/);
assert.match(gameSummaryPrompt.userPrompt, /Workshop/);

const gameSummaryCandidate = await mockProvider.generateGameSummary(gameSummaryInput);

assert.equal(gameSummaryCandidate.provider, 'mock');
assert.equal(gameSummaryCandidate.gameId, 'game_001');
assert.equal(gameSummaryCandidate.moduleCount, 1);
assert.equal(gameSummaryCandidate.fields.length, 4);
assert.match(
  gameSummaryCandidate.fields.find((field) => field.fieldName === 'coreGameplay')?.candidateValue ?? '',
  /Existing game loop/
);
assert.match(
  gameSummaryCandidate.fields.find((field) => field.fieldName === 'coreGameplay')?.candidateValue ?? '',
  /repeatable box-opening loop/
);
assert.match(
  gameSummaryCandidate.fields.find((field) => field.fieldName === 'mainFun')?.candidateValue ?? '',
  /Existing game fun/
);
assert.match(
  gameSummaryCandidate.fields.find((field) => field.fieldName === 'currentMainProblems')?.candidateValue ?? '',
  /reward comparison is hard to scan/
);
