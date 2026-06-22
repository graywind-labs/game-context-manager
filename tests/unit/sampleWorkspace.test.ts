import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

interface ManifestNodeEntry {
  path: string;
  images?: string[];
}

interface ManifestImageEntry {
  path: string;
  linked_nodes: string[];
}

interface SampleManifest {
  game: ManifestNodeEntry & {
    node_id: string;
    index: string;
  };
  modules: Record<string, ManifestNodeEntry>;
  contents: Record<string, ManifestNodeEntry & { module_id: string }>;
  images: Record<string, ManifestImageEntry>;
}

interface MarkdownNode {
  frontmatter: Record<string, unknown>;
  body: string;
}

const sampleRoot = join(process.cwd(), 'examples', 'sample-workspace');
const contextRoot = join(sampleRoot, 'game-context');
const manifestPath = join(contextRoot, 'manifest.yml');

assert.equal(existsSync(manifestPath), true);

const sampleReadme = readFileSync(join(sampleRoot, 'README.md'), 'utf8');
assert.match(sampleReadme, /Codex/);
assert.match(sampleReadme, /Claude Code/);
assert.match(sampleReadme, /manifest\.yml/);
assert.match(sampleReadme, /Manual Readability Check/);

for (const staticFile of ['AGENTS.md', 'CLAUDE.md', 'USAGE.md', 'README.md']) {
  assert.equal(existsSync(join(contextRoot, staticFile)), true);
}

const manifest = parse(readFileSync(manifestPath, 'utf8')) as SampleManifest;
assert.equal(manifest.game.node_id, 'starfall_workshop');
assert.equal(Object.keys(manifest.modules).length, 2);
assert.equal(Object.keys(manifest.contents).length, 2);
assert.equal(Object.keys(manifest.images).length, 2);

const gameNode = readMarkdownNode(join(contextRoot, manifest.game.path));
assert.equal(gameNode.frontmatter.node_type, 'game');
assert.equal(gameNode.frontmatter.node_id, manifest.game.node_id);
assert.match(gameNode.body, /# 星坠工坊/);

assert.equal(existsSync(join(contextRoot, manifest.game.index)), true);
const indexMarkdown = readFileSync(join(contextRoot, manifest.game.index), 'utf8');
assert.match(indexMarkdown, /modules\/core_loop\.md/);
assert.match(indexMarkdown, /modules\/upgrade_shop\.md/);
assert.match(indexMarkdown, /contents\/day1_lobby_first_loop\.md/);
assert.match(indexMarkdown, /contents\/day2_upgrade_pressure\.md/);
assert.match(indexMarkdown, /assets\/images\/img_lobby_overview__lobby-overview\.svg/);
assert.match(indexMarkdown, /assets\/images\/img_upgrade_result__upgrade-result\.svg/);

for (const [moduleId, moduleEntry] of Object.entries(manifest.modules)) {
  const moduleNode = readMarkdownNode(join(contextRoot, moduleEntry.path));
  assert.equal(moduleNode.frontmatter.node_type, 'module');
  assert.equal(moduleNode.frontmatter.node_id, moduleId);
  assert.deepEqual(moduleNode.frontmatter.images, moduleEntry.images);
}

for (const [contentId, contentEntry] of Object.entries(manifest.contents)) {
  const contentNode = readMarkdownNode(join(contextRoot, contentEntry.path));
  assert.equal(contentNode.frontmatter.node_type, 'content');
  assert.equal(contentNode.frontmatter.node_id, contentId);
  assert.equal(contentNode.frontmatter.module_id, contentEntry.module_id);
  assert.deepEqual(contentNode.frontmatter.images, contentEntry.images);

  for (const imageReference of collectImageReferences(contentNode.body)) {
    assert.ok(contentEntry.images?.includes(imageReference), `${contentId} references unlinked image ${imageReference}`);
    assert.ok(
      manifest.images[imageReference].linked_nodes.includes(`content:${contentId}`),
      `${imageReference} is missing content:${contentId} in manifest linked_nodes`
    );
  }
}

for (const [imageId, imageEntry] of Object.entries(manifest.images)) {
  assert.equal(existsSync(join(contextRoot, imageEntry.path)), true, `${imageId} path is missing`);
  assert.ok(imageEntry.linked_nodes.length > 0, `${imageId} should list linked nodes`);
}

const imageCatalog = parse(
  readFileSync(join(contextRoot, 'games', 'starfall_workshop', 'image_catalog.yml'), 'utf8')
) as { images: Record<string, ManifestImageEntry> };
assert.deepEqual(Object.keys(imageCatalog.images).sort(), Object.keys(manifest.images).sort());

function readMarkdownNode(filePath: string): MarkdownNode {
  assert.equal(existsSync(filePath), true, `${filePath} is missing`);
  const markdown = readFileSync(filePath, 'utf8');
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  assert.ok(match, `${filePath} is missing YAML frontmatter`);

  const frontmatter = parse(match[1]) as Record<string, unknown>;

  return {
    frontmatter,
    body: markdown.slice(match[0].length)
  };
}

function collectImageReferences(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(/@([a-zA-Z0-9_-]+)/g)].map((match) => match[1]))];
}
