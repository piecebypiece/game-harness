export const SCHEMAS = {
  projectState: "game-harness.project-state.v0",
  evidence: "game-harness.evidence.v0",
  improvement: "game-harness.improvement.v0",
  agentModel: "game-harness.agent-model.v0",
  technologyTrend: "game-harness.technology-trend.v0",
  evaluatorPacket: "game-harness.evaluator-packet.v0"
} as const;

export type HarnessStatus = "PASS" | "FAIL" | "PARTIAL" | "BLOCKED" | "NOT_RUN";

export type EvidenceKind = "build" | "test" | "runtime" | "static" | "doc" | "manual";

export interface ArtifactRef {
  path: string;
  description: string;
}

export interface EvidenceRecord {
  schema: typeof SCHEMAS.evidence;
  created_at: string;
  project_root: string;
  kind: EvidenceKind;
  command: string | null;
  status: HarnessStatus;
  summary: string;
  artifacts: ArtifactRef[];
  claims_supported: string[];
  limitations: string[];
}

export interface ProjectStateSnapshot {
  schema: typeof SCHEMAS.projectState;
  created_at: string;
  project_root: string;
  profile: string;
  sot_files: FilePresence[];
  git_state: GitState;
  engine_state: EngineState;
  harness_surfaces: FilePresence[];
  known_blockers: string[];
  do_not_touch: string[];
}

export interface FilePresence {
  path: string;
  exists: boolean;
}

export interface GitState {
  is_repo: boolean;
  branch: string | null;
  short_status: string[];
  dirty: boolean;
  ahead_behind: string | null;
}

export interface EngineState {
  kind: "unity" | "unreal" | "godot" | "unknown";
  version: string | null;
  package_files: FilePresence[];
}

export interface ImprovementProposal {
  schema: typeof SCHEMAS.improvement;
  created_at: string;
  source_evidence: string[];
  problem: string;
  proposal: string;
  target: "core" | "profile" | "docs" | "tests" | "fixtures";
  risk: "low" | "medium" | "high";
  acceptance: string[];
  requires_external_pass: true;
}

export interface AgentModelProfile {
  schema: typeof SCHEMAS.agentModel;
  created_at: string;
  agent_surface: string;
  model_family: string;
  context_budget: string;
  tools: string[];
  write_permission: "read-only" | "proposal-only" | "workspace-write" | "full";
  risk_notes: string[];
}

export interface TechnologyTrendSnapshot {
  schema: typeof SCHEMAS.technologyTrend;
  date: string;
  source: string;
  adopt: string[];
  trial: string[];
  hold: string[];
  remove: string[];
  impact: string[];
}

export interface LocatedEvidenceRecord {
  path: string;
  record: EvidenceRecord;
}

export interface LocatedImprovementProposal {
  path: string;
  proposal: ImprovementProposal;
}

export interface EvaluatorPacket {
  schema: typeof SCHEMAS.evaluatorPacket;
  created_at: string;
  project_root: string;
  snapshot: ProjectStateSnapshot;
  evidence_records: LocatedEvidenceRecord[];
  improvement_proposals: LocatedImprovementProposal[];
  pass_criteria_mapping: Record<string, "PASS" | "PARTIAL" | "BLOCKED">;
  limitations: string[];
}

export interface BaselineComparison {
  before: string[];
  after: string[];
  added: string[];
  removed: string[];
  unchanged: boolean;
}
