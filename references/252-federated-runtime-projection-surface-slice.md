# Federated Runtime Projection Surface Slice

## Current Repo Truth

Host persisted signed runner `runtime.status` observations as observed runtime
records and emitted `runtime.observed_state.changed` events, but
`/v1/projection` did not expose runtime projection records. Studio fetched the
projection for federation counts and User Node conversations, while runtime
cards still came from the older runtime inspection API. CLI exposed runner,
assignment, and inbox projection paths but did not have a direct Host projection
command.

## Target Model

Host projection must be the shared read model for federated operator surfaces.
Runtime state reported by runners should be visible in the projection without
forcing Host to reconcile a local launcher backend or read runner filesystem
paths. Studio and CLI should be able to show the same projected runtime state.

## Impacted Modules/Files

- `packages/types/src/runtime/runtime-state.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/252-federated-runtime-projection-surface-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- extended observed runtime records with optional `runnerId` and
  `assignmentId`;
- added `RuntimeProjectionRecord` to the Host projection contract;
- made `recordRuntimeStatusObservation()` persist runner and assignment
  identity from signed observations;
- made `getHostProjectionSnapshot()` include runtime projection records derived
  from observed runtime records, runtime intents, and active assignment records
  without invoking backend reconciliation;
- added Studio federation metrics and compact runtime projection rows;
- added `entangle host projection` with compact CLI summary output;
- added schema, Host, CLI, and Studio tests for projected runtimes.

Deferred:

- replacing deep runtime detail APIs that still inspect runtime context paths;
- projection records for turns, approvals, artifacts, and memory pages beyond
  the existing bounded ref projections;
- live relay/git distributed smoke proving the projection with real processes.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/studio lint`
- `pnpm typecheck`
- `pnpm lint`
- `git diff --check`
- active stale local-product naming search.

Verification record:

- targeted typechecks for types, Host, CLI, and Studio passed;
- targeted tests for types, Host, CLI, and Studio passed;
- targeted lint for types, Host, CLI, and Studio passed;
- root typecheck passed;
- root lint passed;
- `git diff --check` passed;
- active stale local-product naming search returned no matches.

## Migration/Compatibility Notes

`HostProjectionSnapshot` now has a defaulted `runtimes` array. Existing JSON
payloads without that field still parse through the schema default. Existing
observed runtime records remain compatible because `runnerId` and
`assignmentId` are optional.

The runtime projection intentionally avoids `contextPath`, `runtimeRoot`, and
workspace paths. Public runtime inspection responses now also omit
`contextPath`; Host keeps that value only as private process state for the
remaining detail readers and explicit context inspection/debug routes.

## Risks And Mitigations

- Risk: projection could omit runtime observations if no active graph is loaded.
  Mitigation: runtime projection now unions active graph nodes, observed runtime
  records, and active assignment records.
- Risk: projected desired state can be inferred when no runtime intent exists.
  Mitigation: the record source marks whether the row came from an observation,
  control assignment, or desired state, and missing observations are reported as
  `observedState: "missing"`.
- Risk: Studio shows two runtime surfaces while migration is incomplete.
  Mitigation: the federation panel clearly uses projection data; the detailed
  runtime inspector remains the existing Host runtime API until deep APIs are
  replaced by projection-backed records.

## Open Questions

No product question blocks this slice. The next implementation decision is how
aggressively to replace deep runtime inspection endpoints versus adding a
distributed smoke first to prove the current federated control loop.
