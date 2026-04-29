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
- `scripts/run-workspace-tests.mjs`
- `apps/cli/package.json`
- `apps/studio/package.json`
- `apps/user-client/package.json`
- `packages/validator/package.json`
- `packages/package-scaffold/package.json`
- `packages/host-client/package.json`
- `services/host/package.json`
- `services/runner/package.json`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace root `pnpm test` Turbo invocation with an explicit sequential
  workspace test runner script.
- Keep Turbo for build/lint where it is not the observed hang point.
- Run each package through `pnpm --dir <workspace> test` with inherited stdio,
  package-specific timeouts, and process-group cleanup on interruption or
  timeout, instead of relying on a long shell `&&` chain of `pnpm --filter`
  commands.
- Add explicit Vitest fork pools for CLI, Studio, and User Client package test
  scripts.
- Earlier follow-up hardening briefly added explicit Vitest fork pools to
  `package-scaffold` and `host-client` after chained root verification
  reproduced no-output child-process hangs on those packages.
- Pin CLI tests to a single Vitest worker after the chained root gate reached
  the final CLI package and reproduced the same no-output hang under parallel
  fork workers.
- Keep `types`, `nostr-fabric`, and `agent-engine` on their previous default
  Vitest pool because those package suites remained stable there, and some of
  them hung when forced onto fork pools in this environment.
- Follow-up correction: `validator`, `package-scaffold`, and `host-client` are
  back on the default Vitest pool. Their previous `--pool=forks` pins later
  reproduced no-output root-gate hangs, while the same suites passed
  immediately under the default and threads pools.
- Follow-up correction: Host tests now use `--pool=threads` because the direct
  package command reproduced a no-output hang under the default pool outside
  the root runner, while the same suite passed immediately under threads.
- Follow-up correction: Runner tests now also use `--pool=threads` after the
  root gate reproduced a no-output hang under the default pool and the same
  suite passed immediately under threads and forks.
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

Follow-up hardening also re-ran the root gate after the newly affected
workspace Vitest test scripts used fork pools.

Later follow-up verification also covered:

- `pnpm --filter @entangle/validator test`
- `pnpm --filter @entangle/package-scaffold test`
- `pnpm --dir packages/validator exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --dir packages/validator exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts --pool=threads`
- `pnpm --dir packages/package-scaffold exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --dir packages/package-scaffold exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts --pool=threads`
- `pnpm --dir packages/host-client exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --dir packages/host-client exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts --pool=threads`
- `CI=true pnpm --dir services/host test`
- `pnpm --dir services/host exec vitest run --config ../../vitest.config.ts --environment node src/*.test.ts --pool=threads`
- `pnpm --dir services/runner exec vitest run --config ../../vitest.config.ts --environment node src/*.test.ts --pool=threads`
- `pnpm --dir services/runner exec vitest run --config ../../vitest.config.ts --environment node src/*.test.ts --pool=forks`

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
