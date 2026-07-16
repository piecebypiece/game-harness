import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SCHEMAS,
  assertArtifact,
  hashExecutionIntent,
  isDecisionBoundToIntent,
  loadSchema,
  redactArtifactForExport,
  redactForExport,
  validateArtifact,
  validateEvaluationResult
} from "../dist/index.js";

const sha = "a".repeat(64);
const future = "2099-01-01T00:00:00.000Z";

test("all protocol schemas load with ids aligned to SCHEMAS", () => {
  for (const [name, id] of Object.entries(SCHEMAS)) {
    assert.equal(loadSchema(name).$id, id);
  }
});

test("protocol rejects unknown or missing required fields", () => {
  const invalid = {
    schema: SCHEMAS.evidence,
    created_at: new Date().toISOString(),
    unexpected: true
  };
  const result = validateArtifact("evidence", invalid);
  assert.equal(result.valid, false);
  assert.equal(result.issues.some((issue) => issue.message.includes("required")), true);
  assert.equal(result.issues.some((issue) => issue.message.includes("additional")), true);
  assert.throws(() => assertArtifact("evidence", invalid), /Invalid evidence artifact/);
});

test("evaluation result rejects mismatched assignment and packet hashes", () => {
  const assignment = {
    schema: SCHEMAS.evaluationAssignment,
    created_at: new Date().toISOString(),
    assignment_id: "assignment-1",
    evaluator: "reviewer-a",
    independence: "E1",
    relationship: "separate context",
    packet_hash: sha,
    claim_inventory_hash: sha,
    read_only: true,
    allowed_tools: ["read"]
  };
  const result = {
    schema: SCHEMAS.evaluationResult,
    created_at: new Date().toISOString(),
    assignment_id: "assignment-1",
    evaluator: "reviewer-a",
    independence: "E1",
    packet_hash: "b".repeat(64),
    claim_inventory_hash: sha,
    status: "PASS",
    findings: [],
    evidence_refs: ["evidence-1"],
    limitations: []
  };
  assert.deepEqual(validateEvaluationResult(assignment, result), ["Packet hash mismatch."]);
});

test("E0 self review cannot satisfy a release gate", () => {
  const assignment = {
    schema: SCHEMAS.evaluationAssignment,
    created_at: new Date().toISOString(),
    assignment_id: "assignment-self",
    evaluator: "implementer",
    independence: "E0",
    relationship: "same context",
    packet_hash: sha,
    claim_inventory_hash: sha,
    read_only: true,
    allowed_tools: ["read"]
  };
  const result = {
    schema: SCHEMAS.evaluationResult,
    created_at: new Date().toISOString(),
    assignment_id: "assignment-self",
    evaluator: "implementer",
    independence: "E0",
    packet_hash: sha,
    claim_inventory_hash: sha,
    status: "PASS",
    findings: [],
    evidence_refs: ["evidence-1"],
    limitations: []
  };
  assert.equal(validateEvaluationResult(assignment, result, { releaseGate: true }).includes("E0 self review cannot satisfy a release gate."), true);
});

test("execution intent change invalidates an existing decision", () => {
  const intent = {
    schema: SCHEMAS.executionIntent,
    created_at: new Date().toISOString(),
    intent_id: "intent-1",
    operation: "write-report",
    target: "report.md",
    payload_digest: sha,
    write_set_digest: sha,
    state_hash: sha,
    plan_hash: sha,
    idempotency_key: "intent-1-attempt-1",
    permissions: ["workspace-write"],
    cost_ceiling: 0,
    expires_at: future
  };
  const decision = {
    schema: SCHEMAS.decisionRecord,
    created_at: new Date().toISOString(),
    decision_id: "decision-1",
    decision_type: "execution",
    status: "APPROVED",
    owner: "human-owner",
    rationale: "approved exact preview",
    bound_hash: hashExecutionIntent(intent),
    expires_at: future
  };
  assert.equal(isDecisionBoundToIntent(decision, intent), true);
  assert.equal(isDecisionBoundToIntent(decision, { ...intent, target: "other.md" }), false);
});

test("redaction removes Windows Unix token and private key fixtures", () => {
  const input = [
    "C:\\Users\\alice\\private\\repo",
    "/home/alice/private/repo",
    `Bearer ${"x".repeat(32)}`,
    `github_pat_${"a".repeat(30)}`,
    "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----"
  ].join("\n");
  const redacted = redactForExport(input);
  assert.doesNotMatch(redacted, /alice|secret|github_pat_|BEGIN PRIVATE KEY/);
  assert.match(redacted, /REDACTED/);
  const artifact = redactArtifactForExport({ nested: { path: "C:\\Users\\alice\\private\\repo" } });
  assert.doesNotMatch(JSON.stringify(artifact), /alice/);
});

test("malformed oversized and stale artifacts fail closed", () => {
  const context = {
    schema: SCHEMAS.contextPacket,
    created_at: "2020-01-01T00:00:00.000Z",
    packet_id: "packet-1",
    branch: "main",
    head: "abcdef1",
    dirty: false,
    anchors: [],
    verified_at: "2020-01-01T00:00:00.000Z",
    expires_at: "2020-01-02T00:00:00.000Z",
    missing: [],
    limitations: []
  };
  assert.equal(validateArtifact("contextPacket", context).issues.some((issue) => issue.message === "artifact is stale"), true);
  assert.equal(validateArtifact("contextPacket", { ...context, missing: ["x".repeat(200)] }, { maxBytes: 100 }).valid, false);
});

test("protocol package has no runtime or sdk dependency", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(packageJson.dependencies ?? {}, {});
  const files = ["index.ts", "validate.ts", "completeness.ts", "integrity.ts", "redaction.ts"];
  for (const file of files) {
    const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /reference-runtime|module-sdk|\.\.\/\.\.\/\.\.\/src/);
  }
});
