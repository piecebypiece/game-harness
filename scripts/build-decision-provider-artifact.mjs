#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const leaf = join(root, 'packages', 'decision-provider');
const args = process.argv.slice(2);
if (args.length !== 1 || !args[0] || args[0].startsWith('--')) throw new Error('Usage: npm run artifact:decision-provider -- <new-output-directory>');
const out = resolve(args[0]);
const npmCli = process.env.npm_execpath;
if (!npmCli || !existsSync(npmCli)) throw new Error('Run through npm run to use the active npm CLI.');
function run(bin, argv, cwd = root) {
  const result = spawnSync(bin, argv, { cwd, encoding: 'utf8', shell: false });
  if (result.error || result.status !== 0) throw new Error(`Artifact command failed: ${basename(bin)} (exit ${result.status ?? 'unavailable'}).`);
  return result.stdout.trim();
}
const sourceCommit = run('git', ['rev-parse', 'HEAD']);
if (run('git', ['status', '--porcelain', '--untracked-files=all'])) throw new Error('Release requires a clean source checkout.');
const metadata = JSON.parse(readFileSync(join(leaf, 'package.json'), 'utf8'));
if (metadata.name !== '@game-harness/decision-provider' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(metadata.version)) throw new Error('Unexpected provider package identity.');
mkdirSync(out, { recursive: true });
const artifact = `game-harness-decision-provider-${metadata.version}.tgz`;
const artifactPath = join(out, artifact);
const manifestPath = join(out, `game-harness-decision-provider-${metadata.version}.manifest.json`);
function entryExists(path) {
  try { lstatSync(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
if ([artifactPath, `${artifactPath}.sha256`, manifestPath].some(entryExists)) throw new Error('Immutable artifact output already exists.');
if (lstatSync(out).isSymbolicLink()) throw new Error('Artifact directory must not be a symlink.');
// npm writes with replacement semantics. Pack privately, then publish each final file
// with exclusive creation so even a late or dangling destination link cannot be followed.
const packDirectory = mkdtempSync(join(out, '.provider-pack-'));
let packed;
let bytes;
try {
  packed = JSON.parse(run(process.execPath, [npmCli, 'pack', '.', '--json', '--ignore-scripts', '--workspaces=false', '--pack-destination', packDirectory], leaf));
  if (packed.length !== 1 || packed[0].filename !== artifact) throw new Error('Unexpected npm pack result.');
  bytes = readFileSync(join(packDirectory, artifact));
} finally {
  const temporaryArtifact = join(packDirectory, artifact);
  if (entryExists(temporaryArtifact)) unlinkSync(temporaryArtifact);
  rmdirSync(packDirectory);
}
const sha256 = createHash('sha256').update(bytes).digest('hex');
const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
if (packed[0].integrity !== integrity) throw new Error('npm integrity does not match artifact bytes.');
const manifest = { schemaVersion: 1, package: metadata.name, version: metadata.version, sourceCommit, dirty: false, node: process.version, npm: run(process.execPath, [npmCli, '--version']), artifact, sha256, npmIntegrity: integrity, entryCount: packed[0].files.length };
writeFileSync(artifactPath, bytes, { flag: 'wx' });
writeFileSync(`${artifactPath}.sha256`, `${sha256}  ${artifact}\n`, { flag: 'wx' });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
