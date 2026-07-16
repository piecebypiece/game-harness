import assert from "node:assert/strict";
import test from "node:test";
import {
  SCHEMAS,
  createClaimDenominatorHash,
  hashRequirementChange,
  validateClaimCompleteness,
  validateDenominatorChange
} from "../dist/index.js";

const sourceHash = "a".repeat(64);
const future = "2099-01-01T00:00:00.000Z";

function requirementSet(requirements) {
  return {
    schema: SCHEMAS.requirementSet,
    created_at: new Date().toISOString(),
    set_id: "public-package",
    version: 1,
    requirements,
    limitations: []
  };
}

test("claim inventory rejects a missing required requirement", () => {
  const requirements = requirementSet([
    { id: "R1", statement: "one", disposition: "required", source: "README", source_hash: sourceHash, acceptance_owner: "owner" },
    { id: "R2", statement: "two", disposition: "required", source: "README", source_hash: sourceHash, acceptance_owner: "owner" }
  ]);
  const inventory = {
    schema: SCHEMAS.claimInventory,
    created_at: new Date().toISOString(),
    requirement_set_id: requirements.set_id,
    requirement_set_version: requirements.version,
    denominator_hash: createClaimDenominatorHash(requirements),
    claims: [{ id: "C1", requirement_ids: ["R1"], statement: "only one", required_evidence_axes: ["source"] }],
    limitations: []
  };
  const result = validateClaimCompleteness(requirements, inventory);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing_requirement_ids, ["R2"]);
});

test("claim inventory passes when every required requirement is covered", () => {
  const requirements = requirementSet([
    { id: "R1", statement: "one", disposition: "required", source: "README", source_hash: sourceHash, acceptance_owner: "owner" },
    { id: "R2", statement: "two", disposition: "optional", source: "README", source_hash: sourceHash, acceptance_owner: "owner" }
  ]);
  const inventory = {
    schema: SCHEMAS.claimInventory,
    created_at: new Date().toISOString(),
    requirement_set_id: requirements.set_id,
    requirement_set_version: requirements.version,
    denominator_hash: createClaimDenominatorHash(requirements),
    claims: [{ id: "C1", requirement_ids: ["R1"], statement: "required one", required_evidence_axes: ["source"] }],
    limitations: []
  };
  assert.equal(validateClaimCompleteness(requirements, inventory).valid, true);
});

test("claim denominator change requires a bound decision", () => {
  const previous = requirementSet([
    { id: "R1", statement: "one", disposition: "required", source: "README", source_hash: sourceHash, acceptance_owner: "owner" }
  ]);
  const next = { ...previous, version: 2, requirements: [{ ...previous.requirements[0], disposition: "optional" }] };
  assert.equal(validateDenominatorChange(previous, next), false);
  const decision = {
    schema: SCHEMAS.decisionRecord,
    created_at: new Date().toISOString(),
    decision_id: "decision-scope",
    decision_type: "requirement-scope-change",
    status: "APPROVED",
    owner: "human-owner",
    rationale: "approved scope reduction",
    bound_hash: hashRequirementChange(previous, next),
    expires_at: future
  };
  assert.equal(validateDenominatorChange(previous, next, decision), true);
});

test("version-only change keeps the required denominator stable", () => {
  const previous = requirementSet([
    { id: "R1", statement: "one", disposition: "required", source: "README", source_hash: sourceHash, acceptance_owner: "owner" }
  ]);
  const next = { ...previous, version: 2 };
  assert.equal(createClaimDenominatorHash(previous), createClaimDenominatorHash(next));
  assert.equal(validateDenominatorChange(previous, next), true);
});

test("duplicate stable requirement ids are rejected", () => {
  const requirements = requirementSet([
    { id: "R1", statement: "one", disposition: "required", source: "README", source_hash: sourceHash, acceptance_owner: "owner" },
    { id: "R1", statement: "duplicate", disposition: "optional", source: "README", source_hash: sourceHash, acceptance_owner: "owner" }
  ]);
  const inventory = {
    schema: SCHEMAS.claimInventory,
    created_at: new Date().toISOString(),
    requirement_set_id: requirements.set_id,
    requirement_set_version: requirements.version,
    denominator_hash: createClaimDenominatorHash(requirements),
    claims: [{ id: "C1", requirement_ids: ["R1"], statement: "claim", required_evidence_axes: ["source"] }],
    limitations: []
  };
  const result = validateClaimCompleteness(requirements, inventory);
  assert.equal(result.valid, false);
  assert.deepEqual(result.duplicate_requirement_ids, ["R1"]);
});
