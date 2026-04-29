# Root Test Gate Aggregate Vitest Slice

## Current Repo Truth

Before this slice, the root `pnpm test` gate ran
`scripts/run-workspace-tests.mjs`. That wrapper invoked the local Vitest binary
separately for each workspace and expanded each workspace's
`src/**/*.test.ts` files from the filesystem. It had already removed Turbo
test execution, nested `pnpm`, shell globbing, and implicit Vitest discovery
after those paths reproduced no-output hangs in this environment.

During verification after the distributed proof-kit post-work verifier slice,
`pnpm verify` reached the root test wrapper and intermittently stalled before
the next suite emitted Vitest output. Direct package tests still passed. A
full direct wrapper experiment using Vitest `--pool=forks --maxWorkers=1` for
every workspace completed all 11 suites. A later isolated reproduction showed
that under a `pnpm` parent, inheriting child stdio could still hang before
`host-client` emitted output, while piping stdout/stderr and ignoring child
stdin completed the same package sequence. Repeated per-workspace Vitest
launches nevertheless remained nondeterministic, with the stalled suite
changing between attempts. A direct single Vitest invocation with a root
aggregate config completed cleanly.

## Target Model

The root test gate should use one direct Vitest process for the full workspace
test set. Package-level test scripts can keep their faster or package-specific
commands, while the root aggregate gate uses a root config and one fork worker
to avoid cross-process lifecycle interaction hangs.

## Impacted Modules And Files

- `package.json`
- `vitest.aggregate.config.ts`
- removed `scripts/run-workspace-tests.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/401-root-test-gate-reliability-slice.md`
- `references/420-root-runner-test-pool-alignment-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `vitest.aggregate.config.ts`, a root-scoped Vitest config whose include
  pattern covers `apps`, `packages`, and `services` test files.
- Replaced the root `test` script with one direct Vitest aggregate command:
  `vitest run --config vitest.aggregate.config.ts --environment node --pool=forks --maxWorkers=1`.
- Removed `scripts/run-workspace-tests.mjs` because the Node wrapper itself was
  part of the unstable execution path.
- Kept package-level test scripts unchanged so targeted package tests continue
  using their established local commands.
- Updated root test gate documentation to describe the aggregate root
  execution model rather than per-package wrapper execution.

## Tests Required

Implemented and passed for this slice:

- `pnpm exec vitest list --config vitest.aggregate.config.ts --environment node --pool=forks --maxWorkers=1`
- `pnpm test`
- `pnpm verify`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This changes only local development verification tooling. Runtime behavior,
contracts, Host APIs, runner behavior, Studio, CLI, and deployment profiles are
unchanged. Root tests may be slightly slower than mixed pool settings, but the
aggregate gate is more valuable when it exits predictably.

## Risks And Mitigations

- Risk: single-worker forks hide package-specific concurrency issues.
  Mitigation: package-level test commands remain available and keep their
  package-specific settings; the root gate is an aggregate correctness and
  completion gate.
- Risk: future Vitest versions make another pool strategy better.
  Mitigation: this slice records the observed failure mode and acceptance
  checks so the root gate can be revisited deliberately.

## Open Questions

- Should CI later run an additional package-level parallelism profile once the
  root gate is stable on the target Node version?
