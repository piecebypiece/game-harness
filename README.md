# Game Harness

Status: milestone 3 implementation in progress.

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

## Commands

```powershell
npm install
npm run build
node dist/cli/index.js detect --project fixtures/generic-project
node dist/cli/index.js status --project fixtures/generic-project
node dist/cli/index.js evidence add --project fixtures/generic-project --kind test --status PASS --summary "fixture evidence"
node dist/cli/index.js improve propose --project fixtures/generic-project
node dist/cli/index.js export evaluator-packet --project fixtures/generic-project --out artifacts/evaluator-packet.json
node dist/cli/index.js profile balance-island smoke parse --input fixtures/balance-island/session-9-smoke.txt
node dist/cli/index.js profile balance-island commands --project fixtures/balance-island
```

## Milestone Boundary

Balance Island support is implemented as a profile so the engine-neutral core
remains separate.
