import { createHash } from "node:crypto";
import type { ClaimInventory, DecisionRecord, RequirementSet } from "./index.js";

export interface ClaimCompletenessResult {
  valid: boolean;
  denominator_hash: string;
  missing_requirement_ids: string[];
  unknown_requirement_ids: string[];
  duplicate_requirement_ids: string[];
  duplicate_claim_ids: string[];
  errors: string[];
}

export function createClaimDenominatorHash(requirements: RequirementSet): string {
  const denominator = requirements.requirements
    .filter((requirement) => requirement.disposition === "required")
    .map((requirement) => ({ id: requirement.id, source_hash: requirement.source_hash }))
    .sort((left, right) => left.id.localeCompare(right.id));
  return sha256(stableStringify({ set_id: requirements.set_id, denominator }));
}

export function validateClaimCompleteness(
  requirements: RequirementSet,
  inventory: ClaimInventory
): ClaimCompletenessResult {
  const requiredIds = new Set(
    requirements.requirements
      .filter((requirement) => requirement.disposition === "required")
      .map((requirement) => requirement.id)
  );
  const allIds = new Set(requirements.requirements.map((requirement) => requirement.id));
  const requirementIds = requirements.requirements.map((requirement) => requirement.id);
  const duplicateRequirements = [...new Set(
    requirementIds.filter((id, index) => requirementIds.indexOf(id) !== index)
  )].sort();
  const covered = new Set(inventory.claims.flatMap((claim) => claim.requirement_ids));
  const missing = [...requiredIds].filter((id) => !covered.has(id)).sort();
  const unknown = [...covered].filter((id) => !allIds.has(id)).sort();
  const claimIds = inventory.claims.map((claim) => claim.id);
  const duplicates = [...new Set(
    claimIds.filter((id, index) => claimIds.indexOf(id) !== index)
  )].sort();
  const denominatorHash = createClaimDenominatorHash(requirements);
  const errors: string[] = [];
  if (inventory.requirement_set_id !== requirements.set_id || inventory.requirement_set_version !== requirements.version) {
    errors.push("ClaimInventory does not reference the supplied RequirementSet version.");
  }
  if (inventory.denominator_hash !== denominatorHash) {
    errors.push("ClaimInventory denominator hash does not match the required requirement set.");
  }
  if (missing.length > 0) errors.push(`Missing required requirements: ${missing.join(", ")}`);
  if (unknown.length > 0) errors.push(`Unknown requirement ids: ${unknown.join(", ")}`);
  if (duplicateRequirements.length > 0) errors.push(`Duplicate requirement ids: ${duplicateRequirements.join(", ")}`);
  if (duplicates.length > 0) errors.push(`Duplicate claim ids: ${duplicates.join(", ")}`);
  return {
    valid: errors.length === 0,
    denominator_hash: denominatorHash,
    missing_requirement_ids: missing,
    unknown_requirement_ids: unknown,
    duplicate_requirement_ids: duplicateRequirements,
    duplicate_claim_ids: duplicates,
    errors
  };
}

export function hashRequirementChange(previous: RequirementSet, next: RequirementSet): string {
  return sha256(stableStringify({
    previous: createClaimDenominatorHash(previous),
    next: createClaimDenominatorHash(next)
  }));
}

export function validateDenominatorChange(
  previous: RequirementSet,
  next: RequirementSet,
  decision?: DecisionRecord
): boolean {
  const previousHash = createClaimDenominatorHash(previous);
  const nextHash = createClaimDenominatorHash(next);
  if (previousHash === nextHash) return true;
  return Boolean(
    decision &&
      decision.status === "APPROVED" &&
      decision.decision_type === "requirement-scope-change" &&
      decision.bound_hash === hashRequirementChange(previous, next) &&
      Date.parse(decision.expires_at) > Date.now()
  );
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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
