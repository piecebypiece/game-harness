import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addEvidence,
  detectProjectState,
  exportEvaluatorPacket,
  parseEvidenceKind,
  proposeImprovements,
  renderStatus,
  SCHEMAS
} from "../dist/index.js";

test("detectProjectState records SoT files and schema", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "game-harness-detect-"));
  await writeFile(path.join(projectRoot, "AGENTS.md"), "# Test\n", "utf8");
  await mkdir(path.join(projectRoot, "ProjectSettings"), { recursive: true });
  await writeFile(path.join(projectRoot, "ProjectSettings", "ProjectVersion.txt"), "m_EditorVersion: 6000.4.6f1\n", "utf8");

  const snapshot = await detectProjectState({ project: projectRoot, profile: "generic" });

  assert.equal(snapshot.schema, SCHEMAS.projectState);
  assert.equal(snapshot.engine_state.kind, "unity");
  assert.equal(snapshot.engine_state.version, "6000.4.6f1");
  assert.equal(snapshot.sot_files.find((file) => file.path === "AGENTS.md")?.exists, true);
});

test("addEvidence writes an evidence record", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "game-harness-evidence-"));
  const result = await addEvidence({
    project: projectRoot,
    kind: "test",
    status: "PASS",
    summary: "unit test evidence"
  });

  const text = await readFile(result.path, "utf8");
  const parsed = JSON.parse(text);
  assert.equal(parsed.schema, SCHEMAS.evidence);
  assert.equal(parsed.status, "PASS");
  assert.equal(parsed.summary, "unit test evidence");
});

test("renderStatus reports project status", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "game-harness-status-"));
  await writeFile(path.join(projectRoot, "README.md"), "# Test\n", "utf8");

  const status = await renderStatus({ project: projectRoot });

  assert.match(status, /# Game Harness Status/);
  assert.match(status, /README.md/);
});

test("evidence runtime validation rejects invalid values", () => {
  assert.throws(() => parseEvidenceKind("invalid-kind"), /Invalid evidence kind/);
});

test("proposeImprovements writes proposals for actionable evidence", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "game-harness-propose-"));
  await addEvidence({
    project: projectRoot,
    kind: "test",
    status: "FAIL",
    summary: "unit failure"
  });

  const result = await proposeImprovements({ project: projectRoot });

  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].schema, SCHEMAS.improvement);
  assert.equal(result.proposals[0].requires_external_pass, true);
  assert.equal(result.paths.length, 1);
});

test("exportEvaluatorPacket writes packet with snapshot evidence and proposals", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "game-harness-packet-"));
  await writeFile(path.join(projectRoot, "AGENTS.md"), "# Packet Fixture\n", "utf8");
  await addEvidence({
    project: projectRoot,
    kind: "test",
    status: "FAIL",
    summary: "packet failure"
  });
  await proposeImprovements({ project: projectRoot });

  const out = path.join(projectRoot, "packet.json");
  const result = await exportEvaluatorPacket({ project: projectRoot, out });
  const text = await readFile(out, "utf8");
  const parsed = JSON.parse(text);

  assert.equal(result.packet.schema, SCHEMAS.evaluatorPacket);
  assert.equal(parsed.schema, SCHEMAS.evaluatorPacket);
  assert.equal(parsed.evidence_records.length, 1);
  assert.equal(parsed.improvement_proposals.length, 1);
});
