import { detectProjectState } from "./project-state.js";

export interface RenderStatusOptions {
  project: string;
  profile?: string;
}

export async function renderStatus(options: RenderStatusOptions): Promise<string> {
  const snapshot = await detectProjectState(options);
  const presentSot = snapshot.sot_files.filter((file) => file.exists).map((file) => file.path);
  const presentHarness = snapshot.harness_surfaces.filter((file) => file.exists).map((file) => file.path);

  return [
    "# Game Harness Status",
    "",
    `Project: ${snapshot.project_root}`,
    `Profile: ${snapshot.profile}`,
    `Git: ${snapshot.git_state.is_repo ? snapshot.git_state.branch ?? "repo" : "not a repo"}`,
    `Dirty: ${snapshot.git_state.dirty ? "yes" : "no"}`,
    `Engine: ${snapshot.engine_state.kind}${snapshot.engine_state.version ? ` ${snapshot.engine_state.version}` : ""}`,
    `SoT files: ${presentSot.length > 0 ? presentSot.join(", ") : "none"}`,
    `Harness surfaces: ${presentHarness.length > 0 ? presentHarness.join(", ") : "none"}`,
    `Known blockers: ${snapshot.known_blockers.length > 0 ? snapshot.known_blockers.join("; ") : "none"}`
  ].join("\n");
}

