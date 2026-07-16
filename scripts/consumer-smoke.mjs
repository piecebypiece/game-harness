import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const temp = await mkdtemp(path.join(os.tmpdir(), "game-harness-consumer-"));
let tarball;

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

try {
  const packReport = JSON.parse(run("npm", ["pack", "--silent", "--json"]));
  tarball = path.join(root, packReport[0].filename);
  run("npm", ["init", "--yes"], temp);
  run("npm", ["install", tarball, "--ignore-scripts", "--no-audit", "--no-fund"], temp);

  const installedRoot = path.join(temp, "node_modules", "@game-harness", "core");
  const api = await import(pathToFileURL(path.join(installedRoot, "dist", "index.js")).href);
  const protocol = await import(pathToFileURL(path.join(installedRoot, "packages", "protocol", "dist", "index.js")).href);
  assert.equal(protocol.SCHEMAS.requirementSet, "game-harness.requirement-set.v1");
  assert.equal(api.SCHEMAS.executionIntent, "game-harness.execution-intent.v1");

  const snapshot = await api.detectProjectState({ project: path.join(root, "fixtures", "generic-project") });
  assert.equal(snapshot.schema, protocol.SCHEMAS.projectState);
  assert.equal(protocol.validateArtifact("projectState", snapshot).valid, true);

  const executable = process.platform === "win32" ? "game-harness.cmd" : "game-harness";
  const help = run(path.join(temp, "node_modules", ".bin", executable), ["help"], temp);
  assert.match(help, /game-harness detect/);

  const installedPackage = JSON.parse(await readFile(path.join(installedRoot, "package.json"), "utf8"));
  assert.equal(installedPackage.version, "0.2.0");
  console.log(JSON.stringify({ status: "PASS", installed_version: installedPackage.version, temp_consumer: true }, null, 2));
} finally {
  if (tarball) await rm(tarball, { force: true });
  await rm(temp, { recursive: true, force: true });
}
