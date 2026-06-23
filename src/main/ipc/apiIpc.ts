import electron from 'electron';
import { createAiProvider } from '../services/aiProviderService.js';
import type { SqliteService } from '../services/sqliteService.js';
import type {
  AiFieldEditInput,
  AiFieldEditResult,
  AiGameSummaryResult,
  AiModuleSummaryResult,
  ApiConfigState,
  ApiConnectionTestResult,
  GenerateAiGameSummaryInput,
  GenerateAiModuleSummaryInput,
  SaveApiConfigInput
} from '../../shared/index.js';

const { ipcMain } = electron;

export const API_GET_STATE_CHANNEL = 'api:get-state';
export const API_SAVE_CONFIG_CHANNEL = 'api:save-config';
export const API_TEST_CONNECTION_CHANNEL = 'api:test-connection';
export const API_GENERATE_FIELD_EDIT_CHANNEL = 'api:generate-field-edit';
export const API_GENERATE_MODULE_SUMMARY_CHANNEL = 'api:generate-module-summary';
export const API_GENERATE_GAME_SUMMARY_CHANNEL = 'api:generate-game-summary';

export function registerApiIpc(sqliteService: SqliteService): void {
  ipcMain.handle(API_GET_STATE_CHANNEL, (): ApiConfigState => ({
    config: sqliteService.getApiConfig()
  }));

  ipcMain.handle(API_SAVE_CONFIG_CHANNEL, (_event, input: SaveApiConfigInput): ApiConfigState => ({
    config: sqliteService.saveApiConfig(input)
  }));

  ipcMain.handle(API_TEST_CONNECTION_CHANNEL, async (_event, input?: SaveApiConfigInput): Promise<ApiConnectionTestResult> => {
    const config = input ?? sqliteService.getApiConfig();

    if (!config) {
      throw new Error('Save API configuration before testing the connection.');
    }

    return createAiProvider(config).testConnection();
  });

  ipcMain.handle(API_GENERATE_FIELD_EDIT_CHANNEL, async (_event, input: AiFieldEditInput): Promise<AiFieldEditResult> => {
    const config = sqliteService.getApiConfig();

    if (!config) {
      throw new Error('Save API configuration before using AI editing.');
    }

    return createAiProvider(config).generateFieldEdit(input);
  });

  ipcMain.handle(API_GENERATE_MODULE_SUMMARY_CHANNEL, async (_event, input: GenerateAiModuleSummaryInput): Promise<AiModuleSummaryResult> => {
    const config = sqliteService.getApiConfig();

    if (!config) {
      throw new Error('Save API configuration before using AI summarization.');
    }

    const module = sqliteService.getModuleNode(input.workspaceId, input.moduleId);

    if (!module) {
      throw new Error(`Module node not found: ${input.moduleId}`);
    }

    return createAiProvider(config).generateModuleSummary({
      module,
      contents: sqliteService.getContentNodes(input.workspaceId, input.moduleId),
      locale: input.locale
    });
  });

  ipcMain.handle(API_GENERATE_GAME_SUMMARY_CHANNEL, async (_event, input: GenerateAiGameSummaryInput): Promise<AiGameSummaryResult> => {
    const config = sqliteService.getApiConfig();

    if (!config) {
      throw new Error('Save API configuration before using AI summarization.');
    }

    const game = sqliteService.getGameNode(input.workspaceId);

    if (!game) {
      throw new Error(`Game node not found for workspace: ${input.workspaceId}`);
    }

    return createAiProvider(config).generateGameSummary({
      game,
      modules: sqliteService.getModuleNodes(input.workspaceId),
      locale: input.locale
    });
  });
}
