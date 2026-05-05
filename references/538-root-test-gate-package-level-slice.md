# Root Test Gate Package-Level Slice

## Current Repo Truth

`pnpm verify` runs lint, typecheck, and `pnpm test`. The root test script used
a single repository-level Vitest aggregate process for apps and packages, then
ran Runner and Host package suites separately.

During this slice, lint and typecheck passed, but the aggregate Vitest segment
stalled without output until it had to be terminated. Running the same app and
package suites through their package-level scripts completed successfully.

## Target Model

The root test gate should prefer deterministic completion over a compact but
fragile aggregate Vitest process. Every workspace package should run through
its own package-level test script, preserving the pool choices and fixture
boundaries that already pass directly.

## Impacted Modules And Files

- `package.json`
- `.gitignore`
- `scripts/run-workspace-tests.mjs`
- `vitest.aggregate.config.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace the root aggregate Vitest command with an explicit package-level
  runner for all test-bearing workspaces.
- Apply the same package-level sequence to `test:coverage`.
- Align the User Client test script with the single-fork stability profile
  after the threads pool stalled inside the root sequence.
- Bound each workspace test command with a per-package timeout so no-output
  stalls fail visibly instead of hanging the root gate indefinitely.
- Ignore generated coverage directories from package-level coverage runs.
- Remove the now-unused aggregate Vitest config from active tooling.
- Update active docs so they describe the current root test orchestration.

## Tests Required

- Direct package tests for the app/package suites that previously ran under the
  aggregate process.
- Root `pnpm test`.
- Root `pnpm verify`.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit over root tooling and docs.

## Migration And Compatibility Notes

This changes only repository verification orchestration. Package-level test
scripts remain the source of truth for each workspace, and the root command
still runs the full suite.

## Risks And Mitigations

- Risk: the root test command becomes longer and slower. Mitigation: reliable
  completion is more valuable than a shorter command that can stall silently.
- Risk: coverage output is split by package. Mitigation: this preserves the
  existing package-level test commands and keeps `test:coverage` available for
  focused package coverage runs.

## Open Questions

No product-level ambiguity remains. If Vitest aggregate execution becomes
stable later, it can be reintroduced behind a measured CI gate rather than as
the default root verification path.

## Verification

Completed in this slice:

- direct package-level tests for the app/package suites
- package-scaffold coverage flag forwarding check
- `node --check scripts/run-workspace-tests.mjs`
- `pnpm test`
- `pnpm verify`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over root tooling and updated docs
