import { spawnSync } from "node:child_process";
import { resolveProjectPath } from "../../core/paths.js";
import type { BaselineComparison } from "../../types.js";

export function captureGitBaseline(project: string): string[] {
  const projectRoot = resolveProjectPath(project);
  const result = spawnSync("git", ["-C", projectRoot, "status", "--short", "--branch"], {
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(`Unable to capture git baseline for ${projectRoot}: ${result.stderr.trim()}`);
  }

  return normalizeLines(result.stdout);
}

export function compareBaselines(before: string[], after: string[]): BaselineComparison {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((line) => !beforeSet.has(line));
  const removed = before.filter((line) => !afterSet.has(line));

  return {
    before,
    after,
    added,
    removed,
    unchanged: added.length === 0 && removed.length === 0
  };
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

