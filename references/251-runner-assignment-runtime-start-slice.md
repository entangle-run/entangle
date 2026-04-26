# Runner Assignment Runtime Start Slice

## Current Repo Truth

Generic joined runners could subscribe to Host control events, materialize an
assignment into runner-owned storage, fetch the Host-projected runtime context,
and publish assignment accepted/rejected observations. They still did not start
the node runtime from the materialized assignment.

This meant a federated runner could claim an assignment without beginning the
node's A2A service loop.

## Target Model

When assignment materialization yields a runner-owned runtime context path, the
joined runner starts the node runtime service from that context before
publishing `assignment.accepted`. The runner also emits signed `runtime.status`
observations for `starting`, `running`, and `stopped` so Host projection can
observe node lifecycle through the federated observe path.

The runtime starter is injectable for tests and specialized embeddings, while
the default starter reuses the existing `RunnerService` path.

## Impacted Modules/Files

- `services/runner/src/join-service.ts`
- `services/runner/src/assignment-materializer.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/251-runner-assignment-runtime-start-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- extended assignment materialization results with `runtimeContextPath`;
- renamed the fetched context copy to runner-owned `runtime-context.json`;
- added an injectable assignment runtime starter to `RunnerJoinService`;
- wired the default starter to `createConfiguredRunnerService(...).start()`;
- made accepted assignments publish `runtime.status` observations for
  starting/running;
- made runner stop/revoke paths stop assignment runtime handles and publish
  stopped status;
- added runner tests proving assignment materialization can start and stop the
  node runtime and emit status observations.

Deferred:

- assignment lease renewal and stale runtime shutdown;
- automatic retry/backoff for runtime start failures;
- live relay coverage for assignment-driven node runtime startup;
- replacing the Host Docker launcher path with assignment-only execution.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/runner lint`
- `pnpm typecheck`
- `pnpm lint`
- `git diff --check`
- active stale local-product naming search.

Verification record:

- targeted runner typecheck passed;
- targeted runner tests passed with 96 tests;
- targeted runner lint passed;
- targeted Host tests passed with 76 tests;
- root typecheck passed;
- root lint passed;
- `git diff --check` passed;
- active stale local-product naming search returned no matches.

## Migration/Compatibility Notes

Materializers that only return `{ accepted: true }` keep the previous
assignment-only behavior. Materializers that return `runtimeContextPath` now
require a runtime starter; the configured runner join path provides one by
default.

The fetched runtime context path changed from `host-runtime-context.json` to
`runtime-context.json` because the file is a runner-owned materialized copy.

## Risks And Mitigations

- Risk: default runtime start can fail after assignment files are written.
  Mitigation: the runner publishes failed runtime status and rejects the
  assignment if startup throws.
- Risk: stopping assignment runtime during runner shutdown may fail.
  Mitigation: this slice keeps stop behavior explicit; later recovery should
  add retry and stale lease handling.
- Risk: Host still has a Docker launcher route.
  Mitigation: this slice gives joined runners the execution path needed to
  demote the Host launcher in a follow-up.

## Open Questions

No product question blocks this slice. The remaining implementation decision is
whether assignment lease renewal should live inside `RunnerJoinService` or a
dedicated runner assignment supervisor.
