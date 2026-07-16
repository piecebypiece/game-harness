import path from "node:path";
import { harnessArtifactDir, resolveProjectPath, safeTimestamp } from "./paths.js";
import { writeJson } from "./fs-utils.js";
import { parseEvidenceKind, parseHarnessStatus } from "./validation.js";
import { assertArtifact, SCHEMAS, type ArtifactRef, type EvidenceKind, type EvidenceRecord, type HarnessStatus } from "../types.js";

export interface AddEvidenceOptions {
  project: string;
  kind: EvidenceKind;
  status: HarnessStatus;
  summary: string;
  command?: string | null;
  artifacts?: ArtifactRef[];
  claimsSupported?: string[];
  limitations?: string[];
}

export interface AddEvidenceResult {
  record: EvidenceRecord;
  path: string;
}

export async function addEvidence(options: AddEvidenceOptions): Promise<AddEvidenceResult> {
  const projectRoot = resolveProjectPath(options.project);
  const record: EvidenceRecord = {
    schema: SCHEMAS.evidence,
    created_at: new Date().toISOString(),
    project_root: projectRoot,
    kind: parseEvidenceKind(options.kind),
    command: options.command ?? null,
    status: parseHarnessStatus(options.status),
    summary: options.summary,
    artifacts: options.artifacts ?? [],
    claims_supported: options.claimsSupported ?? [],
    limitations: options.limitations ?? []
  };

  assertArtifact("evidence", record);

  const filePath = path.join(harnessArtifactDir(projectRoot, "evidence"), `${safeTimestamp()}-${options.kind}-${options.status}.json`);
  await writeJson(filePath, record);
  return { record, path: filePath };
}
