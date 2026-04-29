# Root Runner Test Pool Alignment Slice

## Current Repo Truth

The runner package test script already uses Vitest `--pool=threads`, and the
root test reliability record states that runner tests should use the threads
pool after the default pool reproduced no-output hangs in this environment.

Before this slice, `scripts/run-workspace-tests.mjs` had drifted from that
truth: the root wrapper still launched `@entangle/runner` with the default
Vitest pool. During verification after the distributed proof runtime-state
slice, root `pnpm test` reached the runner suite and stalled without output.
The direct runner package test passed immediately under `--pool=threads`.

## Target Model

Root `pnpm test` should execute the runner suite with the same stable pool used
by the runner package script and documented by the root test reliability slice.

## Impacted Modules And Files

- `scripts/run-workspace-tests.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/401-root-test-gate-reliability-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Updated the root sequential workspace test runner so `@entangle/runner` uses
  `--pool=threads`.
- Updated root test gate documentation to say both Host and Runner use the
  threads pool inside the root wrapper.

## Tests Required

Implemented for this slice:

- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm test`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This changes only local development verification tooling. Runtime code,
protocol contracts, Host APIs, runner behavior, Studio, CLI, and deployment
profiles are unchanged.

## Risks And Mitigations

- Risk: root wrapper pool settings drift from package scripts again.
  Mitigation: the root test reliability slice now explicitly records the root
  wrapper and package-script alignment for Runner.
- Risk: future Vitest versions change pool behavior.
  Mitigation: the direct package test plus root `pnpm test` gate remain the
  acceptance checks for this tooling path.

## Open Questions

- Should the root wrapper derive per-package Vitest args from package scripts
  instead of keeping an explicit in-repo matrix? That may reduce drift, but the
  current explicit runner exists because nested `pnpm` package execution was a
  prior no-output hang source.
