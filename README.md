# Game Harness

Status: milestone 1 implementation.

Game Harness is a minimal, project-local harness core for game-development AI
agents. It records project state and evidence without owning project truth.

## Current Scope

- Project state detection
- Evidence record creation
- Status reporting
- Schema constants for later self-improvement workflow

The core does not patch `AGENTS.md`, `.agents`, `.pipeline`, engine settings,
or source assets.

## Commands

```powershell
npm install
npm run build
node dist/cli/index.js detect --project fixtures/generic-project
node dist/cli/index.js status --project fixtures/generic-project
node dist/cli/index.js evidence add --project fixtures/generic-project --kind test --status PASS --summary "fixture evidence"
```

## Milestone Boundary

M1 intentionally excludes project-specific profiles. Balance Island support is
implemented in a later milestone so the engine-neutral core remains separate.

