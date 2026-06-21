import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  DEFAULT_API_CONFIG_ID,
  NodeType,
  type ApiConfig,
  type ContentNode,
  type CreateContentNodeInput,
  type CreateGameNodeInput,
  type CreateLocalUserInput,
  type CreateModuleNodeInput,
  type DeleteContentNodeInput,
  type DeleteImageAssetInput,
  type DeleteModuleNodeInput,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
  type SaveApiConfigInput,
  type UpdateContentNodeInput,
  type UpdateModuleNodeInput,
  type UserId,
  type UserState,
  type WorkspaceConfig,
  type WorkspaceId
} from '../../shared/index.js';

export const DATABASE_SCHEMA_VERSION = 1;
export const DEFAULT_DATABASE_FILE_NAME = 'game-context-manager.sqlite3';

export const REQUIRED_TABLES = [
  'schema_migrations',
  'users',
  'workspaces',
  'game_nodes',
  'module_nodes',
  'content_nodes',
  'image_assets',
  'node_image_links',
  'api_configs',
  'edit_history'
] as const;

type RequiredTableName = (typeof REQUIRED_TABLES)[number];

interface Migration {
  version: number;
  name: string;
  sql: string;
}

export interface InitializeSqliteServiceOptions {
  databasePath: string;
  journalMode?: 'WAL' | 'DELETE';
}

export interface TableVerificationResult {
  tableNames: string[];
  missingTables: RequiredTableName[];
}

export interface SqliteService {
  databasePath: string;
  schemaVersion: number;
  database: DatabaseSync;
  getAppliedMigrations: () => number[];
  getTableNames: () => string[];
  verifyRequiredTables: () => TableVerificationResult;
  getUserState: (workspaceId?: WorkspaceId) => UserState;
  createLocalUser: (input: CreateLocalUserInput, workspaceId?: WorkspaceId) => LocalUser;
  selectCurrentUser: (userId: UserId, workspaceId?: WorkspaceId) => LocalUser;
  getApiConfig: () => ApiConfig | undefined;
  saveApiConfig: (input: SaveApiConfigInput) => ApiConfig;
  getWorkspace: (workspaceId: WorkspaceId) => WorkspaceConfig | undefined;
  saveWorkspace: (workspace: WorkspaceConfig) => void;
  replaceWorkspaceSnapshot: (snapshot: WorkspaceImportSnapshot) => void;
  getGameNode: (workspaceId: WorkspaceId) => GameNode | undefined;
  createGameNode: (input: CreateGameNodeInput, creatorId: UserId) => GameNode;
  updateGameNode: (workspaceId: WorkspaceId, input: CreateGameNodeInput, editorId: UserId) => GameNode;
  getModuleNodes: (workspaceId: WorkspaceId) => ModuleNode[];
  getModuleNode: (workspaceId: WorkspaceId, moduleId: string) => ModuleNode | undefined;
  createModuleNode: (input: CreateModuleNodeInput, creatorId: UserId) => ModuleNode;
  updateModuleNode: (input: UpdateModuleNodeInput, editorId: UserId) => ModuleNode;
  deleteModuleNode: (input: DeleteModuleNodeInput) => void;
  getContentNodes: (workspaceId: WorkspaceId, moduleId?: string) => ContentNode[];
  getContentNode: (workspaceId: WorkspaceId, contentId: string) => ContentNode | undefined;
  createContentNode: (input: CreateContentNodeInput, creatorId: UserId) => ContentNode;
  updateContentNode: (input: UpdateContentNodeInput, editorId: UserId) => ContentNode;
  deleteContentNode: (input: DeleteContentNodeInput) => void;
  getNodeImageLinks: (workspaceId: WorkspaceId) => NodeImageLink[];
  getImageAssets: (workspaceId: WorkspaceId) => ImageAsset[];
  getImageAsset: (workspaceId: WorkspaceId, imageId: string) => ImageAsset | undefined;
  createImageAsset: (workspaceId: WorkspaceId, image: ImageAsset) => ImageAsset;
  deleteImageAsset: (input: DeleteImageAssetInput) => void;
  close: () => void;
}

export interface WorkspaceImportSnapshot {
  workspace: WorkspaceConfig;
  users: LocalUser[];
  game?: GameNode;
  modules: ModuleNode[];
  contents: ContentNode[];
  images: ImageAsset[];
  imageLinks: NodeImageLink[];
}

const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL,
  context_path TEXT NOT NULL,
  active_game_id TEXT,
  current_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS game_nodes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  game_version TEXT NOT NULL,
  project_stage TEXT NOT NULL CHECK (project_stage IN ('planning', 'testing', 'live', 'pre_closure')),
  game_genre TEXT,
  core_gameplay TEXT,
  main_fun TEXT,
  target_users TEXT,
  current_operation_goal TEXT,
  current_main_problems TEXT,
  main_optimization_directions TEXT,
  notes TEXT,
  cover_image_id TEXT,
  creator_id TEXT NOT NULL REFERENCES users(id),
  last_editor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id)
) STRICT;

