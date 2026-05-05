# Host Test Pool Stability Slice

## Current Repo Truth

`pnpm verify` runs the Host package test script as its final verification
stage. The Host package still used Vitest's `threads` pool, while the runner
package had already moved to `forks` with one worker for stability. During the
current audit loop, the full root verification reached Host tests and then
stopped producing output for several minutes. Running the same Host test files
through `--pool=forks --maxWorkers=1 --testTimeout=30000` passed 7 files and 99
tests in 8.59 seconds.

## Target Model

The default Host test command should be deterministic and suitable for the root
`pnpm verify` gate. Host tests touch Fastify servers, filesystem state, Nostr
helpers, Docker client mocks, and process-level resources, so a serial forked
pool is a safer default than the threads pool.

## Impacted Modules/Files

- `services/host/package.json`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Change `@entangle/host` test script from `--pool=threads` to
  `--pool=forks --maxWorkers=1 --testTimeout=30000`.
- Record the reason in the canonical docs so future agents do not reintroduce
  the less stable test pool without evidence.

## Tests Required

- `pnpm --filter @entangle/host test`
- `pnpm verify`
- `pnpm ops:check-product-naming`
- search for old local product identity markers across the repository
- `git diff --check`

## Migration/Compatibility Notes

This changes only the local verification command. It does not affect runtime
behavior or package APIs.

## Risks And Mitigations

- Risk: serial Host tests are slower than the thread pool.
  Mitigation: the observed forked run completed quickly, and deterministic
  verification is more important than shaving a few seconds off a pre-release
  test gate.
- Risk: a future test relies on thread-shared globals.
  Mitigation: Host tests should not require shared mutable thread state; forked
  isolation is the safer default.

## Open Questions

None for this slice.
