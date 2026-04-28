# Projected Source History Ref Slice

## Current Repo Truth

Accepted signed `source_change.review` messages are handled by the owning
runner. The runner applies accepted candidates to its source workspace, records
runner-local source history, and emits an updated `source_change.ref` with the
candidate application metadata.

Before this slice, Host could see `candidate.application` through projection,
but source-history list/detail APIs still depended on Host-readable runtime
state for the actual `SourceHistoryRecord`.

## Target Model

Source-history application is runner-owned. Host learns about applied source
history through signed `entangle.observe.v1` observations and builds a bounded
projection from those observations. Read-only source-history list/detail routes
can return projected records even when Host cannot read the runner's filesystem.

## Impacted Modules/Files

- `packages/types/src/protocol/observe.ts`
- `packages/types/src/projection/projection.ts`
- `services/runner/src/service.ts`
- `services/runner/src/index.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `apps/cli/src/projection-output.ts`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/App.tsx`
- related contract, Host, runner, CLI, and Studio tests

## Concrete Changes

- Added `source_history.ref` to the observation protocol.
- Added `sourceHistoryRefProjectionRecordSchema` and
  `HostProjectionSnapshot.sourceHistoryRefs`.
- The runner now publishes `source_history.ref` after an accepted source review
  creates or finds a source-history application.
- Host control-plane intake records `source_history.ref` observations under
  observed projection state.
- Runtime source-history list/detail routes can return projected
  `SourceHistoryRecord` entries without requiring local runtime context.
- CLI projection summaries and Studio federation metrics now include
  source-history ref counts.

## Tests Required

- Types contract coverage for `source_history.ref` and Host projection
  snapshots.
- Runner service test proving accepted source reviews publish source-history
  observations.
- Host projection/API test proving source-history list/detail can read
  projected records.
- Federated control-plane test proving signed source-history observations are
  recorded.
- CLI/Studio projection helper tests.

## Migration/Compatibility Notes

Local compatibility files are still merged when Host has a local runtime
context. Projected source-history records are sufficient for read-only remote
inspection; replay and publication mutations still require backend-resolved
source-history services or local compatibility state.

## Risks And Mitigations

- Risk: duplicated source-history records from local compatibility files and
  projection. Mitigation: list merging is keyed by `sourceHistoryId`.
- Risk: Host accepts mismatched history payloads. Mitigation: schema
  refinement requires payload graph, node, and history ids to agree.
- Risk: callers interpret projected source history as publish/replay capable.
  Mitigation: this slice only changes read paths; mutation endpoints remain
  separate and still need backend-resolved replacement.

## Open Questions

- Source-history publication should move behind a runner-owned or backend-owned
  command path instead of Host filesystem mutation.
- Source-history replay needs a federated design because replaying into a
  runner workspace cannot be performed by Host unless Host is also the runner.
