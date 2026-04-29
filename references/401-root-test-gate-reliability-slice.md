# Root Test Gate Reliability Slice

## Current Repo Truth

Package-level test commands pass, and the federated process-runner smoke passes.
The root `pnpm test` gate was still routed through `turbo run test
--concurrency=1`. In this environment, Turbo repeatedly left a Vitest child
process alive after successful package-level output, first in Studio, then CLI,
then User Client. The same package test commands completed normally when run
directly.

## Target Model

The root test gate should be boring and reliable. It should run every workspace
test command in a fixed sequence, stop on the first failure, and exit cleanly so
`pnpm verify` remains usable as a single local gate.

## Impacted Modules And Files

- `package.json`
- `apps/cli/package.json`
- `apps/studio/package.json`
- `apps/user-client/package.json`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace root `pnpm test` Turbo invocation with an explicit sequential
  workspace command chain.
- Keep Turbo for build/lint where it is not the observed hang point.
- Add explicit Vitest fork pools for CLI, Studio, and User Client package test
  scripts.
- Re-run package tests and root `pnpm test`.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/user-client test`
- `pnpm test`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist: no
  relevant hits

Already passed in the preceding verification window:

- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`

## Migration And Compatibility Notes

This changes only development tooling. It does not change runtime code,
contracts, Host APIs, runner behavior, or deployment profiles. Root tests run
without Turbo test caching, which is slower than a perfect cached run but
reliable in the observed environment.

## Risks And Mitigations

- Risk: the explicit package list can drift when new packages are added.
  Mitigation: keep this reference in the root test reliability slice and update
  the list as part of new-package scaffolding.
- Risk: removing Turbo from root tests loses test cache speed.
  Mitigation: correctness and clean process exit are more important for the
  root verification gate; Turbo remains available for build/lint.

## Open Questions

- Should a later CI profile reintroduce Turbo test caching after the Vitest
  child-process hang is understood upstream?
