import {
  AiEditMode,
  type AiFieldEditInput,
  type AiFieldEditResult,
  type AiGameSummaryFieldName,
  type AiGameSummaryFieldResult,
  type AiGameSummaryInput,
  type AiGameSummaryResult,
  type AiModuleSummaryFieldName,
  type AiModuleSummaryFieldResult,
  type AiModuleSummaryInput,
  type AiModuleSummaryResult,
  type ApiConfig,
  type ApiConnectionTestResult,
  type SaveApiConfigInput
} from '../../shared/index.js';

export interface AiProvider {
  testConnection: () => Promise<ApiConnectionTestResult>;
  generateFieldEdit: (input: AiFieldEditInput) => Promise<AiFieldEditResult>;
  generateModuleSummary: (input: AiModuleSummaryInput) => Promise<AiModuleSummaryResult>;
  generateGameSummary: (input: AiGameSummaryInput) => Promise<AiGameSummaryResult>;
}

export interface AiFieldEditPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function createAiProvider(config: ApiConfig | SaveApiConfigInput): AiProvider {
  const baseUrl = config.baseUrl.trim();

  if (isMockProviderBaseUrl(baseUrl)) {
    return createMockAiProvider(config);
  }

  return createOpenAiCompatibleProvider(config);
}

export function createMockAiProvider(config: Pick<ApiConfig | SaveApiConfigInput, 'modelName'>): AiProvider {
  return {
    async testConnection(): Promise<ApiConnectionTestResult> {
      return {
        ok: true,
        provider: 'mock',
        message: 'Mock provider connection succeeded.',
        checkedAt: new Date().toISOString(),
        modelName: config.modelName.trim() || 'mock-model'
      };
    },
    async generateFieldEdit(input: AiFieldEditInput): Promise<AiFieldEditResult> {
      const prompt = buildFieldEditPrompt(input);
      const candidateValue = generateMockFieldEditCandidate(input);

      return {
        nodeType: input.nodeType,
        nodeId: input.nodeId,
        fieldName: input.fieldName,
        fieldLabel: input.fieldLabel,
        mode: input.mode,
        originalValue: input.fieldValue,
        candidateValue,
        prompt: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        provider: 'mock',
        modelName: config.modelName.trim() || 'mock-model',
        generatedAt: new Date().toISOString()
      };
    },
    async generateModuleSummary(input: AiModuleSummaryInput): Promise<AiModuleSummaryResult> {
      const prompt = buildModuleSummaryPrompt(input);

      return {
        nodeType: input.module.nodeType,
        moduleId: input.module.id,
        moduleName: input.module.moduleName,
        contentCount: input.contents.length,
        fields: generateMockModuleSummaryFields(input),
        prompt: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        provider: 'mock',
        modelName: config.modelName.trim() || 'mock-model',
        generatedAt: new Date().toISOString()
      };
    },
    async generateGameSummary(input: AiGameSummaryInput): Promise<AiGameSummaryResult> {
      const prompt = buildGameSummaryPrompt(input);

      return {
        nodeType: input.game.nodeType,
        gameId: input.game.id,
        gameName: input.game.gameName,
        moduleCount: input.modules.length,
        fields: generateMockGameSummaryFields(input),
        prompt: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        provider: 'mock',
        modelName: config.modelName.trim() || 'mock-model',
        generatedAt: new Date().toISOString()
      };
    }
  };
}

