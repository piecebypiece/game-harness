# Release Checklist

Status: release candidate

## Scope

- Core CLI: `detect`, `status`, `evidence add`, `improve propose`, `export evaluator-packet`
- Schemas: project state, evidence, improvement, agent model, technology trend, evaluator packet
- Balance Island profile: fixture-based project state, smoke parser, unity-cli command suggestions, baseline comparison

## Verification Commands

```powershell
npm run typecheck
npm test
npm pack --dry-run
node dist/cli/index.js profile balance-island smoke parse --input fixtures/balance-island/session-9-smoke.txt --expected-agents 1
node dist/cli/index.js profile balance-island baseline compare --before fixtures/balance-island/baseline-before.txt --after fixtures/balance-island/baseline-after-same.txt
```

## Required Result

- Typecheck passes.
- Unit tests pass.
- `npm pack --dry-run` excludes generated fixture artifacts.
- Balance Island Session 9 smoke remains `PARTIAL`, not `PASS`.
- Balance Island baseline fixture reports no new changes.
- Final external evaluator returns `PASS`.

## Not Verified In This Release

- Live Balance Island Unity Editor/runtime smoke is not executed by release
  hardening. The release verifies fixture parsing and command suggestion only.
- A live runtime run must be a separate goal with pre/post baseline evidence.

## Safety Boundaries

- The core does not patch project truth files.
- Balance Island helpers are profile-scoped.
- `unity-cli` is suggested but not executed by the profile.
- Live `balance_Island` requires pre/post baseline before no-change PASS.
