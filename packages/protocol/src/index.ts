export const SCHEMAS = {
  projectState: "game-harness.project-state.v1",
  evidence: "game-harness.evidence.v1",
  improvement: "game-harness.improvement.v1",
  agentModel: "game-harness.agent-model.v1",
  technologyTrend: "game-harness.technology-trend.v1",
  evaluatorPacket: "game-harness.evaluator-packet.v1",
  workItemProjection: "game-harness.work-item-projection.v1",
  requirementSet: "game-harness.requirement-set.v1",
  claimInventory: "game-harness.claim-inventory.v1",
  contextPacket: "game-harness.context-packet.v1",
  evaluationAssignment: "game-harness.evaluation-assignment.v1",
  evaluationResult: "game-harness.evaluation-result.v1",
  decisionRequest: "game-harness.decision-request.v1",
  decisionRecord: "game-harness.decision-record.v1",
  executionIntent: "game-harness.execution-intent.v1",
  runEnvelope: "game-harness.run-envelope.v1",
  runAttempt: "game-harness.run-attempt.v1",
  mutationLease: "game-harness.mutation-lease.v1",
  installLedger: "game-harness.install-ledger.v1",
  moduleManifest: "game-harness.module-manifest.v1",
  disciplinePack: "game-harness.discipline-pack.v1"
} as const;

export type SchemaName = keyof typeof SCHEMAS;
export type VerificationStatus = "PASS" | "FAIL" | "PARTIAL" | "BLOCKED" | "NOT_RUN";
export type HarnessStatus = VerificationStatus;
export type RunLifecycleStatus = "PLANNED" | "RUNNING" | "WAITING_DECISION" | "COMPLETED" | "FAILED" | "CANCELLED";
export type DecisionStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type EvidenceKind = "build" | "test" | "runtime" | "static" | "doc" | "manual";
export type EvidenceAxis = "source" | "build" | "focused-test" | "editor" | "runtime" | "human";
export type EvaluationIndependence = "E0" | "E1" | "E2";

export interface ArtifactRef {
  path: string;
  description: string;
  sha256?: string;
}

export interface EvidenceRecord {
  schema: typeof SCHEMAS.evidence;
  created_at: string;
  project_root: string;
  kind: EvidenceKind;
  command: string | null;
  status: VerificationStatus;
  summary: string;
  artifacts: ArtifactRef[];
  claims_supported: string[];
  limitations: string[];
  producer?: string;
  project_fingerprint?: string;
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

export interface EvaluationGateSummary {
  status: "NOT_RUN" | "BLOCKED";
  assignment_supplied: boolean;
  result_supplied: boolean;
  missing: string[];
}

export interface EvaluatorPacket {
  schema: typeof SCHEMAS.evaluatorPacket;
  created_at: string;
  project_root: string;
  snapshot: ProjectStateSnapshot;
  evidence_records: LocatedEvidenceRecord[];
  improvement_proposals: LocatedImprovementProposal[];
  pass_criteria_mapping: Record<string, "PASS" | "PARTIAL" | "BLOCKED">;
  evaluation_gate: EvaluationGateSummary;
  limitations: string[];
}

export interface BaselineComparison {
  before: string[];
  after: string[];
  added: string[];
  removed: string[];
  unchanged: boolean;
}

export interface RequirementEntry {
  id: string;
  statement: string;
  disposition: "required" | "optional" | "out-of-scope";
  source: string;
  source_hash: string;
  acceptance_owner: string;
}

export interface RequirementSet {
  schema: typeof SCHEMAS.requirementSet;
  created_at: string;
  set_id: string;
  version: number;
  requirements: RequirementEntry[];
  limitations: string[];
}

export interface ClaimDefinition {
  id: string;
  requirement_ids: string[];
  statement: string;
  required_evidence_axes: EvidenceAxis[];
}

export interface ClaimInventory {
  schema: typeof SCHEMAS.claimInventory;
  created_at: string;
  requirement_set_id: string;
  requirement_set_version: number;
  denominator_hash: string;
  claims: ClaimDefinition[];
  limitations: string[];
}

export interface EvaluationAssignment {
  schema: typeof SCHEMAS.evaluationAssignment;
  created_at: string;
  assignment_id: string;
  evaluator: string;
  independence: EvaluationIndependence;
  relationship: string;
  packet_hash: string;
  claim_inventory_hash: string;
  read_only: true;
  allowed_tools: string[];
}

export interface EvaluationResult {
  schema: typeof SCHEMAS.evaluationResult;
  created_at: string;
  assignment_id: string;
  evaluator: string;
  independence: EvaluationIndependence;
  packet_hash: string;
  claim_inventory_hash: string;
  status: VerificationStatus;
  findings: string[];
  evidence_refs: string[];
  limitations: string[];
}

export interface ExecutionIntent {
  schema: typeof SCHEMAS.executionIntent;
  created_at: string;
  intent_id: string;
  operation: string;
  target: string;
  payload_digest: string;
  write_set_digest: string;
  state_hash: string;
  plan_hash: string;
  idempotency_key: string;
  permissions: string[];
  cost_ceiling: number;
  expires_at: string;
}

export interface DecisionRecord {
  schema: typeof SCHEMAS.decisionRecord;
  created_at: string;
  decision_id: string;
  decision_type: "execution" | "requirement-scope-change";
  status: DecisionStatus;
  owner: string;
  rationale: string;
  bound_hash: string;
  expires_at: string;
}

export interface RunAttempt {
  schema: typeof SCHEMAS.runAttempt;
  created_at: string;
  run_id: string;
  intent_hash: string;
  attempt: number;
  state: "PREPARED" | "COMMITTED" | "ROLLED_BACK" | "UNKNOWN";
  idempotency_key: string;
  fencing_token: number | null;
  remote_receipt: string | null;
  recovery_action: string | null;
}

export interface MutationLease {
  schema: typeof SCHEMAS.mutationLease;
  created_at: string;
  lease_id: string;
  scope: string[];
  owner: string;
  run_id: string;
  fencing_token: number;
  acquired_at: string;
  expires_at: string;
}

export {
  assertArtifact,
  loadSchema,
  validateArtifact,
  type ValidationIssue,
  type ValidationResult
} from "./validate.js";
export {
  createClaimDenominatorHash,
  hashRequirementChange,
  validateClaimCompleteness,
  validateDenominatorChange
} from "./completeness.js";
export {
  hashExecutionIntent,
  isDecisionBoundToIntent,
  validateEvaluationResult
} from "./integrity.js";
export { redactArtifactForExport, redactForExport } from "./redaction.js";
