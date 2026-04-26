# Runner Default Assignment Materializer Slice

## Current Repo Truth

Generic runner join mode could receive signed assignment offers, but it only
accepted them when callers injected a materializer. Normal runner startup did
not provide one, so a real joined runner rejected otherwise valid assignments.

## Target Model

A runner must always have a minimal assignment materializer. The first version
does not yet fetch full graph/package/resource snapshots, but it establishes
runner ownership of assignment state:

- assignment offers are recorded under runner-owned storage;
- the signed control event that caused materialization is recorded with the
  assignment;
- the runner accepts the assignment after durable local materialization;
- the storage root is configured by runner environment, not Host filesystem
  assumptions.

## Impacted Modules/Files

- `services/runner/src/assignment-materializer.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/248-runner-default-assignment-materializer-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added a filesystem assignment materializer for generic joined runners;
- added `ENTANGLE_RUNNER_STATE_ROOT` support for runner-owned assignment state;
- persisted `assignment.json`, `control-event.json`, and
  `materialization.json` per assignment;
- wired the materializer as the default for `createConfiguredRunnerJoinService`;
- updated runner tests so default join mode accepts and records assignments
  rather than rejecting valid offers.

Deferred:

- fetching Host-signed graph/resource/package snapshots;
- starting the full node runtime service from the accepted assignment;
- durable runtime status observations from materialized node execution;
- per-assignment workspace and memory/wiki repository initialization;
- control-event replay/idempotency beyond filesystem overwrite semantics.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/runner lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `git diff --check`
- stale product marker and path search for removed same-product naming markers.

Verification record:

- targeted runner typecheck passed;
- targeted runner tests passed;
- targeted runner lint passed;
- `pnpm typecheck` passed;
- `pnpm lint` passed;
- `pnpm test` passed;
- `git diff --check` passed;
- stale product marker and path searches for removed same-product naming and
  runtime profile defaults returned no hits.

## Migration/Compatibility Notes

Injected materializers still take precedence for tests and specialized runner
embeddings. The default materializer uses `ENTANGLE_RUNNER_STATE_ROOT` when set
and otherwise writes under the runner process working directory. This is a
runner-owned store and does not require the Host state directory to be mounted.

## Risks And Mitigations

- Risk: a minimal materializer can accept an assignment before executable node
  context exists.
  Mitigation: this slice records assignment ownership only; the next runner
  slice must fetch/materialize graph and package context before starting node
  execution.
- Risk: repeated assignment offers overwrite the same files.
  Mitigation: overwrite is deterministic for v1; idempotency metadata should be
  formalized when durable replay is implemented.
- Risk: storage root defaults to process working directory when not configured.
  Mitigation: deployment profiles should set `ENTANGLE_RUNNER_STATE_ROOT`
  explicitly for real runners.

## Open Questions

No product question blocks this slice. The remaining implementation decision is
whether graph/package snapshot retrieval should use Host HTTP as a bootstrap
adapter, Nostr-carried refs plus git/object fetch, or both behind a common
materialization interface.
