import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { harnessArtifactDir, resolveProjectPath } from "./paths.js";
import { exists } from "./fs-utils.js";
import {
  SCHEMAS,
  type EvidenceRecord,
  type ImprovementProposal,
  type LocatedEvidenceRecord,
  type LocatedImprovementProposal
} from "../types.js";

export async function readEvidenceRecords(project: string): Promise<LocatedEvidenceRecord[]> {
  const projectRoot = resolveProjectPath(project);
  const files = await listJsonFiles(harnessArtifactDir(projectRoot, "evidence"));
  const records: LocatedEvidenceRecord[] = [];

  for (const file of files) {
    const value = await readJson(file);
    if (isEvidenceRecord(value)) {
      records.push({ path: file, record: value });
    }
  }

  return records;
}

export async function readImprovementProposals(project: string): Promise<LocatedImprovementProposal[]> {
  const projectRoot = resolveProjectPath(project);
  const files = await listJsonFiles(harnessArtifactDir(projectRoot, "proposals"));
  const records: LocatedImprovementProposal[] = [];

  for (const file of files) {
    const value = await readJson(file);
    if (isImprovementProposal(value)) {
      records.push({ path: file, proposal: value });
    }
  }

  return records;
}

async function listJsonFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(child)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(child);
    }
  }
  return files.sort();
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function isEvidenceRecord(value: unknown): value is EvidenceRecord {
  return isRecord(value) && value.schema === SCHEMAS.evidence;
}

function isImprovementProposal(value: unknown): value is ImprovementProposal {
  return isRecord(value) && value.schema === SCHEMAS.improvement;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

