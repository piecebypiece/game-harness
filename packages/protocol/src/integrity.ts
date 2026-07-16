import { createHash } from "node:crypto";
import type {
  DecisionRecord,
  EvaluationAssignment,
  EvaluationResult,
  ExecutionIntent
} from "./index.js";

export function hashExecutionIntent(intent: ExecutionIntent): string {
  return createHash("sha256").update(stableStringify(intent)).digest("hex");
}

export function isDecisionBoundToIntent(decision: DecisionRecord, intent: ExecutionIntent): boolean {
  return decision.status === "APPROVED" &&
    decision.decision_type === "execution" &&
    decision.bound_hash === hashExecutionIntent(intent) &&
    Date.parse(decision.expires_at) > Date.now() &&
    Date.parse(intent.expires_at) > Date.now();
}

export function validateEvaluationResult(
  assignment: EvaluationAssignment,
  result: EvaluationResult,
  options: { releaseGate?: boolean } = {}
): string[] {
  const errors: string[] = [];
  if (result.assignment_id !== assignment.assignment_id) errors.push("Assignment id mismatch.");
  if (result.evaluator !== assignment.evaluator) errors.push("Evaluator identity mismatch.");
  if (result.independence !== assignment.independence) errors.push("Independence level mismatch.");
  if (result.packet_hash !== assignment.packet_hash) errors.push("Packet hash mismatch.");
  if (result.claim_inventory_hash !== assignment.claim_inventory_hash) errors.push("Claim inventory hash mismatch.");
  if (!assignment.read_only) errors.push("Evaluator assignment must be read-only.");
  if (options.releaseGate && assignment.independence === "E0" && result.status === "PASS") {
    errors.push("E0 self review cannot satisfy a release gate.");
  }
  if (result.status === "PASS" && result.evidence_refs.length === 0) {
    errors.push("PASS requires at least one evidence reference.");
  }
  return errors;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
