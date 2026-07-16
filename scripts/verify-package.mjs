import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const requiredPublicFiles = [
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "SECURITY.md",
  "docs/architecture.md",
  "docs/design-origin.md",
  "docs/known-limitations.md",
  "docs/security-model.md",
  "docs/support-matrix.md"
];

async function collectTextFiles(directory, relative = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const nextRelative = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", "dist", "artifacts"].includes(entry.name)) continue;
      files.push(...await collectTextFiles(path.join(directory, entry.name), nextRelative));
      continue;
    }
    if (/\.(?:md|json|mjs|ts|ya?ml)$/i.test(entry.name)) files.push(nextRelative);
  }
  return files;
}

for (const file of requiredPublicFiles) {
  await readFile(path.join(root, file), "utf8");
}

const textFiles = await collectTextFiles(root);
const findings = [];
const absolutePathPattern = /(?:[A-Z]:\\(?:Users|Development|Projects?)\\|\/home\/[A-Za-z0-9._-]+\/)/g;
const secretPatterns = [
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g
];

for (const file of textFiles) {
  if (file === "scripts/verify-package.mjs") continue;
  const content = await readFile(path.join(root, file), "utf8");
  const isTestFixture = file.includes("/tests/") || file.startsWith("tests/");
  if (!isTestFixture) {
    for (const match of content.matchAll(absolutePathPattern)) findings.push(`${file}: local absolute path ${match[0]}`);
    for (const pattern of secretPatterns) {
      for (const match of content.matchAll(pattern)) findings.push(`${file}: credential-like text ${match[0].slice(0, 12)}...`);
    }
  }
}
assert.deepEqual(findings, [], `public-source hygiene findings:\n${findings.join("\n")}`);

const packed = spawnSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32"
});
assert.equal(packed.status, 0, packed.stderr || packed.stdout);
const report = JSON.parse(packed.stdout);
const packageFiles = new Set(report[0].files.map((entry) => entry.path));

for (const file of requiredPublicFiles) assert(packageFiles.has(file), `tarball is missing ${file}`);
assert(packageFiles.has("dist/index.js"), "tarball is missing the core runtime");
assert(packageFiles.has("packages/protocol/dist/index.js"), "tarball is missing the protocol runtime");
assert(packageFiles.has("packages/protocol/schemas/requirement-set.schema.json"), "tarball is missing protocol schemas");
assert(![...packageFiles].some((file) => file.startsWith("packages/protocol/src/")), "tarball contains protocol TypeScript sources");
assert(![...packageFiles].some((file) => file.startsWith("artifacts/")), "tarball contains generated artifacts");

console.log(JSON.stringify({
  status: "PASS",
  checked_source_files: textFiles.length,
  tarball_files: packageFiles.size
}, null, 2));
