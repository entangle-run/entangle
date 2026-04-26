# Runtime Status Observation Projection Slice

## Current Repo Truth

Host could ingest signed runner hello, heartbeat, assignment, artifact, source,
and wiki observations through the federated control plane. `runtime.status`
observation payloads existed in the shared contracts, but Host ignored them, so
runtime observed state still depended on local launcher reconciliation for the
main runtime read model.

The runtime backend kind contract also only admitted launcher-owned `docker`
and in-memory records. That made a runner-signed observation look like it had
to be projected as a local launcher state, which is the wrong authority
boundary.

## Target Model

Runner-owned node execution reports runtime status to Host with signed
`entangle.observe.v1` events. Host verifies the runner against the registry,
records an observed runtime projection, and emits the same
`runtime.observed_state.changed` Host event used by existing runtime
inspection.

This state is explicitly `backendKind: "federated"` because it comes from a
runner observation, not from Host controlling a same-machine process. The fact
that a runner may live on the same machine is irrelevant to the projection
path.

## Impacted Modules/Files

- `packages/types/src/runtime/runtime-state.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/249-runtime-status-observation-projection-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `federated` to the runtime backend kind contract;
- added a schema test for federated observed runtime records;
- added Host state handling for `runtime.status` observation payloads;
- verified Host Authority and runner registry identity before accepting
  runtime status observations;
- wrote observed runtime records with `backendKind: "federated"` and
  deterministic `federated:<runnerId>:<assignmentId|nodeId>` handles;
- emitted `runtime.observed_state.changed` Host events from runner-signed
  runtime status changes;
- routed `runtime.status` through `HostFederatedControlPlane`;
- extended Host control-plane tests to prove runtime status observations update
  Host event state without reading runner files.

Deferred:

- exposing observed runtime records in the projection snapshot used by Studio
  and CLI;
- making the runner node service emit `runtime.status` automatically from the
  assigned node lifecycle;
- replacing remaining local launcher runtime inspection paths with
  observation-backed projections;
- live relay coverage for runtime status events.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `pnpm lint`
- package-level tests if root Turbo test hangs again
- `git diff --check`
- stale product marker and same-machine-assumption search.

Verification record:

- targeted types typecheck passed;
- targeted types tests passed with 95 tests;
- targeted Host typecheck passed;
- targeted Host tests passed with 76 tests;
- targeted Host lint passed;
- `pnpm typecheck` passed;
- `pnpm lint` passed;
- `git diff --check` passed;
- stale product marker and path searches for removed same-product naming and
  runtime profile defaults returned no hits.

## Migration/Compatibility Notes

Existing launcher-owned `docker` and test `memory` runtime records remain valid
backend kinds. `federated` is additive at the schema level and becomes the
canonical backend kind for Host projections derived from runner observations.

No old product marker or compatibility alias is introduced.

## Risks And Mitigations

- Risk: Host accepts runtime status for a node assignment that is no longer
  current.
  Mitigation: this slice verifies Host Authority and runner identity; assignment
  freshness checks should be added when runtime status is coupled to active
  assignment lease projection.
- Risk: runtime status can be projected before Host has a desired-state record.
  Mitigation: Host records the runner observation and defaults the event
  desired state to `running`; later assignment projection should provide the
  authoritative desired-state fallback.
- Risk: Studio and CLI do not yet display this observed runtime state from the
  common projection.
  Mitigation: the next projection/UI slice should lift federated observed
  runtime records into the Host projection snapshot.

## Open Questions

No product question blocks this slice. The remaining implementation decision is
whether runtime status should be joined to assignment leases in Host state at
write time or only when building projection snapshots.
