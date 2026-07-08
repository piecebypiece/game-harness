import type { HarnessStatus } from "../../types.js";

export interface BalanceIslandSmokeSnapshot {
  scene: string;
  worldCreated: boolean;
  liveAgents: number;
  activeActions: number;
  hasTime: boolean;
  currentTick: number;
  hasSpawn: boolean;
  spawned: boolean;
  hasGrid: boolean;
  hasObservation: boolean;
  hasKpi: boolean;
  kpiTotalAlive: number;
}

export interface BalanceIslandSmokeVerdict {
  status: HarnessStatus;
  summary: string;
  missing: string[];
  snapshot: BalanceIslandSmokeSnapshot;
}

export function parseSmokeSnapshotText(text: string): BalanceIslandSmokeSnapshot {
  const match = text.match(/BI_SMOKE_SNAPSHOT\s+({.+})/);
  if (!match) {
    throw new Error("BI_SMOKE_SNAPSHOT JSON payload not found.");
  }

  const value = JSON.parse(match[1]) as unknown;
  return assertSmokeSnapshot(value);
}

export function evaluateSmokeSnapshot(snapshot: BalanceIslandSmokeSnapshot, expectedAgents = 1): BalanceIslandSmokeVerdict {
  const missing: string[] = [];

  if (!snapshot.worldCreated) missing.push("worldCreated");
  if (snapshot.liveAgents < expectedAgents) missing.push("liveAgents");
  if (!snapshot.hasTime) missing.push("hasTime");
  if (snapshot.currentTick < 0) missing.push("currentTick");
  if (!snapshot.hasSpawn) missing.push("hasSpawn");
  if (!snapshot.spawned) missing.push("spawned");
  if (!snapshot.hasGrid) missing.push("hasGrid");
  if (!snapshot.hasObservation) missing.push("hasObservation");
  if (!snapshot.hasKpi) missing.push("hasKpi");
  if (snapshot.kpiTotalAlive < expectedAgents) missing.push("kpiTotalAlive");

  if (missing.length === 0) {
    return {
      status: "PASS",
      summary: "Balance Island ECS runtime smoke passed all required fields.",
      missing,
      snapshot
    };
  }

  const status: HarnessStatus = snapshot.worldCreated ? "PARTIAL" : "FAIL";
  return {
    status,
    summary: `Balance Island ECS runtime smoke is ${status}; missing ${missing.join(", ")}.`,
    missing,
    snapshot
  };
}

function assertSmokeSnapshot(value: unknown): BalanceIslandSmokeSnapshot {
  if (!isRecord(value)) {
    throw new Error("Smoke snapshot payload is not an object.");
  }

  return {
    scene: stringField(value, "scene"),
    worldCreated: booleanField(value, "worldCreated"),
    liveAgents: numberField(value, "liveAgents"),
    activeActions: numberField(value, "activeActions"),
    hasTime: booleanField(value, "hasTime"),
    currentTick: numberField(value, "currentTick"),
    hasSpawn: booleanField(value, "hasSpawn"),
    spawned: booleanField(value, "spawned"),
    hasGrid: booleanField(value, "hasGrid"),
    hasObservation: booleanField(value, "hasObservation"),
    hasKpi: booleanField(value, "hasKpi"),
    kpiTotalAlive: numberField(value, "kpiTotalAlive")
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== "string") {
    throw new Error(`Smoke snapshot field '${key}' must be a string.`);
  }
  return value[key];
}

function booleanField(value: Record<string, unknown>, key: string): boolean {
  if (typeof value[key] !== "boolean") {
    throw new Error(`Smoke snapshot field '${key}' must be a boolean.`);
  }
  return value[key];
}

function numberField(value: Record<string, unknown>, key: string): number {
  if (typeof value[key] !== "number") {
    throw new Error(`Smoke snapshot field '${key}' must be a number.`);
  }
  return value[key];
}