CREATE TABLE IF NOT EXISTS module_nodes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES game_nodes(id) ON DELETE CASCADE,
  game_version TEXT NOT NULL,
  module_name TEXT NOT NULL,
  module_positioning TEXT,
  system_rules TEXT,
  resource_flow TEXT,
  player_main_actions TEXT,
  subjective_fun TEXT,
  subjective_problems TEXT,
  subjective_optimization_directions TEXT,
  creator_id TEXT NOT NULL REFERENCES users(id),
  last_editor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS content_nodes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES game_nodes(id) ON DELETE CASCADE,
  game_version TEXT NOT NULL,
  module_id TEXT NOT NULL REFERENCES module_nodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  account_day TEXT,
  cumulative_payment_amount TEXT,
  max_mainline_progress TEXT,
  character_level TEXT,
  process_description TEXT,
  subjective_fun TEXT,
  subjective_known_problems TEXT,
  subjective_optimization_directions TEXT,
  creator_id TEXT NOT NULL REFERENCES users(id),
  last_editor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS image_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES game_nodes(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploader_id TEXT NOT NULL REFERENCES users(id),
  updated_at TEXT NOT NULL,
  notes TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS node_image_links (
  node_type TEXT NOT NULL CHECK (node_type IN ('game', 'module', 'content')),
  node_id TEXT NOT NULL,
  image_id TEXT NOT NULL REFERENCES image_assets(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (node_type, node_id, image_id)
) STRICT;

CREATE TABLE IF NOT EXISTS api_configs (
  id TEXT PRIMARY KEY,
  base_url TEXT NOT NULL,
  api_key TEXT,
  model_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS edit_history (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('game', 'module', 'content')),
  node_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  edit_mode TEXT NOT NULL,
  previous_value TEXT,
  next_value TEXT,
  editor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  summary TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_workspaces_current_user_id ON workspaces(current_user_id);
CREATE INDEX IF NOT EXISTS idx_game_nodes_workspace_id ON game_nodes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_module_nodes_game_id ON module_nodes(game_id);
CREATE INDEX IF NOT EXISTS idx_content_nodes_module_id ON content_nodes(module_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_game_id ON image_assets(game_id);
CREATE INDEX IF NOT EXISTS idx_node_image_links_image_id ON node_image_links(image_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_node ON edit_history(node_type, node_id);
`;

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: INITIAL_SCHEMA_SQL
  }
];

export function getDefaultDatabasePath(userDataPath: string): string {
  return join(userDataPath, DEFAULT_DATABASE_FILE_NAME);
}

export function initializeSqliteService(options: InitializeSqliteServiceOptions): SqliteService {
  const { databasePath, journalMode = 'WAL' } = options;

  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath, {
    enableForeignKeyConstraints: true
  });

  database.exec('PRAGMA foreign_keys = ON;');
  database.exec(`PRAGMA journal_mode = ${journalMode};`);
  ensureMigrationTable(database);
  applyMigrations(database);

  return {
    databasePath,
    schemaVersion: DATABASE_SCHEMA_VERSION,
    database,
    getAppliedMigrations: () => getAppliedMigrations(database),
    getTableNames: () => getTableNames(database),
    verifyRequiredTables: () => verifyRequiredTables(database),
    getUserState: (workspaceId) => getUserState(database, workspaceId),
    createLocalUser: (input, workspaceId) => createLocalUser(database, input, workspaceId),
    selectCurrentUser: (userId, workspaceId) => selectCurrentUser(database, userId, workspaceId),
    getApiConfig: () => getApiConfig(database),
    saveApiConfig: (input) => saveApiConfig(database, input),
    getWorkspace: (workspaceId) => getWorkspace(database, workspaceId),
    saveWorkspace: (workspace) => saveWorkspace(database, workspace),
    replaceWorkspaceSnapshot: (snapshot) => replaceWorkspaceSnapshot(database, snapshot),
    getGameNode: (workspaceId) => getGameNode(database, workspaceId),
    createGameNode: (input, creatorId) => createGameNode(database, input, creatorId),
    updateGameNode: (workspaceId, input, editorId) => updateGameNode(database, workspaceId, input, editorId),
    getModuleNodes: (workspaceId) => getModuleNodes(database, workspaceId),
    getModuleNode: (workspaceId, moduleId) => getModuleNode(database, workspaceId, moduleId),
    createModuleNode: (input, creatorId) => createModuleNode(database, input, creatorId),
    updateModuleNode: (input, editorId) => updateModuleNode(database, input, editorId),
    deleteModuleNode: (input) => deleteModuleNode(database, input),
    getContentNodes: (workspaceId, moduleId) => getContentNodes(database, workspaceId, moduleId),
    getContentNode: (workspaceId, contentId) => getContentNode(database, workspaceId, contentId),
    createContentNode: (input, creatorId) => createContentNode(database, input, creatorId),
    updateContentNode: (input, editorId) => updateContentNode(database, input, editorId),
    deleteContentNode: (input) => deleteContentNode(database, input),
    getNodeImageLinks: (workspaceId) => getNodeImageLinks(database, workspaceId),
    getImageAssets: (workspaceId) => getImageAssets(database, workspaceId),
    getImageAsset: (workspaceId, imageId) => getImageAsset(database, workspaceId, imageId),
    createImageAsset: (workspaceId, image) => createImageAsset(database, workspaceId, image),
    deleteImageAsset: (input) => deleteImageAsset(database, input),
    close: () => {
      if (database.isOpen) {
        database.close();
      }
    }
  };
}

function ensureMigrationTable(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);
}

function applyMigrations(database: DatabaseSync): void {
  const appliedVersions = new Set(getAppliedMigrations(database));
  const insertMigration = database.prepare(`
    INSERT INTO schema_migrations (version, name, applied_at)
    VALUES (?, ?, ?)
  `);

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    database.exec('BEGIN IMMEDIATE;');
    try {
      database.exec(migration.sql);
      insertMigration.run(migration.version, migration.name, new Date().toISOString());
      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }
  }
}

function getAppliedMigrations(database: DatabaseSync): number[] {
  return database
    .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
    .all()
    .map((row) => Number(row.version));
}

function getTableNames(database: DatabaseSync): string[] {
  return database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name ASC
      `
    )
    .all()
    .map((row) => String(row.name));
}

function verifyRequiredTables(database: DatabaseSync): TableVerificationResult {
  const tableNames = getTableNames(database);
  const tableNameSet = new Set(tableNames);
  const missingTables = REQUIRED_TABLES.filter((tableName) => !tableNameSet.has(tableName));

  return {
    tableNames,
    missingTables
  };
}

function getUserState(database: DatabaseSync, workspaceId?: WorkspaceId): UserState {
  return {
    users: getUsers(database),
    currentUser: getCurrentUser(database, workspaceId)
  };
}

function getUsers(database: DatabaseSync): LocalUser[] {
  return database
    .prepare(
      `
        SELECT id, display_name, created_at, last_login_at
        FROM users
        ORDER BY COALESCE(last_login_at, created_at) DESC, display_name ASC
      `
    )
    .all()
    .map(mapUserRow);
}

function getCurrentUser(database: DatabaseSync, workspaceId?: WorkspaceId): LocalUser | undefined {
  if (workspaceId) {
    const workspaceUser = database
      .prepare(
        `
          SELECT users.id, users.display_name, users.created_at, users.last_login_at
          FROM workspaces
          JOIN users ON users.id = workspaces.current_user_id
          WHERE workspaces.id = ?
        `
      )
      .get(workspaceId);

    if (workspaceUser) {
      return mapUserRow(workspaceUser);
    }
  }

  const recentUser = database
    .prepare(
      `
        SELECT id, display_name, created_at, last_login_at
        FROM users
        ORDER BY COALESCE(last_login_at, created_at) DESC, created_at DESC
        LIMIT 1
      `
    )
    .get();

  return recentUser ? mapUserRow(recentUser) : undefined;
}

function createLocalUser(database: DatabaseSync, input: CreateLocalUserInput, workspaceId?: WorkspaceId): LocalUser {
  const displayName = input.displayName.trim();

  if (!displayName) {
    throw new Error('Local user display name is required.');
  }

  const now = new Date().toISOString();
  const user: LocalUser = {
    id: `user_${randomUUID().replaceAll('-', '')}`,
    displayName,
    createdAt: now,
    lastLoginAt: now
  };

  database.exec('BEGIN IMMEDIATE;');
  try {
    database
      .prepare(
        `
          INSERT INTO users (id, display_name, created_at, last_login_at)
          VALUES (?, ?, ?, ?)
        `
      )
      .run(user.id, user.displayName, user.createdAt, user.lastLoginAt ?? null);

    if (workspaceId) {
      updateWorkspaceCurrentUser(database, workspaceId, user.id, now);
    }

    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return user;
}

function selectCurrentUser(database: DatabaseSync, userId: UserId, workspaceId?: WorkspaceId): LocalUser {
  const existingUser = database
    .prepare(
      `
        SELECT id, display_name, created_at, last_login_at
        FROM users
        WHERE id = ?
      `
    )
    .get(userId);

  if (!existingUser) {
    throw new Error(`Local user not found: ${userId}`);
  }

  const now = new Date().toISOString();

  database.exec('BEGIN IMMEDIATE;');
  try {
    database.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, userId);

    if (workspaceId) {
      updateWorkspaceCurrentUser(database, workspaceId, userId, now);
    }

    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return {
    ...mapUserRow(existingUser),
    lastLoginAt: now
  };
}

function updateWorkspaceCurrentUser(database: DatabaseSync, workspaceId: WorkspaceId, userId: UserId, updatedAt: string): void {
  const result = database
    .prepare(
      `
        UPDATE workspaces
        SET current_user_id = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .run(userId, updatedAt, workspaceId);

  if (result.changes === 0) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }
}

function mapUserRow(row: unknown): LocalUser {
  const userRow = row as {
    id: string;
    display_name: string;
    created_at: string;
    last_login_at: string | null;
  };

  return {
    id: userRow.id,
    displayName: userRow.display_name,
    createdAt: userRow.created_at,
    lastLoginAt: userRow.last_login_at ?? undefined
  };
}

function getApiConfig(database: DatabaseSync): ApiConfig | undefined {
  const row = database
    .prepare(
      `
        SELECT id, base_url, api_key, model_name, enabled, created_at, updated_at
        FROM api_configs
        WHERE id = ?
      `
    )
    .get(DEFAULT_API_CONFIG_ID);

  return row ? mapApiConfigRow(row) : undefined;
}

function saveApiConfig(database: DatabaseSync, input: SaveApiConfigInput): ApiConfig {
  const baseUrl = input.baseUrl.trim();
  const modelName = input.modelName.trim();
  const apiKey = optionalTrim(input.apiKey);

  if (!baseUrl) {
    throw new Error('API Base URL is required.');
  }

  if (!modelName) {
    throw new Error('Model name is required.');
  }

  const existingConfig = getApiConfig(database);
  const now = new Date().toISOString();
  const config: ApiConfig = {
    id: DEFAULT_API_CONFIG_ID,
    baseUrl,
    apiKey,
    modelName,
    enabled: input.enabled,
    createdAt: existingConfig?.createdAt ?? now,
    updatedAt: now
  };

  database
    .prepare(
      `
        INSERT INTO api_configs (id, base_url, api_key, model_name, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          base_url = excluded.base_url,
          api_key = excluded.api_key,
          model_name = excluded.model_name,
          enabled = excluded.enabled,
          updated_at = excluded.updated_at
      `
    )
    .run(
      config.id,
      config.baseUrl,
      config.apiKey ?? null,
      config.modelName,
      config.enabled ? 1 : 0,
      config.createdAt,
      config.updatedAt
    );

  return config;
}

function saveWorkspace(database: DatabaseSync, workspace: WorkspaceConfig): void {
  database
    .prepare(
      `
        INSERT INTO workspaces (
          id,
          root_path,
          context_path,
          active_game_id,
          current_user_id,
          schema_version,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          root_path = excluded.root_path,
          context_path = excluded.context_path,
          active_game_id = excluded.active_game_id,
          current_user_id = excluded.current_user_id,
          schema_version = excluded.schema_version,
          updated_at = excluded.updated_at
      `
    )
    .run(
      workspace.id,
      workspace.rootPath,
      workspace.contextPath,
      workspace.activeGameId ?? null,
      workspace.currentUserId ?? null,
      workspace.schemaVersion,
      workspace.createdAt,
      workspace.updatedAt
    );
}

function replaceWorkspaceSnapshot(database: DatabaseSync, snapshot: WorkspaceImportSnapshot): void {
  const now = new Date().toISOString();

  database.exec('BEGIN IMMEDIATE;');
  try {
    const upsertUser = database.prepare(`
      INSERT INTO users (id, display_name, created_at, last_login_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_login_at = COALESCE(excluded.last_login_at, users.last_login_at)
    `);

    for (const user of snapshot.users) {
      upsertUser.run(user.id, user.displayName, user.createdAt, user.lastLoginAt ?? null);
    }

    saveWorkspace(database, snapshot.workspace);

    database.prepare('DELETE FROM node_image_links WHERE image_id IN (SELECT id FROM image_assets WHERE workspace_id = ?)').run(snapshot.workspace.id);
    database.prepare('DELETE FROM content_nodes WHERE workspace_id = ?').run(snapshot.workspace.id);
    database.prepare('DELETE FROM module_nodes WHERE workspace_id = ?').run(snapshot.workspace.id);
    database.prepare('DELETE FROM image_assets WHERE workspace_id = ?').run(snapshot.workspace.id);
    database.prepare('DELETE FROM game_nodes WHERE workspace_id = ?').run(snapshot.workspace.id);

    if (snapshot.game) {
      insertGameNode(database, snapshot.workspace.id, snapshot.game);
    }

    for (const image of snapshot.images) {
      insertImageAsset(database, snapshot.workspace.id, image);
    }

    for (const module of snapshot.modules) {
      insertModuleNode(database, snapshot.workspace.id, module);
    }

    for (const content of snapshot.contents) {
      insertContentNode(database, snapshot.workspace.id, content);
    }

    const insertLink = database.prepare(`
      INSERT OR IGNORE INTO node_image_links (node_type, node_id, image_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const link of snapshot.imageLinks) {
      insertLink.run(link.nodeType, link.nodeId, link.imageId, now);
    }

    database
      .prepare(
        `
          UPDATE workspaces
          SET active_game_id = ?,
              current_user_id = ?,
              updated_at = ?
          WHERE id = ?
        `
      )
      .run(snapshot.game?.id ?? null, snapshot.workspace.currentUserId ?? null, snapshot.workspace.updatedAt, snapshot.workspace.id);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

function getWorkspace(database: DatabaseSync, workspaceId: WorkspaceId): WorkspaceConfig | undefined {
  const row = database
    .prepare(
      `
        SELECT id, root_path, context_path, active_game_id, current_user_id, schema_version, created_at, updated_at
        FROM workspaces
        WHERE id = ?
      `
    )
    .get(workspaceId);

  return row ? mapWorkspaceRow(row) : undefined;
}

function getGameNode(database: DatabaseSync, workspaceId: WorkspaceId): GameNode | undefined {
  const row = database
    .prepare(
      `
        SELECT
          id,
          game_name,
          game_version,
          project_stage,
          game_genre,
          core_gameplay,
          main_fun,
          target_users,
          current_operation_goal,
          current_main_problems,
          main_optimization_directions,
          notes,
          cover_image_id,
          creator_id,
          last_editor_id,
          created_at,
          updated_at
        FROM game_nodes
        WHERE workspace_id = ?
      `
    )
    .get(workspaceId);

  return row ? mapGameNodeRow(row) : undefined;
}

function createGameNode(database: DatabaseSync, input: CreateGameNodeInput, creatorId: UserId): GameNode {
  const workspace = getWorkspace(database, input.workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${input.workspaceId}`);
  }

  if (getGameNode(database, input.workspaceId)) {
    throw new Error('This workspace already has a game node.');
  }

  const now = new Date().toISOString();
  const game: GameNode = {
    ...normalizeGameEditableFields(input),
    nodeType: NodeType.Game,
    id: normalizeGameNodeId(input.id, input.gameName),
    creatorId,
    lastEditorId: creatorId,
    createdAt: now,
    updatedAt: now
  };

  database.exec('BEGIN IMMEDIATE;');
  try {
    insertGameNode(database, input.workspaceId, game);
    database
      .prepare(
        `
          UPDATE workspaces
          SET active_game_id = ?,
              updated_at = ?
          WHERE id = ?
        `
      )
      .run(game.id, now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return game;
}

function updateGameNode(
  database: DatabaseSync,
  workspaceId: WorkspaceId,
  input: CreateGameNodeInput,
  editorId: UserId
): GameNode {
  const existingGame = getGameNode(database, workspaceId);

  if (!existingGame) {
    throw new Error(`Game node not found for workspace: ${workspaceId}`);
  }

  const now = new Date().toISOString();
  const nextGame: GameNode = {
    ...existingGame,
    ...normalizeGameEditableFields(input),
    lastEditorId: editorId,
    updatedAt: now
  };

  database.exec('BEGIN IMMEDIATE;');
  try {
    database
      .prepare(
        `
          UPDATE game_nodes
          SET game_name = ?,
              game_version = ?,
              project_stage = ?,
              game_genre = ?,
              core_gameplay = ?,
              main_fun = ?,
              target_users = ?,
              current_operation_goal = ?,
              current_main_problems = ?,
              main_optimization_directions = ?,
              notes = ?,
              cover_image_id = ?,
              last_editor_id = ?,
              updated_at = ?
          WHERE workspace_id = ?
            AND id = ?
        `
      )
      .run(
        nextGame.gameName,
        nextGame.gameVersion,
        nextGame.projectStage,
        nextGame.gameGenre ?? null,
        nextGame.coreGameplay ?? null,
        nextGame.mainFun ?? null,
        nextGame.targetUsers ?? null,
        nextGame.currentOperationGoal ?? null,
        nextGame.currentMainProblems ?? null,
        nextGame.mainOptimizationDirections ?? null,
        nextGame.notes ?? null,
        nextGame.coverImageId ?? null,
        nextGame.lastEditorId,
        nextGame.updatedAt,
        workspaceId,
        nextGame.id
      );
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return nextGame;
}

function insertGameNode(database: DatabaseSync, workspaceId: WorkspaceId, game: GameNode): void {
  database
    .prepare(
      `
        INSERT INTO game_nodes (
          id,
          workspace_id,
          game_name,
          game_version,
          project_stage,
          game_genre,
          core_gameplay,
          main_fun,
          target_users,
          current_operation_goal,
          current_main_problems,
          main_optimization_directions,
          notes,
          cover_image_id,
          creator_id,
          last_editor_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      game.id,
      workspaceId,
      game.gameName,
      game.gameVersion,
      game.projectStage,
      game.gameGenre ?? null,
      game.coreGameplay ?? null,
      game.mainFun ?? null,
      game.targetUsers ?? null,
      game.currentOperationGoal ?? null,
      game.currentMainProblems ?? null,
      game.mainOptimizationDirections ?? null,
      game.notes ?? null,
      game.coverImageId ?? null,
      game.creatorId,
      game.lastEditorId,
      game.createdAt,
      game.updatedAt
    );
}

function getModuleNodes(database: DatabaseSync, workspaceId: WorkspaceId): ModuleNode[] {
  const rows = database
    .prepare(
      `
        SELECT
          id,
          game_id,
          game_version,
          module_name,
          module_positioning,
          system_rules,
          resource_flow,
          player_main_actions,
          subjective_fun,
          subjective_problems,
          subjective_optimization_directions,
          creator_id,
          last_editor_id,
          created_at,
          updated_at
        FROM module_nodes
        WHERE workspace_id = ?
        ORDER BY module_name ASC, created_at ASC
      `
    )
    .all(workspaceId);
  const imageIdsByModuleId = getModuleImageIdsByModuleId(database, rows.map((row) => String((row as { id: string }).id)));

  return rows.map((row) => {
    const moduleId = String((row as { id: string }).id);

    return mapModuleNodeRow(row, imageIdsByModuleId.get(moduleId) ?? []);
  });
}

function getModuleNode(database: DatabaseSync, workspaceId: WorkspaceId, moduleId: string): ModuleNode | undefined {
  const row = database
    .prepare(
      `
        SELECT
          id,
          game_id,
          game_version,
          module_name,
          module_positioning,
          system_rules,
          resource_flow,
          player_main_actions,
          subjective_fun,
          subjective_problems,
          subjective_optimization_directions,
          creator_id,
          last_editor_id,
          created_at,
          updated_at
        FROM module_nodes
        WHERE workspace_id = ?
          AND id = ?
      `
    )
    .get(workspaceId, moduleId);

  if (!row) {
    return undefined;
  }

  return mapModuleNodeRow(row, getModuleImageIds(database, moduleId));
}

function createModuleNode(database: DatabaseSync, input: CreateModuleNodeInput, creatorId: UserId): ModuleNode {
  const workspace = getWorkspace(database, input.workspaceId);
  const game = getGameNode(database, input.workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${input.workspaceId}`);
  }

  if (!game) {
    throw new Error('Create the game root node before creating modules.');
  }

  const now = new Date().toISOString();
  const module: ModuleNode = {
    ...normalizeModuleEditableFields(input),
    nodeType: NodeType.Module,
    id: normalizeModuleNodeId(input.id, input.moduleName),
    gameId: game.id,
    gameVersion: game.gameVersion,
    creatorId,
    lastEditorId: creatorId,
    createdAt: now,
    updatedAt: now
  };

  validateImageIds(database, input.workspaceId, game.id, module.imageIds);

  database.exec('BEGIN IMMEDIATE;');
  try {
    insertModuleNode(database, input.workspaceId, module);
    replaceModuleImageLinks(database, module.id, module.imageIds, now);
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return module;
}

function updateModuleNode(database: DatabaseSync, input: UpdateModuleNodeInput, editorId: UserId): ModuleNode {
  const existingModule = getModuleNode(database, input.workspaceId, input.id);

  if (!existingModule) {
    throw new Error(`Module node not found: ${input.id}`);
  }

  const now = new Date().toISOString();
  const nextModule: ModuleNode = {
    ...existingModule,
    ...normalizeModuleEditableFields(input),
    lastEditorId: editorId,
    updatedAt: now
  };

  validateImageIds(database, input.workspaceId, nextModule.gameId, nextModule.imageIds);

  database.exec('BEGIN IMMEDIATE;');
  try {
    database
      .prepare(
        `
          UPDATE module_nodes
          SET module_name = ?,
              module_positioning = ?,
              system_rules = ?,
              resource_flow = ?,
              player_main_actions = ?,
              subjective_fun = ?,
              subjective_problems = ?,
              subjective_optimization_directions = ?,
              last_editor_id = ?,
              updated_at = ?
          WHERE workspace_id = ?
            AND id = ?
        `
      )
      .run(
        nextModule.moduleName,
        nextModule.modulePositioning ?? null,
        nextModule.systemRules ?? null,
        nextModule.resourceFlow ?? null,
        nextModule.playerMainActions ?? null,
        nextModule.subjectiveFun ?? null,
        nextModule.subjectiveProblems ?? null,
        nextModule.subjectiveOptimizationDirections ?? null,
        nextModule.lastEditorId,
        nextModule.updatedAt,
        input.workspaceId,
        nextModule.id
      );
    replaceModuleImageLinks(database, nextModule.id, nextModule.imageIds, now);
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return nextModule;
}

function deleteModuleNode(database: DatabaseSync, input: DeleteModuleNodeInput): void {
  const existingModule = getModuleNode(database, input.workspaceId, input.id);

  if (!existingModule) {
    throw new Error(`Module node not found: ${input.id}`);
  }

  const now = new Date().toISOString();
  const childContentIds = getContentNodes(database, input.workspaceId, input.id).map((content) => content.id);

  database.exec('BEGIN IMMEDIATE;');
  try {
    const deleteLinks = database.prepare('DELETE FROM node_image_links WHERE node_type = ? AND node_id = ?');

    for (const contentId of childContentIds) {
      deleteLinks.run(NodeType.Content, contentId);
    }

    database.prepare('DELETE FROM node_image_links WHERE node_type = ? AND node_id = ?').run(NodeType.Module, input.id);
    database.prepare('DELETE FROM content_nodes WHERE workspace_id = ? AND module_id = ?').run(input.workspaceId, input.id);
    database.prepare('DELETE FROM module_nodes WHERE workspace_id = ? AND id = ?').run(input.workspaceId, input.id);
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

function insertModuleNode(database: DatabaseSync, workspaceId: WorkspaceId, module: ModuleNode): void {
  database
    .prepare(
      `
        INSERT INTO module_nodes (
          id,
          workspace_id,
          game_id,
          game_version,
          module_name,
          module_positioning,
          system_rules,
          resource_flow,
          player_main_actions,
          subjective_fun,
          subjective_problems,
          subjective_optimization_directions,
          creator_id,
          last_editor_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      module.id,
      workspaceId,
      module.gameId,
      module.gameVersion,
      module.moduleName,
      module.modulePositioning ?? null,
      module.systemRules ?? null,
      module.resourceFlow ?? null,
      module.playerMainActions ?? null,
      module.subjectiveFun ?? null,
      module.subjectiveProblems ?? null,
      module.subjectiveOptimizationDirections ?? null,
      module.creatorId,
      module.lastEditorId,
      module.createdAt,
      module.updatedAt
    );
}

function replaceModuleImageLinks(database: DatabaseSync, moduleId: string, imageIds: string[], createdAt: string): void {
  database.prepare('DELETE FROM node_image_links WHERE node_type = ? AND node_id = ?').run(NodeType.Module, moduleId);

  const insertLink = database.prepare(
    `
      INSERT INTO node_image_links (node_type, node_id, image_id, created_at)
      VALUES (?, ?, ?, ?)
    `
  );

  for (const imageId of imageIds) {
    insertLink.run(NodeType.Module, moduleId, imageId, createdAt);
  }
}

function getModuleImageIds(database: DatabaseSync, moduleId: string): string[] {
  return database
    .prepare(
      `
        SELECT image_id
        FROM node_image_links
        WHERE node_type = ?
          AND node_id = ?
        ORDER BY image_id ASC
      `
    )
    .all(NodeType.Module, moduleId)
    .map((row) => String(row.image_id));
}

function getModuleImageIdsByModuleId(database: DatabaseSync, moduleIds: string[]): Map<string, string[]> {
  const imageIdsByModuleId = new Map<string, string[]>();

  for (const moduleId of moduleIds) {
    imageIdsByModuleId.set(moduleId, getModuleImageIds(database, moduleId));
  }

  return imageIdsByModuleId;
}

function getContentNodes(database: DatabaseSync, workspaceId: WorkspaceId, moduleId?: string): ContentNode[] {
  const rows = moduleId
    ? database
        .prepare(
          `
            SELECT
              id,
              game_id,
              game_version,
              module_id,
              title,
              account_day,
              cumulative_payment_amount,
              max_mainline_progress,
              character_level,
              process_description,
              subjective_fun,
              subjective_known_problems,
              subjective_optimization_directions,
              creator_id,
              last_editor_id,
              created_at,
              updated_at
            FROM content_nodes
            WHERE workspace_id = ?
              AND module_id = ?
            ORDER BY title ASC, created_at ASC
          `
        )
        .all(workspaceId, moduleId)
    : database
        .prepare(
          `
            SELECT
              id,
              game_id,
              game_version,
              module_id,
              title,
              account_day,
              cumulative_payment_amount,
              max_mainline_progress,
              character_level,
              process_description,
              subjective_fun,
              subjective_known_problems,
              subjective_optimization_directions,
              creator_id,
              last_editor_id,
              created_at,
              updated_at
            FROM content_nodes
            WHERE workspace_id = ?
            ORDER BY module_id ASC, title ASC, created_at ASC
          `
        )
        .all(workspaceId);
  const imageIdsByContentId = getContentImageIdsByContentId(
    database,
    rows.map((row) => String((row as { id: string }).id))
  );

  return rows.map((row) => {
    const contentId = String((row as { id: string }).id);

    return mapContentNodeRow(row, imageIdsByContentId.get(contentId) ?? []);
  });
}

function getContentNode(database: DatabaseSync, workspaceId: WorkspaceId, contentId: string): ContentNode | undefined {
  const row = database
    .prepare(
      `
        SELECT
          id,
          game_id,
          game_version,
          module_id,
          title,
          account_day,
          cumulative_payment_amount,
          max_mainline_progress,
          character_level,
          process_description,
          subjective_fun,
          subjective_known_problems,
          subjective_optimization_directions,
          creator_id,
          last_editor_id,
          created_at,
          updated_at
        FROM content_nodes
        WHERE workspace_id = ?
          AND id = ?
      `
    )
    .get(workspaceId, contentId);

  if (!row) {
    return undefined;
  }

  return mapContentNodeRow(row, getContentImageIds(database, contentId));
}

function createContentNode(database: DatabaseSync, input: CreateContentNodeInput, creatorId: UserId): ContentNode {
  const workspace = getWorkspace(database, input.workspaceId);
  const module = getModuleNode(database, input.workspaceId, input.moduleId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${input.workspaceId}`);
  }

  if (!module) {
    throw new Error(`Module node not found: ${input.moduleId}`);
  }

  const editableFields = normalizeContentEditableFields(input);
  const now = new Date().toISOString();
  const content: ContentNode = {
    ...editableFields,
    nodeType: NodeType.Content,
    id: normalizeContentNodeId(input.id, editableFields.title),
    gameId: module.gameId,
    gameVersion: module.gameVersion,
    moduleId: module.id,
    creatorId,
    lastEditorId: creatorId,
    createdAt: now,
    updatedAt: now
  };

  validateImageIds(database, input.workspaceId, content.gameId, content.imageIds);
  validateContentImageReferences(database, input.workspaceId, content.imageIds, content.processDescription);

  database.exec('BEGIN IMMEDIATE;');
  try {
    insertContentNode(database, input.workspaceId, content);
    replaceContentImageLinks(database, content.id, content.imageIds, now);
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return content;
}

function updateContentNode(database: DatabaseSync, input: UpdateContentNodeInput, editorId: UserId): ContentNode {
  const existingContent = getContentNode(database, input.workspaceId, input.id);

  if (!existingContent) {
    throw new Error(`Content node not found: ${input.id}`);
  }

  if (input.moduleId !== existingContent.moduleId) {
    throw new Error('Moving a content node to another module is not supported in the current MVP task.');
  }

  const now = new Date().toISOString();
  const nextContent: ContentNode = {
    ...existingContent,
    ...normalizeContentEditableFields(input),
    moduleId: existingContent.moduleId,
    lastEditorId: editorId,
    updatedAt: now
  };

  validateImageIds(database, input.workspaceId, nextContent.gameId, nextContent.imageIds);
  validateContentImageReferences(database, input.workspaceId, nextContent.imageIds, nextContent.processDescription);

  database.exec('BEGIN IMMEDIATE;');
  try {
    database
      .prepare(
        `
          UPDATE content_nodes
          SET title = ?,
              account_day = ?,
              cumulative_payment_amount = ?,
              max_mainline_progress = ?,
              character_level = ?,
              process_description = ?,
              subjective_fun = ?,
              subjective_known_problems = ?,
              subjective_optimization_directions = ?,
              last_editor_id = ?,
              updated_at = ?
          WHERE workspace_id = ?
            AND id = ?
        `
      )
      .run(
        nextContent.title,
        nextContent.accountDay ?? null,
        nextContent.cumulativePaymentAmount ?? null,
        nextContent.maxMainlineProgress ?? null,
        nextContent.characterLevel ?? null,
        nextContent.processDescription ?? null,
        nextContent.subjectiveFun ?? null,
        nextContent.subjectiveKnownProblems ?? null,
        nextContent.subjectiveOptimizationDirections ?? null,
        nextContent.lastEditorId,
        nextContent.updatedAt,
        input.workspaceId,
        nextContent.id
      );
    replaceContentImageLinks(database, nextContent.id, nextContent.imageIds, now);
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }

  return nextContent;
}

function deleteContentNode(database: DatabaseSync, input: DeleteContentNodeInput): void {
  const existingContent = getContentNode(database, input.workspaceId, input.id);

  if (!existingContent) {
    throw new Error(`Content node not found: ${input.id}`);
  }

  const now = new Date().toISOString();

  database.exec('BEGIN IMMEDIATE;');
  try {
    database.prepare('DELETE FROM node_image_links WHERE node_type = ? AND node_id = ?').run(NodeType.Content, input.id);
    database.prepare('DELETE FROM content_nodes WHERE workspace_id = ? AND id = ?').run(input.workspaceId, input.id);
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

function insertContentNode(database: DatabaseSync, workspaceId: WorkspaceId, content: ContentNode): void {
  database
    .prepare(
      `
        INSERT INTO content_nodes (
          id,
          workspace_id,
          game_id,
          game_version,
          module_id,
          title,
          account_day,
          cumulative_payment_amount,
          max_mainline_progress,
          character_level,
          process_description,
          subjective_fun,
          subjective_known_problems,
          subjective_optimization_directions,
          creator_id,
          last_editor_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      content.id,
      workspaceId,
      content.gameId,
      content.gameVersion,
      content.moduleId,
      content.title,
      content.accountDay ?? null,
      content.cumulativePaymentAmount ?? null,
      content.maxMainlineProgress ?? null,
      content.characterLevel ?? null,
      content.processDescription ?? null,
      content.subjectiveFun ?? null,
      content.subjectiveKnownProblems ?? null,
      content.subjectiveOptimizationDirections ?? null,
      content.creatorId,
      content.lastEditorId,
      content.createdAt,
      content.updatedAt
    );
}

function replaceContentImageLinks(database: DatabaseSync, contentId: string, imageIds: string[], createdAt: string): void {
  database.prepare('DELETE FROM node_image_links WHERE node_type = ? AND node_id = ?').run(NodeType.Content, contentId);

  const insertLink = database.prepare(
    `
      INSERT INTO node_image_links (node_type, node_id, image_id, created_at)
      VALUES (?, ?, ?, ?)
    `
  );

  for (const imageId of imageIds) {
    insertLink.run(NodeType.Content, contentId, imageId, createdAt);
  }
}

function getContentImageIds(database: DatabaseSync, contentId: string): string[] {
  return database
    .prepare(
      `
        SELECT image_id
        FROM node_image_links
        WHERE node_type = ?
          AND node_id = ?
        ORDER BY image_id ASC
      `
    )
    .all(NodeType.Content, contentId)
    .map((row) => String(row.image_id));
}

function getContentImageIdsByContentId(database: DatabaseSync, contentIds: string[]): Map<string, string[]> {
  const imageIdsByContentId = new Map<string, string[]>();

  for (const contentId of contentIds) {
    imageIdsByContentId.set(contentId, getContentImageIds(database, contentId));
  }

  return imageIdsByContentId;
}

function getNodeImageLinks(database: DatabaseSync, workspaceId: WorkspaceId): NodeImageLink[] {
  return database
    .prepare(
      `
        SELECT links.node_type, links.node_id, links.image_id
        FROM node_image_links links
        JOIN image_assets images ON images.id = links.image_id
        WHERE images.workspace_id = ?
        ORDER BY links.node_type ASC, links.node_id ASC, links.image_id ASC
      `
    )
    .all(workspaceId)
    .map((row) => {
      const linkRow = row as { node_type: NodeType; node_id: string; image_id: string };

      return {
        nodeType: linkRow.node_type,
        nodeId: linkRow.node_id,
        imageId: linkRow.image_id
      };
    });
}

function getImageAssets(database: DatabaseSync, workspaceId: WorkspaceId): ImageAsset[] {
  return database
    .prepare(
      `
        SELECT
          id,
          display_name,
          original_file_name,
          relative_path,
          file_type,
          game_id,
          uploader_id,
          updated_at,
          notes
        FROM image_assets
        WHERE workspace_id = ?
        ORDER BY updated_at DESC, display_name ASC
      `
    )
    .all(workspaceId)
    .map(mapImageAssetRow);
}

function getImageAsset(database: DatabaseSync, workspaceId: WorkspaceId, imageId: string): ImageAsset | undefined {
  const row = database
    .prepare(
      `
        SELECT
          id,
          display_name,
          original_file_name,
          relative_path,
          file_type,
          game_id,
          uploader_id,
          updated_at,
          notes
        FROM image_assets
        WHERE workspace_id = ?
          AND id = ?
      `
    )
    .get(workspaceId, imageId);

  return row ? mapImageAssetRow(row) : undefined;
}

function createImageAsset(database: DatabaseSync, workspaceId: WorkspaceId, image: ImageAsset): ImageAsset {
  const workspace = getWorkspace(database, workspaceId);

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  if (!workspace.activeGameId) {
    throw new Error(`Workspace has no active game: ${workspaceId}`);
  }

  insertImageAsset(database, workspaceId, image);

  return image;
}

function insertImageAsset(database: DatabaseSync, workspaceId: WorkspaceId, image: ImageAsset): void {
  database
    .prepare(
      `
        INSERT INTO image_assets (
          id,
          workspace_id,
          game_id,
          display_name,
          original_file_name,
          relative_path,
          file_type,
          uploader_id,
          updated_at,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      image.id,
      workspaceId,
      image.gameId,
      image.displayName,
      image.originalFileName,
      image.relativePath,
      image.fileType,
      image.uploaderId,
      image.updatedAt,
      image.notes ?? null
    );
}

function deleteImageAsset(database: DatabaseSync, input: DeleteImageAssetInput): void {
  const image = getImageAsset(database, input.workspaceId, input.id);

  if (!image) {
    throw new Error(`Image asset not found: ${input.id}`);
  }

  const now = new Date().toISOString();
  const linkedContentIds = database
    .prepare(
      `
        SELECT node_id
        FROM node_image_links
        WHERE node_type = ?
          AND image_id = ?
        ORDER BY node_id ASC
      `
    )
    .all(NodeType.Content, image.id)
    .map((row) => String(row.node_id));

  database.exec('BEGIN IMMEDIATE;');
  try {
    for (const contentId of linkedContentIds) {
      const content = getContentNode(database, input.workspaceId, contentId);

      if (!content?.processDescription) {
        continue;
      }

      database
        .prepare(
          `
            UPDATE content_nodes
            SET process_description = ?,
                updated_at = ?
            WHERE workspace_id = ?
              AND id = ?
          `
        )
        .run(removeImageReferences(content.processDescription, image), now, input.workspaceId, contentId);
    }

    database
      .prepare(
        `
          UPDATE game_nodes
          SET cover_image_id = NULL,
              updated_at = ?
          WHERE workspace_id = ?
            AND cover_image_id = ?
        `
      )
      .run(now, input.workspaceId, image.id);
    database.prepare('DELETE FROM node_image_links WHERE image_id = ?').run(image.id);
    database.prepare('DELETE FROM image_assets WHERE workspace_id = ? AND id = ?').run(input.workspaceId, image.id);
    database.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, input.workspaceId);
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

function normalizeGameEditableFields(input: CreateGameNodeInput): Omit<
  GameNode,
  'nodeType' | 'id' | 'creatorId' | 'lastEditorId' | 'createdAt' | 'updatedAt'
> {
  const gameName = input.gameName.trim();
  const gameVersion = input.gameVersion.trim();

  if (!gameName) {
    throw new Error('Game name is required.');
  }

  if (!gameVersion) {
    throw new Error('Game version is required.');
  }

  return {
    gameName,
    gameVersion,
    projectStage: input.projectStage,
    gameGenre: optionalTrim(input.gameGenre),
    coreGameplay: optionalTrim(input.coreGameplay),
    mainFun: optionalTrim(input.mainFun),
    targetUsers: optionalTrim(input.targetUsers),
    currentOperationGoal: optionalTrim(input.currentOperationGoal),
    currentMainProblems: optionalTrim(input.currentMainProblems),
    mainOptimizationDirections: optionalTrim(input.mainOptimizationDirections),
    notes: optionalTrim(input.notes),
    coverImageId: optionalTrim(input.coverImageId)
  };
}

function normalizeModuleEditableFields(input: CreateModuleNodeInput | UpdateModuleNodeInput): Omit<
  ModuleNode,
  'nodeType' | 'id' | 'gameId' | 'gameVersion' | 'creatorId' | 'lastEditorId' | 'createdAt' | 'updatedAt'
> {
  const moduleName = input.moduleName.trim();

  if (!moduleName) {
    throw new Error('Module name is required.');
  }

  return {
    moduleName,
    modulePositioning: optionalTrim(input.modulePositioning),
    systemRules: optionalTrim(input.systemRules),
    resourceFlow: optionalTrim(input.resourceFlow),
    imageIds: [...new Set(input.imageIds.map((imageId) => imageId.trim()).filter(Boolean))],
    playerMainActions: optionalTrim(input.playerMainActions),
    subjectiveFun: optionalTrim(input.subjectiveFun),
    subjectiveProblems: optionalTrim(input.subjectiveProblems),
    subjectiveOptimizationDirections: optionalTrim(input.subjectiveOptimizationDirections)
  };
}

function normalizeContentEditableFields(input: CreateContentNodeInput | UpdateContentNodeInput): Omit<
  ContentNode,
  'nodeType' | 'id' | 'gameId' | 'gameVersion' | 'creatorId' | 'lastEditorId' | 'createdAt' | 'updatedAt'
> {
  const title = input.title.trim();

  if (!title) {
    throw new Error('Content title is required.');
  }

  return {
    moduleId: input.moduleId,
    title,
    imageIds: [...new Set(input.imageIds.map((imageId) => imageId.trim()).filter(Boolean))],
    accountDay: optionalTrim(input.accountDay),
    cumulativePaymentAmount: optionalTrim(input.cumulativePaymentAmount),
    maxMainlineProgress: optionalTrim(input.maxMainlineProgress),
    characterLevel: optionalTrim(input.characterLevel),
    processDescription: optionalTrim(input.processDescription),
    subjectiveFun: optionalTrim(input.subjectiveFun),
    subjectiveKnownProblems: optionalTrim(input.subjectiveKnownProblems),
    subjectiveOptimizationDirections: optionalTrim(input.subjectiveOptimizationDirections)
  };
}

function optionalTrim(value: string | undefined): string | undefined {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

function normalizeGameNodeId(inputId: string | undefined, gameName: string): string {
  const source = inputId?.trim() || gameName.trim();
  const slug = source
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/^_+|_+$/g, '');

  if (slug) {
    return slug;
  }

  return `game_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function normalizeModuleNodeId(inputId: string | undefined, moduleName: string): string {
  const source = inputId?.trim() || moduleName.trim();
  const slug = source
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/^_+|_+$/g, '');

  if (slug) {
    return slug;
  }

  return `module_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function normalizeContentNodeId(inputId: string | undefined, title: string): string {
  const source = inputId?.trim() || title.trim();
  const slug = source
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, '_')
    .replaceAll(/_+/g, '_')
    .replaceAll(/^_+|_+$/g, '');

  if (slug) {
    return slug;
  }

  return `content_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function validateImageIds(database: DatabaseSync, workspaceId: WorkspaceId, gameId: string, imageIds: string[]): void {
  if (imageIds.length === 0) {
    return;
  }

  const availableImageIds = new Set(
    getImageAssets(database, workspaceId)
      .filter((image) => image.gameId === gameId)
      .map((image) => image.id)
  );
  const missingImageIds = imageIds.filter((imageId) => !availableImageIds.has(imageId));

  if (missingImageIds.length > 0) {
    throw new Error(`Image assets not found for this game: ${missingImageIds.join(', ')}`);
  }
}

function validateContentImageReferences(
  database: DatabaseSync,
  workspaceId: WorkspaceId,
  linkedImageIds: string[],
  processDescription?: string
): void {
  const references = extractImageReferences(processDescription);

  if (references.length === 0) {
    return;
  }

  const linkedImageIdSet = new Set(linkedImageIds);
  const linkedImages = getImageAssets(database, workspaceId).filter((image) => linkedImageIdSet.has(image.id));
  const linkedReferenceTokens = new Set<string>();

  for (const image of linkedImages) {
    linkedReferenceTokens.add(image.id);
    linkedReferenceTokens.add(image.displayName);
  }

  const invalidReferences = references.filter((reference) => !linkedReferenceTokens.has(reference));

  if (invalidReferences.length > 0) {
    throw new Error(`Image reference is not linked to this content node: @${invalidReferences[0]}`);
  }
}

function extractImageReferences(processDescription?: string): string[] {
  if (!processDescription) {
    return [];
  }

  const matches = [...processDescription.matchAll(/@([^\s,，。；;:：)）\]】}]+)/g)];
  return [...new Set(matches.map((match) => match[1]))];
}

function removeImageReferences(processDescription: string, image: ImageAsset): string {
  return [image.id, image.displayName]
    .filter(Boolean)
    .reduce((nextDescription, token) => nextDescription.replaceAll(new RegExp(`@${escapeRegExp(token)}`, 'g'), ''), processDescription)
    .replaceAll(/[ \t]{2,}/g, ' ')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapWorkspaceRow(row: unknown): WorkspaceConfig {
  const workspaceRow = row as {
    id: string;
    root_path: string;
    context_path: string;
    active_game_id: string | null;
    current_user_id: string | null;
    schema_version: number;
    created_at: string;
    updated_at: string;
  };

  return {
    id: workspaceRow.id,
    rootPath: workspaceRow.root_path,
    contextPath: workspaceRow.context_path,
    activeGameId: workspaceRow.active_game_id ?? undefined,
    currentUserId: workspaceRow.current_user_id ?? undefined,
    schemaVersion: workspaceRow.schema_version,
    createdAt: workspaceRow.created_at,
    updatedAt: workspaceRow.updated_at
  };
}

function mapGameNodeRow(row: unknown): GameNode {
  const gameRow = row as {
    id: string;
    game_name: string;
    game_version: string;
    project_stage: GameNode['projectStage'];
    game_genre: string | null;
    core_gameplay: string | null;
    main_fun: string | null;
    target_users: string | null;
    current_operation_goal: string | null;
    current_main_problems: string | null;
    main_optimization_directions: string | null;
    notes: string | null;
    cover_image_id: string | null;
    creator_id: string;
    last_editor_id: string;
    created_at: string;
    updated_at: string;
  };

  return {
    nodeType: NodeType.Game,
    id: gameRow.id,
    gameName: gameRow.game_name,
    gameVersion: gameRow.game_version,
    projectStage: gameRow.project_stage,
    gameGenre: gameRow.game_genre ?? undefined,
    coreGameplay: gameRow.core_gameplay ?? undefined,
    mainFun: gameRow.main_fun ?? undefined,
    targetUsers: gameRow.target_users ?? undefined,
    currentOperationGoal: gameRow.current_operation_goal ?? undefined,
    currentMainProblems: gameRow.current_main_problems ?? undefined,
    mainOptimizationDirections: gameRow.main_optimization_directions ?? undefined,
    notes: gameRow.notes ?? undefined,
    coverImageId: gameRow.cover_image_id ?? undefined,
    creatorId: gameRow.creator_id,
    lastEditorId: gameRow.last_editor_id,
    createdAt: gameRow.created_at,
    updatedAt: gameRow.updated_at
  };
}

function mapModuleNodeRow(row: unknown, imageIds: string[]): ModuleNode {
  const moduleRow = row as {
    id: string;
    game_id: string;
    game_version: string;
    module_name: string;
    module_positioning: string | null;
    system_rules: string | null;
    resource_flow: string | null;
    player_main_actions: string | null;
    subjective_fun: string | null;
    subjective_problems: string | null;
    subjective_optimization_directions: string | null;
    creator_id: string;
    last_editor_id: string;
    created_at: string;
    updated_at: string;
  };

  return {
    nodeType: NodeType.Module,
    id: moduleRow.id,
    gameId: moduleRow.game_id,
    gameVersion: moduleRow.game_version,
    moduleName: moduleRow.module_name,
    modulePositioning: moduleRow.module_positioning ?? undefined,
    systemRules: moduleRow.system_rules ?? undefined,
    resourceFlow: moduleRow.resource_flow ?? undefined,
    imageIds,
    playerMainActions: moduleRow.player_main_actions ?? undefined,
    subjectiveFun: moduleRow.subjective_fun ?? undefined,
    subjectiveProblems: moduleRow.subjective_problems ?? undefined,
    subjectiveOptimizationDirections: moduleRow.subjective_optimization_directions ?? undefined,
    creatorId: moduleRow.creator_id,
    lastEditorId: moduleRow.last_editor_id,
    createdAt: moduleRow.created_at,
    updatedAt: moduleRow.updated_at
  };
}

function mapContentNodeRow(row: unknown, imageIds: string[]): ContentNode {
  const contentRow = row as {
    id: string;
    game_id: string;
    game_version: string;
    module_id: string;
    title: string;
    account_day: string | null;
    cumulative_payment_amount: string | null;
    max_mainline_progress: string | null;
    character_level: string | null;
    process_description: string | null;
    subjective_fun: string | null;
    subjective_known_problems: string | null;
    subjective_optimization_directions: string | null;
    creator_id: string;
    last_editor_id: string;
    created_at: string;
    updated_at: string;
  };

  return {
    nodeType: NodeType.Content,
    id: contentRow.id,
    gameId: contentRow.game_id,
    gameVersion: contentRow.game_version,
    moduleId: contentRow.module_id,
    title: contentRow.title,
    imageIds,
    accountDay: contentRow.account_day ?? undefined,
    cumulativePaymentAmount: contentRow.cumulative_payment_amount ?? undefined,
    maxMainlineProgress: contentRow.max_mainline_progress ?? undefined,
    characterLevel: contentRow.character_level ?? undefined,
    processDescription: contentRow.process_description ?? undefined,
    subjectiveFun: contentRow.subjective_fun ?? undefined,
    subjectiveKnownProblems: contentRow.subjective_known_problems ?? undefined,
    subjectiveOptimizationDirections: contentRow.subjective_optimization_directions ?? undefined,
    creatorId: contentRow.creator_id,
    lastEditorId: contentRow.last_editor_id,
    createdAt: contentRow.created_at,
    updatedAt: contentRow.updated_at
  };
}

function mapImageAssetRow(row: unknown): ImageAsset {
  const imageRow = row as {
    id: string;
    display_name: string;
    original_file_name: string;
    relative_path: string;
    file_type: string;
    game_id: string;
    uploader_id: string;
    updated_at: string;
    notes: string | null;
  };

  return {
    id: imageRow.id,
    displayName: imageRow.display_name,
    originalFileName: imageRow.original_file_name,
    relativePath: imageRow.relative_path,
    fileType: imageRow.file_type,
    gameId: imageRow.game_id,
    uploaderId: imageRow.uploader_id,
    updatedAt: imageRow.updated_at,
    notes: imageRow.notes ?? undefined
  };
}

function mapApiConfigRow(row: unknown): ApiConfig {
  const apiConfigRow = row as {
    id: string;
    base_url: string;
    api_key: string | null;
    model_name: string;
    enabled: number;
    created_at: string;
    updated_at: string;
  };

  return {
    id: apiConfigRow.id,
    baseUrl: apiConfigRow.base_url,
    apiKey: apiConfigRow.api_key ?? undefined,
    modelName: apiConfigRow.model_name,
    enabled: apiConfigRow.enabled === 1,
    createdAt: apiConfigRow.created_at,
    updatedAt: apiConfigRow.updated_at
  };
}
