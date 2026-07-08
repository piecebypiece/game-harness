#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { addEvidence } from "../core/evidence.js";
import { exportEvaluatorPacket } from "../core/evaluator-packet.js";
import { proposeImprovements } from "../core/improvement.js";
import { detectProjectState } from "../core/project-state.js";
import { renderStatus } from "../core/status.js";
import { parseEvidenceKind, parseHarnessStatus } from "../core/validation.js";
import { parseArgs, stringFlag } from "./args.js";

const HELP = `Game Harness

Usage:
  game-harness detect --project <path> [--profile <name>] [--out <path>]
  game-harness status --project <path> [--profile <name>]
  game-harness evidence add --project <path> --kind <kind> --status <status> --summary <text> [--command <cmd>]
  game-harness improve propose --project <path>
  game-harness export evaluator-packet --project <path> --out <path> [--profile <name>]

Commands:
  detect                   Print a project state snapshot. Writes only when --out is set.
  status                   Print a human-readable harness status.
  evidence add             Add an Evidence Record under artifacts/game-harness/evidence.
  improve propose          Generate Improvement Proposals from actionable evidence.
  export evaluator-packet  Export a read-only evaluator packet.
`;

async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  const [command, subcommand] = parsed.positionals;

  if (!command || command === "help" || parsed.flags.help === true) {
    console.log(HELP);
    return;
  }

  if (command === "detect") {
    const project = stringFlag(parsed.flags, "project", true)!;
    const profile = stringFlag(parsed.flags, "profile") ?? "generic";
    const snapshot = await detectProjectState({ project, profile });
    const out = stringFlag(parsed.flags, "out");
    if (out) {
      await writeFile(path.resolve(out), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    }
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  if (command === "status") {
    const project = stringFlag(parsed.flags, "project", true)!;
    const profile = stringFlag(parsed.flags, "profile") ?? "generic";
    console.log(await renderStatus({ project, profile }));
    return;
  }

  if (command === "evidence" && subcommand === "add") {
    const project = stringFlag(parsed.flags, "project", true)!;
    const kind = parseEvidenceKind(stringFlag(parsed.flags, "kind", true)!);
    const status = parseHarnessStatus(stringFlag(parsed.flags, "status", true)!);
    const summary = stringFlag(parsed.flags, "summary", true)!;
    const commandText = stringFlag(parsed.flags, "command");
    const result = await addEvidence({
      project,
      kind,
      status,
      summary,
      command: commandText ?? null
    });
    console.log(JSON.stringify({ path: result.path, record: result.record }, null, 2));
    return;
  }

  if (command === "improve" && subcommand === "propose") {
    const project = stringFlag(parsed.flags, "project", true)!;
    const result = await proposeImprovements({ project });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "export" && subcommand === "evaluator-packet") {
    const project = stringFlag(parsed.flags, "project", true)!;
    const out = stringFlag(parsed.flags, "out", true)!;
    const profile = stringFlag(parsed.flags, "profile") ?? "generic";
    const result = await exportEvaluatorPacket({ project, out, profile });
    console.log(JSON.stringify({ path: result.path, packet: result.packet }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${argv.join(" ")}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`game-harness: ${message}`);
  process.exitCode = 1;
});
