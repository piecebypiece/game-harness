import { spawnSync } from "node:child_process";
import path from "node:path";
import { DEFAULT_DO_NOT_TOUCH, resolveProjectPath } from "./paths.js";
import { exists, readTextIfExists } from "./fs-utils.js";
import { SCHEMAS, type EngineState, type FilePresence, type GitState, type ProjectStateSnapshot } from "../types.js";

const SOT_CANDIDATES = [
  "AGENTS.md",
  "README.md",
  "Docs/WORK_TRACKER.md",
  "Docs/CODEX_RESUME.md",
  "HARNESS_GUIDE.md"
];

const HARNESS_SURFACES = [
  ".game-harness",
  "artifacts/game-harness",
  ".agents",
  ".pipeline",
  ".cw",
  ".codex",
  ".claude",
  ".openhands"
];

export interface DetectOptions {
  project: string;
  profile?: string;
}

export async function detectProjectState(options: DetectOptions): Promise<ProjectStateSnapshot> {
  const projectRoot = resolveProjectPath(options.project);
  const sotFiles = await presenceList(projectRoot, SOT_CANDIDATES);
  const harnessSurfaces = await presenceList(projectRoot, HARNESS_SURFACES);
  const engineState = await detectEngineState(projectRoot);
  const gitState = detectGitState(projectRoot);
  const knownBlockers = await detectKnownBlockers(projectRoot, sotFiles);

  return {
    schema: SCHEMAS.projectState,
    created_at: new Date().toISOString(),
    project_root: projectRoot,
    profile: options.profile ?? "generic",
    sot_files: sotFiles,
    git_state: gitState,
    engine_state: engineState,
    harness_surfaces: harnessSurfaces,
    known_blockers: knownBlockers,
    do_not_touch: DEFAULT_DO_NOT_TOUCH
  };
}

async function presenceList(projectRoot: string, entries: string[]): Promise<FilePresence[]> {
  return Promise.all(
    entries.map(async (entry) => ({
      path: entry,
      exists: await exists(path.join(projectRoot, entry))
    }))
  );
}

function detectGitState(projectRoot: string): GitState {
  const result = spawnSync("git", ["-C", projectRoot, "status", "--short", "--branch"], {
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0) {
    return {
      is_repo: false,
      branch: null,
      short_status: [],
      dirty: false,
      ahead_behind: null
    };
  }

  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  const branchLine = lines[0] ?? "";
  const statusLines = lines.slice(1);
  const branch = branchLine.startsWith("## ") ? branchLine.slice(3) : null;
  const aheadBehindMatch = branch?.match(/\[(.+)\]$/);

  return {
    is_repo: true,
    branch,
    short_status: statusLines,
    dirty: statusLines.length > 0,
    ahead_behind: aheadBehindMatch?.[1] ?? null
  };
}

async function detectEngineState(projectRoot: string): Promise<EngineState> {
  const unityVersionPath = path.join(projectRoot, "ProjectSettings", "ProjectVersion.txt");
  const unityVersionText = await readTextIfExists(unityVersionPath);
  const packageFiles = await presenceList(projectRoot, [
    "Packages/manifest.json",
    "Packages/packages-lock.json",
    "project.godot",
    ".uproject"
  ]);

  if (unityVersionText !== null) {
    const versionMatch = unityVersionText.match(/m_EditorVersion:\s*(.+)/);
    return {
      kind: "unity",
      version: versionMatch?.[1]?.trim() ?? null,
      package_files: packageFiles
    };
  }

  if (await exists(path.join(projectRoot, "project.godot"))) {
    return {
      kind: "godot",
      version: null,
      package_files: packageFiles
    };
  }

  return {
    kind: "unknown",
    version: null,
    package_files: packageFiles
  };
}

async function detectKnownBlockers(projectRoot: string, sotFiles: FilePresence[]): Promise<string[]> {
  const blockers: string[] = [];
  for (const file of sotFiles.filter((entry) => entry.exists)) {
    const text = await readTextIfExists(path.join(projectRoot, file.path));
    if (!text) {
      continue;
    }
    const matches = text.match(/\b(BLOCKED|PARTIAL|FAIL|NO-GO|No-Go)\b/g);
    if (matches) {
      blockers.push(`${file.path}: ${[...new Set(matches)].join(", ")}`);
    }
  }
  return blockers;
}

