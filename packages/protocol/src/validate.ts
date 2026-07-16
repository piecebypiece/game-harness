import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SCHEMAS, type SchemaName } from "./index.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface JsonSchema {
  $id?: string;
  type?: string;
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  minItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  pattern?: string;
  minimum?: number;
  format?: string;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
}

const schemaFiles: Record<SchemaName, string> = {
  projectState: "project-state-snapshot.schema.json",
  evidence: "evidence-record.schema.json",
  improvement: "improvement-proposal.schema.json",
  agentModel: "agent-model-profile.schema.json",
  technologyTrend: "technology-trend-snapshot.schema.json",
  evaluatorPacket: "evaluator-packet.schema.json",
  workItemProjection: "work-item-projection.schema.json",
  requirementSet: "requirement-set.schema.json",
  claimInventory: "claim-inventory.schema.json",
  contextPacket: "context-packet.schema.json",
  evaluationAssignment: "evaluation-assignment.schema.json",
  evaluationResult: "evaluation-result.schema.json",
  decisionRequest: "decision-request.schema.json",
  decisionRecord: "decision-record.schema.json",
  executionIntent: "execution-intent.schema.json",
  runEnvelope: "run-envelope.schema.json",
  runAttempt: "run-attempt.schema.json",
  mutationLease: "mutation-lease.schema.json",
  installLedger: "install-ledger.schema.json",
  moduleManifest: "module-manifest.schema.json",
  disciplinePack: "discipline-pack.schema.json"
};

const cache = new Map<SchemaName, JsonSchema>();

export function loadSchema(name: SchemaName): JsonSchema {
  const cached = cache.get(name);
  if (cached) {
    return cached;
  }
  const schemaUrl = new URL(`../schemas/${schemaFiles[name]}`, import.meta.url);
  const schema = JSON.parse(readFileSync(fileURLToPath(schemaUrl), "utf8")) as JsonSchema;
  if (schema.$id !== SCHEMAS[name]) {
    throw new Error(`Schema id drift for ${name}: expected ${SCHEMAS[name]}, got ${String(schema.$id)}`);
  }
  cache.set(name, schema);
  return schema;
}

export function validateArtifact(
  name: SchemaName,
  value: unknown,
  options: { maxBytes?: number; now?: Date } = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const maxBytes = options.maxBytes ?? 1_000_000;
  try {
    const size = Buffer.byteLength(JSON.stringify(value), "utf8");
    if (size > maxBytes) {
      issues.push({ path: "$", message: `artifact size ${size} exceeds limit ${maxBytes}` });
      return { valid: false, issues };
    }
  } catch {
    issues.push({ path: "$", message: "artifact is not JSON-serializable" });
    return { valid: false, issues };
  }
  validateNode(loadSchema(name), value, "$", issues);
  validateExpiry(name, value, options.now ?? new Date(), issues);
  return { valid: issues.length === 0, issues };
}

export function assertArtifact(name: SchemaName, value: unknown): void {
  const result = validateArtifact(name, value);
  if (!result.valid) {
    const details = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Invalid ${name} artifact: ${details}`);
  }
}

function validateNode(schema: JsonSchema, value: unknown, path: string, issues: ValidationIssue[]): void {
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => validateCandidate(candidate, value));
    if (matches.length !== 1) {
      issues.push({ path, message: `expected exactly one matching schema, got ${matches.length}` });
      return;
    }
  }
  if (schema.anyOf && !schema.anyOf.some((candidate) => validateCandidate(candidate, value))) {
    issues.push({ path, message: "did not match any allowed schema" });
    return;
  }
  if (schema.const !== undefined && value !== schema.const) {
    issues.push({ path, message: `expected constant ${JSON.stringify(schema.const)}` });
  }
  if (schema.enum && !schema.enum.some((item) => item === value)) {
    issues.push({ path, message: `expected one of ${schema.enum.map(String).join(", ")}` });
  }
  if (schema.type && !matchesType(schema.type, value)) {
    issues.push({ path, message: `expected ${schema.type}` });
    return;
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({ path, message: `expected at least ${schema.minLength} characters` });
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      issues.push({ path, message: `did not match pattern ${schema.pattern}` });
    }
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) {
      issues.push({ path, message: "expected an ISO-compatible date-time" });
    }
  }

  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) {
    issues.push({ path, message: `expected value >= ${schema.minimum}` });
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push({ path, message: `expected at least ${schema.minItems} items` });
    }
    if (schema.uniqueItems) {
      const unique = new Set(value.map((item) => JSON.stringify(item)));
      if (unique.size !== value.length) {
        issues.push({ path, message: "expected unique items" });
      }
    }
    if (schema.items) {
      value.forEach((item, index) => validateNode(schema.items!, item, `${path}[${index}]`, issues));
    }
  }

  if (isRecord(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        issues.push({ path: `${path}.${key}`, message: "required property is missing" });
      }
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (key in value) {
        validateNode(child, value[key], `${path}.${key}`, issues);
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          issues.push({ path: `${path}.${key}`, message: "additional property is not allowed" });
        }
      }
    }
  }
}

function validateCandidate(schema: JsonSchema, value: unknown): boolean {
  const issues: ValidationIssue[] = [];
  validateNode({ ...schema, oneOf: undefined, anyOf: undefined }, value, "$", issues);
  return issues.length === 0;
}

function matchesType(type: string, value: unknown): boolean {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isRecord(value);
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  return typeof value === type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateExpiry(name: SchemaName, value: unknown, now: Date, issues: ValidationIssue[]): void {
  const expiringSchemas: SchemaName[] = ["contextPacket", "decisionRecord", "executionIntent", "mutationLease"];
  if (!expiringSchemas.includes(name) || !isRecord(value) || typeof value.expires_at !== "string") {
    return;
  }
  const expiresAt = Date.parse(value.expires_at);
  if (!Number.isNaN(expiresAt) && expiresAt <= now.getTime()) {
    issues.push({ path: "$.expires_at", message: "artifact is stale" });
  }
}
