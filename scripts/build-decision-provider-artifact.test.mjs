import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const producer = fileURLToPath(new URL('./build-decision-provider-artifact.mjs', import.meta.url));
const npmCli = process.env.npm_execpath;
function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), 'decision-artifact-test-'));
  t.after(() => {
    if (dirname(realpathSync(temp)) !== realpathSync(tmpdir()) || lstatSync(temp).isSymbolicLink()) throw new Error('Unsafe fixture cleanup target.');
    rmSync(temp, { recursive: true, force: true });
  });
  const source = join(temp, 'source');
  const leaf = join(source, 'packages', 'decision-provider');
  mkdirSync(join(source, 'scripts'), { recursive: true });
  mkdirSync(leaf, { recursive: true });
  copyFileSync(producer, join(source, 'scripts', 'build-decision-provider-artifact.mjs'));
  writeFileSync(join(leaf, 'package.json'), JSON.stringify({ name: '@game-harness/decision-provider', version: '0.1.0', type: 'module', files: ['index.js'] }));
  writeFileSync(join(leaf, 'index.js'), 'export const fixture = true;\n');
  const git = args => {
    const result = spawnSync('git', args, { cwd: source, encoding: 'utf8', shell: false });
    assert.equal(result.status, 0, result.stderr);
  };
  git(['init', '-q']);
  git(['config', 'user.name', 'Artifact Fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['add', '--', 'scripts/build-decision-provider-artifact.mjs', 'packages/decision-provider']);
  git(['commit', '-q', '-m', 'artifact fixture']);
  const out = join(temp, 'out');
  mkdirSync(out);
  const run = () => spawnSync(process.execPath, [join(source, 'scripts', 'build-decision-provider-artifact.mjs'), out], {
    cwd: source, encoding: 'utf8', shell: false,
    env: { ...process.env, npm_execpath: npmCli, npm_config_cache: join(temp, 'npm-cache') },
  });
  return { temp, out, source, run };
}

test('clean source produces a fixed triple and existing bytes are never overwritten', t => {
  assert.ok(npmCli, 'Run this test through npm run.');
  const { out, run } = fixture(t);
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const manifest = JSON.parse(first.stdout);
  assert.equal(manifest.package, '@game-harness/decision-provider');
  assert.equal(manifest.dirty, false);
  assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/);
  const artifact = join(out, manifest.artifact);
  const before = readFileSync(artifact);
  assert.equal(run().status, 1);
  assert.deepEqual(readFileSync(artifact), before);
});

test('dangling destination link is rejected without writing to its external target', t => {
  assert.ok(npmCli, 'Run this test through npm run.');
  const { temp, out, run } = fixture(t);
  const target = join(temp, 'external-target.tgz');
  try { symlinkSync(target, join(out, 'game-harness-decision-provider-0.1.0.tgz'), 'file'); }
  catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Windows symlink privilege unavailable.'); return; }
    throw error;
  }
  const result = run();
  assert.equal(result.status, 1);
  assert.equal(existsSync(target), false);
});

test('dirty source cannot generate any release triple', t => {
  assert.ok(npmCli, 'Run this test through npm run.');
  const { out, source, run } = fixture(t);
  writeFileSync(join(source, 'uncommitted.txt'), 'dirty');
  assert.equal(run().status, 1);
  assert.equal(existsSync(join(out, 'game-harness-decision-provider-0.1.0.tgz')), false);
});
