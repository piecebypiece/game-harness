import path from "node:path";
import { readEvidenceRecords, readImprovementProposals } from "./artifacts.js";
import { detectProjectState } from "./project-state.js";
import { resolveProjectPath } from "./paths.js";
import { writeJson } from "./fs-utils.js";
import { assertArtifact, redactArtifactForExport, SCHEMAS, type EvaluatorPacket, type LocatedEvidenceRecord } from "../types.js";

export interface ExportEvaluatorPacketOptions {
  project: string;
  profile?: string;
  out: string;
}

export interface ExportEvaluatorPacketResult {
  packet: EvaluatorPacket;
  path: string;
}

export async function exportEvaluatorPacket(options: ExportEvaluatorPacketOptions): Promise<ExportEvaluatorPacketResult> {
  const projectRoot = resolveProjectPath(options.project);
  const [snapshot, evidenceRecords, improvementProposals] = await Promise.all([
    detectProjectState({ project: projectRoot, profile: options.profile ?? "generic" }),
    readEvidenceRecords(projectRoot),
    readImprovementProposals(projectRoot)
  ]);

  const rawPacket: EvaluatorPacket = {
    schema: SCHEMAS.evaluatorPacket,
    created_at: new Date().toISOString(),
    project_root: projectRoot,
    snapshot,
    evidence_records: evidenceRecords,
    improvement_proposals: improvementProposals,
    pass_criteria_mapping: {
      "project-state-snapshot": snapshot.schema === SCHEMAS.projectState ? "PASS" : "BLOCKED",
      "evidence-records": evidenceRecords.length > 0 ? "PASS" : "PARTIAL",
      "improvement-proposals": improvementProposals.length > 0 ? "PASS" : "PARTIAL"
    },
    evaluation_gate: {
      status: "NOT_RUN",
      assignment_supplied: false,
      result_supplied: false,
      missing: ["EvaluationAssignment", "EvaluationResult"]
    },
    limitations: buildLimitations(evidenceRecords, improvementProposals.length)
  };

  const packet = redactArtifactForExport(rawPacket);
  assertArtifact("evaluatorPacket", packet);
  const outPath = path.resolve(options.out);
  await writeJson(outPath, packet);
  return { packet, path: outPath };
}

function buildLimitations(evidenceRecords: LocatedEvidenceRecord[], proposalCount: number): string[] {
  const limitations: string[] = [];
  if (evidenceRecords.length === 0) {
    limitations.push("No Evidence Record files were found for this project.");
  }
  if (proposalCount === 0) {
    limitations.push("No Improvement Proposal files were found for this project.");
  }
  for (const evidence of evidenceRecords) {
    for (const limitation of evidence.record.limitations) {
      limitations.push(`${evidence.path}: ${limitation}`);
    }
  }
  return limitations;
}