function createOpenAiCompatibleProvider(config: ApiConfig | SaveApiConfigInput): AiProvider {
  return {
    async testConnection(): Promise<ApiConnectionTestResult> {
      const baseUrl = config.baseUrl.trim().replace(/\/+$/g, '');
      const apiKey = config.apiKey?.trim();
      const modelName = config.modelName.trim();

      if (!baseUrl) {
        throw new Error('API Base URL is required.');
      }

      if (!modelName) {
        throw new Error('Model name is required.');
      }

      if (!apiKey) {
        throw new Error('API Key is required for OpenAI-compatible provider tests. Use mock://local for local mock tests.');
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: 'Return the word ok.'
            }
          ],
          max_tokens: 4
        })
      });

      if (!response.ok) {
        throw new Error(`Provider returned HTTP ${response.status}.`);
      }

      return {
        ok: true,
        provider: 'openai-compatible',
        message: 'OpenAI-compatible provider connection succeeded.',
        checkedAt: new Date().toISOString(),
        modelName
      };
    },
    async generateFieldEdit(input: AiFieldEditInput): Promise<AiFieldEditResult> {
      const baseUrl = config.baseUrl.trim().replace(/\/+$/g, '');
      const apiKey = config.apiKey?.trim();
      const modelName = config.modelName.trim();
      const prompt = buildFieldEditPrompt(input);

      if (!baseUrl) {
        throw new Error('API Base URL is required.');
      }

      if (!modelName) {
        throw new Error('Model name is required.');
      }

      if (!apiKey) {
        throw new Error('API Key is required for OpenAI-compatible AI editing. Use mock://local for local mock tests.');
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: prompt.systemPrompt
            },
            {
              role: 'user',
              content: prompt.userPrompt
            }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Provider returned HTTP ${response.status}.`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const candidateValue = data.choices?.[0]?.message?.content?.trim();

      if (!candidateValue) {
        throw new Error('Provider returned an empty AI edit candidate.');
      }

      return {
        nodeType: input.nodeType,
        nodeId: input.nodeId,
        fieldName: input.fieldName,
        fieldLabel: input.fieldLabel,
        mode: input.mode,
        originalValue: input.fieldValue,
        candidateValue,
        prompt: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        provider: 'openai-compatible',
        modelName,
        generatedAt: new Date().toISOString()
      };
    },
    async generateModuleSummary(input: AiModuleSummaryInput): Promise<AiModuleSummaryResult> {
      const baseUrl = config.baseUrl.trim().replace(/\/+$/g, '');
      const apiKey = config.apiKey?.trim();
      const modelName = config.modelName.trim();
      const prompt = buildModuleSummaryPrompt(input);

      if (!baseUrl) {
        throw new Error('API Base URL is required.');
      }

      if (!modelName) {
        throw new Error('Model name is required.');
      }

      if (!apiKey) {
        throw new Error('API Key is required for OpenAI-compatible AI summarization. Use mock://local for local mock tests.');
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: prompt.systemPrompt
            },
            {
              role: 'user',
              content: prompt.userPrompt
            }
          ],
          temperature: 0.2,
          response_format: {
            type: 'json_object'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Provider returned HTTP ${response.status}.`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const rawContent = data.choices?.[0]?.message?.content?.trim();

      if (!rawContent) {
        throw new Error('Provider returned an empty AI module summary candidate.');
      }

      return {
        nodeType: input.module.nodeType,
        moduleId: input.module.id,
        moduleName: input.module.moduleName,
        contentCount: input.contents.length,
        fields: parseModuleSummaryCandidate(rawContent, input),
        prompt: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        provider: 'openai-compatible',
        modelName,
        generatedAt: new Date().toISOString()
      };
    },
    async generateGameSummary(input: AiGameSummaryInput): Promise<AiGameSummaryResult> {
      const baseUrl = config.baseUrl.trim().replace(/\/+$/g, '');
      const apiKey = config.apiKey?.trim();
      const modelName = config.modelName.trim();
      const prompt = buildGameSummaryPrompt(input);

      if (!baseUrl) {
        throw new Error('API Base URL is required.');
      }

      if (!modelName) {
        throw new Error('Model name is required.');
      }

      if (!apiKey) {
        throw new Error('API Key is required for OpenAI-compatible AI summarization. Use mock://local for local mock tests.');
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: prompt.systemPrompt
            },
            {
              role: 'user',
              content: prompt.userPrompt
            }
          ],
          temperature: 0.2,
          response_format: {
            type: 'json_object'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Provider returned HTTP ${response.status}.`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const rawContent = data.choices?.[0]?.message?.content?.trim();

      if (!rawContent) {
        throw new Error('Provider returned an empty AI game summary candidate.');
      }

      return {
        nodeType: input.game.nodeType,
        gameId: input.game.id,
        gameName: input.game.gameName,
        moduleCount: input.modules.length,
        fields: parseGameSummaryCandidate(rawContent, input),
        prompt: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        provider: 'openai-compatible',
        modelName,
        generatedAt: new Date().toISOString()
      };
    }
  };
}

function isMockProviderBaseUrl(baseUrl: string): boolean {
  return baseUrl.toLowerCase().startsWith('mock://');
}

export function buildFieldEditPrompt(input: AiFieldEditInput): AiFieldEditPrompt {
  assertFieldEditMode(input.mode);

  const modeInstruction = getFieldEditModeInstruction(input.mode);
  const userInstruction = input.userInstruction?.trim() || '(No extra user instruction.)';
  const nodeContext = input.nodeContext?.trim() || '(No extra node context.)';

  return {
    systemPrompt: [
      'You are helping edit one field in a local game context manager.',
      'Return only the candidate field content.',
      'Do not return Markdown fences, explanations, JSON, or metadata.',
      'Do not invent game facts.',
      'Keep subjective fields subjective and do not turn opinions into facts.'
    ].join('\n'),
    userPrompt: [
      `Mode: ${input.mode}`,
      `Mode instruction: ${modeInstruction}`,
      `Node type: ${input.nodeType}`,
      `Node ID: ${input.nodeId}`,
      `Field name: ${input.fieldName}`,
      `Field label: ${input.fieldLabel}`,
      `Original field content:\n${input.fieldValue || '(empty)'}`,
      `User instruction:\n${userInstruction}`,
      `Necessary node context:\n${nodeContext}`
    ].join('\n\n')
  };
}

export function buildModuleSummaryPrompt(input: AiModuleSummaryInput): AiFieldEditPrompt {
  const outputKeys = MODULE_SUMMARY_FIELDS.map((field) => field.name).join(', ');
  const localeInstruction =
    input.locale === 'en'
      ? 'Use English for the candidate field content unless the original content is in another language.'
      : 'Use Chinese for the candidate field content unless the original content is in another language.';

  return {
    systemPrompt: [
      'You are helping summarize child content nodes into one parent game module node.',
      'Return only a JSON object. Do not return Markdown fences, explanations, or metadata.',
      `The JSON object must contain exactly these string keys: ${outputKeys}.`,
      'Prefer supplementing missing parent-node information.',
      'Preserve existing parent-node information by default.',
      'Do not delete or weaken existing parent content unless child nodes clearly show a module change.',
      'Do not invent game facts.',
      'Keep subjective fields subjective and do not turn opinions into facts.',
      localeInstruction
    ].join('\n'),
    userPrompt: [
      `Module ID: ${input.module.id}`,
      `Module name: ${input.module.moduleName}`,
      `Current parent fields:\n${formatModuleSummaryParentFields(input)}`,
      `Child content nodes (${input.contents.length}):\n${formatModuleSummaryChildren(input)}`,
      'Generate candidate parent module fields from these child nodes.'
    ].join('\n\n')
  };
}

export function buildGameSummaryPrompt(input: AiGameSummaryInput): AiFieldEditPrompt {
  const outputKeys = GAME_SUMMARY_FIELDS.map((field) => field.name).join(', ');
  const localeInstruction =
    input.locale === 'en'
      ? 'Use English for the candidate field content unless the original content is in another language.'
      : 'Use Chinese for the candidate field content unless the original content is in another language.';

  return {
    systemPrompt: [
      'You are helping summarize second-level game module nodes into one parent game root node.',
      'Return only a JSON object. Do not return Markdown fences, explanations, or metadata.',
      `The JSON object must contain exactly these string keys: ${outputKeys}.`,
      'Prefer supplementing missing parent-node information.',
      'Preserve existing parent-node information by default.',
      'Do not delete or weaken existing parent game content unless module nodes clearly show a game-level change.',
      'Do not invent game facts.',
      'Keep subjective fields subjective and do not turn opinions into facts.',
      localeInstruction
    ].join('\n'),
    userPrompt: [
      `Game ID: ${input.game.id}`,
      `Game name: ${input.game.gameName}`,
      `Game version: ${input.game.gameVersion}`,
      `Current parent fields:\n${formatGameSummaryParentFields(input)}`,
      `Module nodes (${input.modules.length}):\n${formatGameSummaryModules(input)}`,
      'Generate candidate parent game fields from these module nodes.'
    ].join('\n\n')
  };
}

function getFieldEditModeInstruction(mode: AiEditMode): string {
  switch (mode) {
    case AiEditMode.Add:
      return 'Add the user-provided content into the original field. Preserve all existing information, merge clearly, do not delete original information, and do not invent new facts.';
    case AiEditMode.Modify:
      return 'Modify only according to the user instruction. Do not change unrelated facts. If the instruction conflicts with original content, make the change traceable in the candidate wording.';
    case AiEditMode.Polish:
      return 'Only polish expression, structure, and terminology. Do not add facts, delete information, or change the strength of subjective judgments.';
    default:
      throw new Error(`Unsupported field-level AI edit mode: ${mode}`);
  }
}

function assertFieldEditMode(mode: AiEditMode): void {
  if (![AiEditMode.Add, AiEditMode.Modify, AiEditMode.Polish].includes(mode)) {
    throw new Error(`Unsupported field-level AI edit mode: ${mode}`);
  }
}

function generateMockFieldEditCandidate(input: AiFieldEditInput): string {
  const originalValue = input.fieldValue.trim();
  const instruction = input.userInstruction?.trim();

  switch (input.mode) {
    case AiEditMode.Add:
      return [originalValue, instruction ? `Mock added content: ${instruction}` : 'Mock added content.']
        .filter(Boolean)
        .join('\n\n');
    case AiEditMode.Modify:
      return instruction || originalValue || 'Mock modified content.';
    case AiEditMode.Polish:
      return polishMockText(originalValue || instruction || 'Mock polished content.');
    default:
      throw new Error(`Unsupported field-level AI edit mode: ${input.mode}`);
  }
}

function polishMockText(value: string): string {
  const compactValue = value.replaceAll(/[ \t]+/g, ' ').replaceAll(/\n{3,}/g, '\n\n').trim();

  return compactValue.endsWith('.') || compactValue.endsWith('。') ? compactValue : `${compactValue}.`;
}

const MODULE_SUMMARY_FIELDS: Array<{
  name: AiModuleSummaryFieldName;
  label: string;
}> = [
  {
    name: 'modulePositioning',
    label: 'Module positioning'
  },
  {
    name: 'systemRules',
    label: 'System rules'
  },
  {
    name: 'resourceFlow',
    label: 'Resource output/consumption'
  },
  {
    name: 'playerMainActions',
    label: 'Player main actions'
  },
  {
    name: 'subjectiveFun',
    label: 'Fun points (subjective)'
  },
  {
    name: 'subjectiveProblems',
    label: 'Main problems (subjective)'
  },
  {
    name: 'subjectiveOptimizationDirections',
    label: 'Optimization directions (subjective)'
  }
];

const GAME_SUMMARY_FIELDS: Array<{
  name: AiGameSummaryFieldName;
  label: string;
}> = [
  {
    name: 'coreGameplay',
    label: 'Core gameplay'
  },
  {
    name: 'mainFun',
    label: 'Main fun'
  },
  {
    name: 'mainOptimizationDirections',
    label: 'Main optimization directions'
  },
  {
    name: 'currentMainProblems',
    label: 'Current main problems'
  }
];

function formatModuleSummaryParentFields(input: AiModuleSummaryInput): string {
  return MODULE_SUMMARY_FIELDS.map((field) => {
    const value = String(input.module[field.name] ?? '').trim() || '(empty)';

    return `- ${field.label} (${field.name}):\n${value}`;
  }).join('\n\n');
}

function formatModuleSummaryChildren(input: AiModuleSummaryInput): string {
  if (input.contents.length === 0) {
    return '(No child content nodes.)';
  }

  return input.contents
    .map((content, index) =>
      [
        `Child ${index + 1}: ${content.title} (${content.id})`,
        `Account day: ${content.accountDay ?? '(empty)'}`,
        `Cumulative payment: ${content.cumulativePaymentAmount ?? '(empty)'}`,
        `Max mainline progress: ${content.maxMainlineProgress ?? '(empty)'}`,
        `Character level: ${content.characterLevel ?? '(empty)'}`,
        `Process description:\n${content.processDescription?.trim() || '(empty)'}`,
        `Fun points (subjective):\n${content.subjectiveFun?.trim() || '(empty)'}`,
        `Known problems (subjective):\n${content.subjectiveKnownProblems?.trim() || '(empty)'}`,
        `Optimization directions (subjective):\n${content.subjectiveOptimizationDirections?.trim() || '(empty)'}`
      ].join('\n')
    )
    .join('\n\n');
}

function formatGameSummaryParentFields(input: AiGameSummaryInput): string {
  return GAME_SUMMARY_FIELDS.map((field) => {
    const value = String(input.game[field.name] ?? '').trim() || '(empty)';

    return `- ${field.label} (${field.name}):\n${value}`;
  }).join('\n\n');
}

function formatGameSummaryModules(input: AiGameSummaryInput): string {
  if (input.modules.length === 0) {
    return '(No module nodes.)';
  }

  return input.modules
    .map((module, index) =>
      [
        `Module ${index + 1}: ${module.moduleName} (${module.id})`,
        `Module positioning:\n${module.modulePositioning?.trim() || '(empty)'}`,
        `System rules:\n${module.systemRules?.trim() || '(empty)'}`,
        `Resource output/consumption:\n${module.resourceFlow?.trim() || '(empty)'}`,
        `Player main actions:\n${module.playerMainActions?.trim() || '(empty)'}`,
        `Fun points (subjective):\n${module.subjectiveFun?.trim() || '(empty)'}`,
        `Main problems (subjective):\n${module.subjectiveProblems?.trim() || '(empty)'}`,
        `Optimization directions (subjective):\n${module.subjectiveOptimizationDirections?.trim() || '(empty)'}`
      ].join('\n')
    )
    .join('\n\n');
}

function generateMockModuleSummaryFields(input: AiModuleSummaryInput): AiModuleSummaryFieldResult[] {
  return MODULE_SUMMARY_FIELDS.map((field) => {
    const originalValue = String(input.module[field.name] ?? '').trim();
    const childSummary = buildMockChildSummary(input, field.name);

    return {
      fieldName: field.name,
      fieldLabel: field.label,
      originalValue,
      candidateValue: [originalValue, childSummary].filter(Boolean).join('\n\n')
    };
  });
}

function buildMockChildSummary(input: AiModuleSummaryInput, fieldName: AiModuleSummaryFieldName): string {
  if (input.contents.length === 0) {
    return '';
  }

  const childValues = input.contents
    .map((content) => getMockChildFieldValue(content, fieldName))
    .filter((value) => value.length > 0);
  const summarySource = childValues.length > 0
    ? childValues.slice(0, 3).join(' / ')
    : input.contents.map((content) => content.title).slice(0, 3).join(' / ');

  return `Mock child summary (${input.contents.length} content nodes): ${summarySource}`;
}

function getMockChildFieldValue(
  content: AiModuleSummaryInput['contents'][number],
  fieldName: AiModuleSummaryFieldName
): string {
  switch (fieldName) {
    case 'modulePositioning':
      return content.title.trim();
    case 'systemRules':
    case 'resourceFlow':
    case 'playerMainActions':
      return content.processDescription?.trim() ?? '';
    case 'subjectiveFun':
      return content.subjectiveFun?.trim() ?? '';
    case 'subjectiveProblems':
      return content.subjectiveKnownProblems?.trim() ?? '';
    case 'subjectiveOptimizationDirections':
      return content.subjectiveOptimizationDirections?.trim() ?? '';
    default:
      return '';
  }
}

function generateMockGameSummaryFields(input: AiGameSummaryInput): AiGameSummaryFieldResult[] {
  return GAME_SUMMARY_FIELDS.map((field) => {
    const originalValue = String(input.game[field.name] ?? '').trim();
    const moduleSummary = buildMockModuleSummary(input, field.name);

    return {
      fieldName: field.name,
      fieldLabel: field.label,
      originalValue,
      candidateValue: [originalValue, moduleSummary].filter(Boolean).join('\n\n')
    };
  });
}

function buildMockModuleSummary(input: AiGameSummaryInput, fieldName: AiGameSummaryFieldName): string {
  if (input.modules.length === 0) {
    return '';
  }

  const moduleValues = input.modules
    .map((module) => getMockModuleFieldValue(module, fieldName))
    .filter((value) => value.length > 0);
  const summarySource = moduleValues.length > 0
    ? moduleValues.slice(0, 3).join(' / ')
    : input.modules.map((module) => module.moduleName).slice(0, 3).join(' / ');

  return `Mock module summary (${input.modules.length} module nodes): ${summarySource}`;
}

function getMockModuleFieldValue(
  module: AiGameSummaryInput['modules'][number],
  fieldName: AiGameSummaryFieldName
): string {
  switch (fieldName) {
    case 'coreGameplay':
      return [module.modulePositioning, module.systemRules, module.playerMainActions]
        .map((value) => value?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
    case 'mainFun':
      return module.subjectiveFun?.trim() ?? '';
    case 'mainOptimizationDirections':
      return module.subjectiveOptimizationDirections?.trim() ?? '';
    case 'currentMainProblems':
      return module.subjectiveProblems?.trim() ?? '';
    default:
      return '';
  }
}

function parseModuleSummaryCandidate(rawContent: string, input: AiModuleSummaryInput): AiModuleSummaryFieldResult[] {
  const parsed = JSON.parse(rawContent) as Partial<Record<AiModuleSummaryFieldName, unknown>>;

  return MODULE_SUMMARY_FIELDS.map((field) => {
    const rawValue = parsed[field.name];

    if (typeof rawValue !== 'string') {
      throw new Error(`Provider summary JSON is missing string field: ${field.name}`);
    }

    return {
      fieldName: field.name,
      fieldLabel: field.label,
      originalValue: String(input.module[field.name] ?? '').trim(),
      candidateValue: rawValue.trim()
    };
  });
}

function parseGameSummaryCandidate(rawContent: string, input: AiGameSummaryInput): AiGameSummaryFieldResult[] {
  const parsed = JSON.parse(rawContent) as Partial<Record<AiGameSummaryFieldName, unknown>>;

  return GAME_SUMMARY_FIELDS.map((field) => {
    const rawValue = parsed[field.name];

    if (typeof rawValue !== 'string') {
      throw new Error(`Provider summary JSON is missing string field: ${field.name}`);
    }

    return {
      fieldName: field.name,
      fieldLabel: field.label,
      originalValue: String(input.game[field.name] ?? '').trim(),
      candidateValue: rawValue.trim()
    };
  });
}
