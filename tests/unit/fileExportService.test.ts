import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
  deleteContentNodeFiles,
  deleteGameNodeFiles,
  deleteImageAssetFiles,
  deleteModuleNodeFiles,
  exportAgentInstructionFiles,
  exportContentNodeFiles,
  exportDirectoryIndexFiles,
  exportGameNodeFiles,
  exportModuleNodeFiles
} from '../../src/main/services/fileExportService.js';
import { createWorkspaceStructure } from '../../src/main/services/workspaceService.js';
import {
  NodeType,
  ProjectStage,
  type ContentNode,
  type GameNode,
  type ImageAsset,
  type LocalUser,
  type ModuleNode,
  type NodeImageLink,
  type WorkspaceConfig
} from '../../src/shared/index.js';

const tempDir = mkdtempSync(join(tmpdir(), 'gcm-export-'));

try {
  const workspaceSummary = createWorkspaceStructure({
    selectedDirectory: tempDir,
    now: new Date('2026-06-18T12:00:00.000Z')
  });
  const workspace: WorkspaceConfig = {
    id: workspaceSummary.id,
    rootPath: workspaceSummary.rootPath,
    contextPath: workspaceSummary.contextPath,
    markerPath: workspaceSummary.markerPath,
    activeGameFolderName: '使命防线游戏上下文',
    schemaVersion: workspaceSummary.schemaVersion,
    createdAt: workspaceSummary.createdAt,
    updatedAt: workspaceSummary.updatedAt
  };
  const users: LocalUser[] = [
    {
      id: 'user_a',
      displayName: '策划 A',
      createdAt: '2026-06-18T12:00:00.000Z',
      lastLoginAt: '2026-06-18T12:00:00.000Z'
    },
    {
      id: 'user_b',
      displayName: 'Designer B',
      createdAt: '2026-06-18T12:00:00.000Z',
      lastLoginAt: '2026-06-18T12:00:00.000Z'
    }
  ];
  const game: GameNode = {
    nodeType: NodeType.Game,
    id: 'mission_frontline',
    gameName: '使命防线',
    gameVersion: 'v0.3.2',
    projectStage: ProjectStage.Testing,
    gameGenre: '开箱like + 战车养成',
    coreGameplay: '开箱获得战车部件，组装并推进关卡。',
    creatorId: 'user_a',
    lastEditorId: 'user_b',
    createdAt: '2026-06-18T12:00:00.000Z',
    updatedAt: '2026-06-18T12:30:00.000Z'
  };
  const image: ImageAsset = {
    id: 'image_001',
    displayName: '主界面截图',
    originalFileName: '乱码文件名###.png',
    relativePath: '使命防线游戏上下文/assets/images/image_001__main-screen.png',
    fileType: 'png',
    gameId: game.id,
    uploaderId: 'user_a',
    updatedAt: '2026-06-18T12:40:00.000Z',
    notes: '用于验证图片元数据。'
  };
  const module: ModuleNode = {
    nodeType: NodeType.Module,
    id: 'module_001',
    gameId: game.id,
    gameVersion: game.gameVersion,
    moduleName: '生产线/开箱',
    modulePositioning: '负责核心开箱循环。',
    systemRules: '玩家消耗钥匙获得战车部件。',
    resourceFlow: '钥匙消耗，部件产出。',
    imageIds: [image.id],
    playerMainActions: '点击开箱并查看结果。',
    subjectiveFun: '短反馈明确。',
    subjectiveProblems: '结果页信息密度偏高。',
    subjectiveOptimizationDirections: '突出稀有结果。',
    creatorId: 'user_a',
    lastEditorId: 'user_b',
    createdAt: '2026-06-18T12:10:00.000Z',
    updatedAt: '2026-06-18T12:45:00.000Z'
  };
  const content: ContentNode = {
    nodeType: NodeType.Content,
    id: 'content_001',
    gameId: game.id,
    gameVersion: game.gameVersion,
    moduleId: module.id,
    title: '第一天首次进入生产线',
    imageIds: [image.id],
    accountDay: '1',
    cumulativePaymentAmount: '0',
    maxMainlineProgress: '1-3',
    characterLevel: '5',
    processDescription: `玩家在主界面看到 @${image.id} 后进入生产线。`,
    subjectiveFun: '首次反馈明确。',
    subjectiveKnownProblems: '缺少结果解释。',
    subjectiveOptimizationDirections: '补充稀有度说明。',
    creatorId: 'user_a',
    lastEditorId: 'user_b',
    createdAt: '2026-06-18T12:20:00.000Z',
    updatedAt: '2026-06-18T12:50:00.000Z'
  };
  const imageLinks: NodeImageLink[] = [
    {
      nodeType: NodeType.Module,
      nodeId: module.id,
      imageId: image.id
    },
    {
      nodeType: NodeType.Content,
      nodeId: content.id,
      imageId: image.id
    }
  ];

  const gameMarkdown = exportGameNodeFiles({
    workspace,
    game,
    users,
    now: new Date('2026-06-18T12:31:00.000Z')
  });

  const gameDirectory = join(tempDir, '使命防线游戏上下文');
  assert.equal(existsSync(join(gameDirectory, 'game.md')), true);
  assert.equal(existsSync(join(gameDirectory, 'modules')), true);
  assert.equal(existsSync(join(gameDirectory, 'assets', 'images')), true);
  assert.equal(existsSync(join(gameDirectory, 'INDEX.md')), false);
  assert.equal(existsSync(join(gameDirectory, 'image_catalog.yml')), false);
  assert.equal(existsSync(join(tempDir, 'manifest.yml')), false);
  assert.equal(existsSync(join(tempDir, 'AGENTS.md')), false);
  assert.equal(existsSync(join(tempDir, 'CLAUDE.md')), false);
  assert.match(gameMarkdown, /node_type: game/);
  assert.match(gameMarkdown, /creator: 策划 A/);
  assert.match(gameMarkdown, /## 当前主要问题\n\n/);
  assert.doesNotMatch(gameMarkdown, /## 补充说明/);

  const moduleMarkdown = exportModuleNodeFiles({
    workspace,
    game,
    module,
    modules: [module],
    users,
    images: [image],
    imageLinks,
    now: new Date('2026-06-18T12:46:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'modules', module.id, 'module.md')), true);
  assert.match(moduleMarkdown, /node_type: module/);
  assert.match(moduleMarkdown, /images:\n  - image_001/);
  assert.equal(existsSync(join(gameDirectory, 'INDEX.md')), false);

  const contentMarkdown = exportContentNodeFiles({
    workspace,
    game,
    content,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks,
    now: new Date('2026-06-18T12:51:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'modules', module.id, 'contents', `${content.id}.md`)), true);
  assert.match(contentMarkdown, /node_type: content/);
  assert.match(contentMarkdown, /玩家在主界面看到 @image_001 后进入生产线。/);
  assert.equal(existsSync(join(tempDir, 'manifest.yml')), false);

  const agentPaths = exportAgentInstructionFiles({ workspace, language: 'zh' });
  assert.deepEqual(agentPaths.sort(), [join(tempDir, 'AGENTS.md'), join(tempDir, 'CLAUDE.md')].sort());
  assert.match(readFileSync(join(tempDir, 'AGENTS.md'), 'utf8'), /manifest\.yml/);
  assert.match(readFileSync(join(tempDir, 'AGENTS.md'), 'utf8'), /上下文选择规则/);
  assert.match(readFileSync(join(tempDir, 'AGENTS.md'), 'utf8'), /游戏运营、测试、客服、评测/);
  assert.match(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8'), /image_catalog\.yml/);
  assert.match(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8'), /WorkBuddy/);
  assert.match(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8'), /上下文选择规则/);
  assert.match(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8'), /常见任务处理方式/);
  assert.match(readFileSync(join(tempDir, 'CLAUDE.md'), 'utf8'), /## 边界/);

  const indexPaths = exportDirectoryIndexFiles({
    workspace,
    game,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks,
    language: 'zh',
    now: new Date('2026-06-18T13:00:00.000Z')
  });

  assert.deepEqual(indexPaths.sort(), [
    join(tempDir, 'manifest.yml'),
    join(gameDirectory, 'INDEX.md'),
    join(gameDirectory, 'image_catalog.yml')
  ].sort());
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /modules\/module_001\/module.md/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /modules\/module_001\/contents\/content_001.md/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /本文件由游戏上下文管理器自动生成。/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /## 模块/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /## 结构化字段地图/);
  assert.match(readFileSync(join(gameDirectory, 'INDEX.md'), 'utf8'), /`cumulativePaymentAmount`/);

  const imageCatalog = parse(readFileSync(join(gameDirectory, 'image_catalog.yml'), 'utf8')) as {
    language: string;
    description: string;
    images: Record<
      string,
      {
        name: string;
        original_file_name: string;
        path: string;
        linked_nodes: string[];
        linked_node_files: Array<{ node_type: string; node_id: string; name: string; path: string }>;
      }
    >;
  };

  assert.equal(imageCatalog.language, 'zh');
  assert.match(imageCatalog.description, /图片目录/);
  assert.equal(imageCatalog.images[image.id].name, image.displayName);
  assert.equal(imageCatalog.images[image.id].original_file_name, '乱码文件名###.png');
  assert.equal(imageCatalog.images[image.id].path, image.relativePath);
  assert.deepEqual(imageCatalog.images[image.id].linked_nodes, ['module:module_001', 'content:content_001']);
  assert.deepEqual(imageCatalog.images[image.id].linked_node_files.map((entry) => entry.path), [
    '使命防线游戏上下文/modules/module_001/module.md',
    '使命防线游戏上下文/modules/module_001/contents/content_001.md'
  ]);

  const manifest = parse(readFileSync(join(tempDir, 'manifest.yml'), 'utf8')) as {
    workspace: { generated_at: string; language: string; agents: string; claude: string; description: string };
    game: { node_id: string; name: string; version: string; path: string; index: string; image_catalog: string; project_stage_label: string };
    modules: Record<string, { name: string; path: string; images: string[] }>;
    contents: Record<string, { title: string; module_id: string; path: string; images: string[] }>;
    images: Record<string, { name: string; path: string; linked_nodes: string[]; linked_node_files: Array<{ path: string }> }>;
    field_schema: Record<string, Array<{ field: string; label: string; location: string; use_for: string }>>;
    task_context_entries: { start_here: string; image_catalog: string };
  };

  assert.equal(manifest.workspace.generated_at, '2026-06-18T13:00:00.000Z');
  assert.equal(manifest.workspace.language, 'zh');
  assert.equal(manifest.workspace.agents, 'AGENTS.md');
  assert.equal(manifest.workspace.claude, 'CLAUDE.md');
  assert.match(manifest.workspace.description, /机器可读目录/);
  assert.equal(manifest.game.node_id, game.id);
  assert.equal(manifest.game.project_stage_label, '测试');
  assert.equal(manifest.game.path, '使命防线游戏上下文/game.md');
  assert.equal(manifest.game.index, '使命防线游戏上下文/INDEX.md');
  assert.equal(manifest.game.image_catalog, '使命防线游戏上下文/image_catalog.yml');
  assert.equal(manifest.modules[module.id].path, '使命防线游戏上下文/modules/module_001/module.md');
  assert.equal(manifest.contents[content.id].path, '使命防线游戏上下文/modules/module_001/contents/content_001.md');
  assert.deepEqual(manifest.images[image.id].linked_nodes, ['module:module_001', 'content:content_001']);
  assert.deepEqual(manifest.images[image.id].linked_node_files.map((entry) => entry.path), [
    '使命防线游戏上下文/modules/module_001/module.md',
    '使命防线游戏上下文/modules/module_001/contents/content_001.md'
  ]);
  assert.equal(manifest.field_schema.game.some((field) => field.field === 'coreGameplay'), true);
  assert.equal(manifest.field_schema.content.some((field) => field.field === 'cumulativePaymentAmount'), true);
  assert.equal(manifest.task_context_entries.start_here, 'AGENTS.md');
  assert.equal(manifest.task_context_entries.image_catalog, '使命防线游戏上下文/image_catalog.yml');

  deleteContentNodeFiles({
    workspace,
    game,
    contentId: content.id,
    moduleId: module.id,
    modules: [module],
    contents: [],
    users,
    images: [image],
    imageLinks: [imageLinks[0]],
    now: new Date('2026-06-18T13:10:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'modules', module.id, 'contents', `${content.id}.md`)), false);
  const staleManifestAfterContentDelete = readFileSync(join(tempDir, 'manifest.yml'), 'utf8');
  assert.match(staleManifestAfterContentDelete, /content_001/);

  exportContentNodeFiles({
    workspace,
    game,
    content,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks,
    now: new Date('2026-06-18T13:15:00.000Z')
  });
  deleteModuleNodeFiles({
    workspace,
    game,
    moduleId: module.id,
    contentIds: [content.id],
    modules: [],
    contents: [],
    users,
    images: [image],
    imageLinks: [],
    now: new Date('2026-06-18T13:20:00.000Z')
  });

  assert.equal(existsSync(join(gameDirectory, 'modules', module.id, 'module.md')), false);
  assert.equal(existsSync(join(gameDirectory, 'modules', module.id, 'contents', `${content.id}.md`)), false);
  assert.equal(existsSync(join(gameDirectory, 'modules', module.id)), false);
  assert.match(readFileSync(join(tempDir, 'manifest.yml'), 'utf8'), /module_001/);

  exportModuleNodeFiles({
    workspace,
    game,
    module,
    modules: [module],
    users,
    images: [image],
    imageLinks
  });
  exportContentNodeFiles({
    workspace,
    game,
    content,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks
  });

  const imagePath = join(workspace.contextPath, image.relativePath);
  writeFileSync(imagePath, 'fake image');
  deleteImageAssetFiles({
    workspace,
    game: { ...game, coverImageId: undefined },
    deletedImage: image,
    modules: [{ ...module, imageIds: [] }],
    contents: [{ ...content, imageIds: [], processDescription: '玩家在主界面看到后进入生产线。' }],
    users,
    images: [],
    imageLinks: [],
    now: new Date('2026-06-18T13:25:00.000Z')
  });

  assert.equal(existsSync(imagePath), false);
  assert.doesNotMatch(
    readFileSync(join(gameDirectory, 'modules', module.id, 'contents', `${content.id}.md`), 'utf8'),
    /@image_001/
  );
  assert.match(readFileSync(join(gameDirectory, 'image_catalog.yml'), 'utf8'), /image_001/);

  exportGameNodeFiles({
    workspace,
    game,
    users,
    images: [image],
    modules: [module],
    contents: [content],
    imageLinks
  });
  exportModuleNodeFiles({
    workspace,
    game,
    module,
    modules: [module],
    users,
    images: [image],
    imageLinks
  });
  exportContentNodeFiles({
    workspace,
    game,
    content,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks
  });
  writeFileSync(imagePath, 'fake image after game delete');
  assert.equal(existsSync(workspace.markerPath ?? ''), true);
  deleteGameNodeFiles({
    workspace,
    game
  });
  assert.equal(existsSync(gameDirectory), false);
  assert.equal(existsSync(imagePath), false);
  assert.equal(existsSync(workspace.markerPath ?? ''), false);
  exportGameNodeFiles({
    workspace,
    game,
    users,
    images: [image],
    modules: [module],
    contents: [content],
    imageLinks
  });
  exportModuleNodeFiles({
    workspace,
    game,
    module,
    modules: [module],
    users,
    images: [image],
    imageLinks
  });
  exportContentNodeFiles({
    workspace,
    game,
    content,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks
  });
  exportDirectoryIndexFiles({
    workspace,
    game,
    modules: [module],
    contents: [content],
    users,
    images: [image],
    imageLinks,
    now: new Date('2026-06-18T13:30:00.000Z')
  });

  const generatedAgentFiles = [
    join(tempDir, 'AGENTS.md'),
    join(tempDir, 'CLAUDE.md'),
    join(tempDir, 'manifest.yml'),
    join(gameDirectory, 'INDEX.md'),
    join(gameDirectory, 'game.md'),
    join(gameDirectory, 'image_catalog.yml'),
    join(gameDirectory, 'modules', module.id, 'contents', `${content.id}.md`)
  ];

  for (const generatedFile of generatedAgentFiles) {
    assert.doesNotMatch(readFileSync(generatedFile, 'utf8'), /sk-local-secret/);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
