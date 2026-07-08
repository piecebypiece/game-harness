import type { EvidenceKind, HarnessStatus } from "../types.js";

export const EVIDENCE_KINDS: EvidenceKind[] = ["build", "test", "runtime", "static", "doc", "manual"];
export const HARNESS_STATUSES: HarnessStatus[] = ["PASS", "FAIL", "PARTIAL", "BLOCKED", "NOT_RUN"];

export function parseEvidenceKind(value: string): EvidenceKind {
  if (EVIDENCE_KINDS.includes(value as EvidenceKind)) {
    return value as EvidenceKind;
  }
  throw new Error(`Invalid evidence kind '${value}'. Expected one of: ${EVIDENCE_KINDS.join(", ")}`);
}

export function parseHarnessStatus(value: string): HarnessStatus {
  if (HARNESS_STATUSES.includes(value as HarnessStatus)) {
    return value as HarnessStatus;
  }
  throw new Error(`Invalid harness status '${value}'. Expected one of: ${HARNESS_STATUSES.join(", ")}`);
}

