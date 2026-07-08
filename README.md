# Game Harness

Status: release candidate.

Game Harness is a minimal, project-local harness core for game-development AI
agents. It records project state and evidence without owning project truth.

## Current Scope

- Project state detection
- Evidence record creation
- Status reporting
- Improvement proposal generation
- Evaluator packet export
- Balance Island fixture/profile support

The core does not patch `AGENTS.md`, `.agents`, `.pipeline`, engine settings,
or source assets.

## Install

```powershell
npm install
npm run build
```

## Commands

```powershell
node dist/cli/index.js detect --project fixtures/generic-project
node dist/cli/index.js status --project fixtures/generic-project
node dist/cli/index.js evidence add --project fixtures/generic-project --kind test --status PASS --summary "fixture evidence"
node dist/cli/index.js improve propose --project fixtures/generic-project
node dist/cli/index.js export evaluator-packet --project fixtures/generic-project --out artifacts/evaluator-packet.json
node dist/cli/index.js profile balance-island smoke parse --input fixtures/balance-island/session-9-smoke.txt
node dist/cli/index.js profile balance-island commands --project fixtures/balance-island
```

## Safety Model

- `detect` prints a snapshot unless `--out` is explicitly provided.
- `unity-cli` commands are suggestions only in the Balance Island profile.
- Session 9 Balance Island smoke evidence remains partial when ECS runtime
  fields are missing, even if `worldCreated=true`.
- Dirty live repositories require pre/post baseline comparison before a
  no-change PASS can be claimed.

## Public API

The root API exports engine-neutral core helpers. Balance Island helpers are
available under a profile namespace:

```ts
import { balanceIslandProfile, detectProjectState } from "@game-harness/core";
```

Package subpath:

```ts
import { evaluateSmokeSnapshot } from "@game-harness/core/profiles/balance-island";
```

## Boundary

Balance Island support is implemented as a profile so the engine-neutral core
remains separate.
