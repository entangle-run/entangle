# Runner Test Gate Fork Stability Slice

## Current Repo Truth

Root `pnpm test` runs the aggregate app/package Vitest suite first, then
delegates to `pnpm --filter @entangle/runner test`, then Host tests. During
verification after the scoped bootstrap permission slice, the aggregate suite
passed, then the runner package test command stalled without output under
`--pool=threads`. The same runner test set passed directly with
`--pool=forks --maxWorkers=1 --testTimeout=30000`.

Earlier slice records documented `--pool=threads` as the stable runner path,
but this environment now proves that statement stale.

## Target Model

The root test gate should use deterministic single-worker Vitest execution for
the runner suite, matching the aggregate gate's single-fork strategy and
avoiding no-output hangs. The runner package script should be the source of
truth so both direct package tests and root `pnpm test` use the same stable
runner command.

## Impacted Modules And Files

- `services/runner/package.json`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/401-root-test-gate-reliability-slice.md`
- `references/420-root-runner-test-pool-alignment-slice.md`
- `references/README.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes

- Changed `@entangle/runner` test script from `--pool=threads` to
  `--pool=forks --maxWorkers=1 --testTimeout=30000`.
- Updated active test-gate documentation to record that the runner package
  script now follows the single-fork stability profile.
- Left historical slice context intact where useful, but marked the old
  threads decision as superseded.

## Tests Required

Implemented and passed before the package-script change:

- direct runner suite with
  `../../node_modules/.bin/vitest run --config ../../vitest.config.ts --environment node src/*.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000`

Passed after the package-script change:

- `pnpm --filter @entangle/runner test`
- root `pnpm test`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit for the standard Entangle pivot terms

## Migration And Compatibility Notes

This is a local verification tooling change only. Runtime code, Host/runner
protocol behavior, Studio, CLI, deployment profiles, and package contracts are
unchanged.

## Risks And Mitigations

- Risk: future Vitest versions change pool behavior again.
  Mitigation: the root `pnpm test` gate remains the acceptance test, and this
  slice records the exact observed hang and passing command.
- Risk: single-fork runner tests are slower.
  Mitigation: the suite completed in roughly 10 seconds locally, which is a
  better tradeoff than non-deterministic no-output hangs.

## Open Questions

- Should Host tests also move from threads to single-fork if the root gate later
  proves a similar hang there?
