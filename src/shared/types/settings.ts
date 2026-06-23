import type { ISODateTimeString } from './domain.js';

export type AppLanguage = 'zh' | 'en';

export interface AppSettings {
  language: AppLanguage;
  updatedAt?: ISODateTimeString;
}

export interface SaveAppSettingsInput {
  language: AppLanguage;
}

export interface AppSettingsState {
  settings: AppSettings;
}

export interface AppReadmeResult {
  content: string;
}
