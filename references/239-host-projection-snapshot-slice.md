# Host Projection Snapshot Slice

## Current Repo Truth

Projection contracts already existed in `packages/types/src/projection`, but
Host did not expose a projection snapshot. Runner registry and runtime
assignment reducers were already storing useful desired and observed state:

- runner hello and heartbeat payloads update registry and heartbeat records;
- assignment offers and revokes update desired assignment state;
- assignment accepted/rejected observations update assignment state.

Most runtime detail APIs still read runner-local files through
`runtimeRoot`. This slice does not replace those deep Local readers yet.

## Target Model

Host should expose a projection read model that Studio and CLI can consume
without inspecting runner files. The first projection snapshot should cover the
federated control-plane foundations already implemented:

- Host Authority identity;
- registered runners, trust, liveness, operational state, and heartbeat
  assignment ids;
- runtime assignments, leases, status, and projection source metadata;
- user conversation projection placeholder for later User Node slices.

This gives a canonical Host API surface to extend as runner observations for
sessions, turns, approvals, artifacts, source changes, and wiki refs arrive.

## Impacted Modules/Files

- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add `getHostProjectionSnapshot()` in Host state;
- project runners from registration plus heartbeat records;
- project assignments from desired assignment records and accepted/rejected
  observations;
- classify projection sources as `desired_state` or `observation_event`;
- set projection freshness to `stale` when trusted runners are stale/offline;
- expose `GET /v1/projection`;
- add `createHostClient().getProjection()`;
- add Host API and host-client tests for the projection surface.

Deferred to later projection slices:

- session, conversation, turn, approval, artifact, source-change, source
  history, and wiki projection records;
- event replay and durable projection-store rebuild;
- replacement of runtime APIs that still read runner-local files.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host-client typecheck` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host-client test` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/host-client lint` passed;
- `pnpm typecheck` passed;
- `git diff --check` passed.

## End-Of-Slice Audit

This slice does not add new runner filesystem reads. It projects only from Host
Authority, runner registry/heartbeat state, and assignment records. Existing
Local runtime APIs still read `runtimeRoot`, and that remains planned migration
work under the projection roadmap.

The local-assumption audit found no newly added `runtimeRoot`,
`contextPath`, Docker, or `effective-runtime-context` assumptions in this slice.

## Migration/Compatibility Notes

The new `/v1/projection` endpoint is additive. Existing Studio, CLI, and Host
API runtime endpoints continue to work. Consumers can begin reading the shared
projection snapshot without waiting for the deeper runtime API migration.

## Risks And Mitigations

- Risk: projection snapshot is mistaken for full runtime visibility.
  Mitigation: this record calls out that only runners and assignments are
  projected in this slice.
- Risk: projection freshness is too coarse.
  Mitigation: v1 exposes a simple stale/current signal and keeps per-runner
  liveness for more precise UI decisions.
- Risk: accepted/rejected assignment projection lacks event ids.
  Mitigation: current reducers store payloads, not signed envelopes; event-id
  retention remains part of the replay/projection-store follow-up.

## Open Questions

No open question blocks this slice. The next projection work should decide
whether to add envelope/event-id persistence before migrating session and turn
surfaces off local files.
