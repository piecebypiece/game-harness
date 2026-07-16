import path from "node:path";
import { readEvidenceRecords } from "./artifacts.js";
import { harnessArtifactDir, resolveProjectPath, safeTimestamp } from "./paths.js";
import { writeJson } from "./fs-utils.js";
import { assertArtifact, SCHEMAS, type EvidenceRecord, type ImprovementProposal, type LocatedEvidenceRecord } from "../types.js";

const ACTIONABLE_STATUSES = new Set(["FAIL", "PARTIAL", "BLOCKED", "NOT_RUN"]);

export interface ProposeImprovementsOptions {
  project: string;
}

export interface ProposeImprovementsResult {
  proposals: ImprovementProposal[];
  paths: string[];
}

export async function proposeImprovements(options: ProposeImprovementsOptions): Promise<ProposeImprovementsResult> {
  const projectRoot = resolveProjectPath(options.project);
  const evidenceRecords = await readEvidenceRecords(projectRoot);
  const proposals = evidenceRecords
    .map((evidence) => proposalForEvidence(evidence))
    .filter((proposal): proposal is ImprovementProposal => proposal !== null);

  const paths: string[] = [];
  for (const proposal of proposals) {
    assertArtifact("improvement", proposal);
    const filePath = path.join(harnessArtifactDir(projectRoot, "proposals"), `${safeTimestamp()}-${proposal.target}.json`);
    await writeJson(filePath, proposal);
    paths.push(filePath);
  }

  return { proposals, paths };
}

function proposalForEvidence(evidence: LocatedEvidenceRecord): ImprovementProposal | null {
  const record = evidence.record;
  const actionableStatus = ACTIONABLE_STATUSES.has(record.status);
  const hasLimitations = record.limitations.length > 0;

  if (!actionableStatus && !hasLimitations) {
    return null;
  }

  return {
    schema: SCHEMAS.improvement,
    created_at: new Date().toISOString(),
    source_evidence: [evidence.path],
    problem: describeProblem(record),
    proposal: describeProposal(record),
    target: inferTarget(record),
    risk: inferRisk(record),
    acceptance: [
      `Evidence '${record.summary}' no longer reports ${record.status} for the same claim.`,
      "A follow-up evaluator packet includes the new evidence and the proposal result."
    ],
    requires_external_pass: true
  };
}

function describeProblem(record: EvidenceRecord): string {
  if (ACTIONABLE_STATUSES.has(record.status)) {
    return `${record.kind} evidence is ${record.status}: ${record.summary}`;
  }
  return `${record.kind} evidence has unresolved limitations: ${record.limitations.join("; ")}`;
}

function describeProposal(record: EvidenceRecord): string {
  if (record.status === "BLOCKED") {
    return "Add a smaller preflight check or clearer blocked-state guidance before rerunning this workflow.";
  }
  if (record.status === "NOT_RUN") {
    return "Add a runnable verification command or fixture so this claim can be checked in a future session.";
  }
  if (record.status === "PARTIAL") {
    return "Split the partial check into explicit PASS/FAIL criteria and capture missing evidence fields.";
  }
  if (record.status === "FAIL") {
    return "Add a focused failing-case fixture or diagnostic step before attempting a broader harness change.";
  }
  return "Document the limitation and add follow-up evidence before using this claim as a completion gate.";
}

function inferTarget(record: EvidenceRecord): ImprovementProposal["target"] {
  if (record.kind === "doc") {
    return "docs";
  }
  if (record.kind === "test" || record.kind === "build" || record.kind === "static") {
    return "tests";
  }
  return "core";
}

function inferRisk(record: EvidenceRecord): ImprovementProposal["risk"] {
  if (record.status === "FAIL" || record.status === "BLOCKED") {
    return "medium";
  }
  return "low";
}
