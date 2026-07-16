# @game-harness/protocol

Versioned, engine-neutral contracts for the Game Harness Set.

This package owns schemas and validation semantics. It has no dependency on
the Reference Runtime, engine profiles, agent SDKs, or game projects.

```ts
import {
  assertArtifact,
  createClaimDenominatorHash,
  validateClaimCompleteness
} from "@game-harness/protocol";
```

Status: Development Preview. Schema compatibility is not guaranteed until
Protocol v1 is declared stable.
