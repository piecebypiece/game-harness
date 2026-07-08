import path from "node:path";

export const DEFAULT_DO_NOT_TOUCH = [
  "AGENTS.md",
  "CLAUDE.md",
  ".codex/",
  ".claude/",
  ".openhands/",
  ".agents/",
  ".pipeline/",
  "Docs/WORK_TRACKER.md",
  "ProjectSettings/",
  "Packages/",
  "Assets/"
];

export function resolveProjectPath(projectPath: string): string {
  return path.resolve(projectPath);
}

export function harnessArtifactDir(projectRoot: string, area = ""): string {
  return path.join(projectRoot, "artifacts", "game-harness", area);
}

export function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

