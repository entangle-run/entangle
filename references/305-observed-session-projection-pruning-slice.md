# Observed Session Projection Pruning Slice

## Current Repo Truth

Host still has compatibility paths that synchronize runtime activity by reading
runner-local `runtimeRoot` files through private `contextPath` state. Those
paths wrote observed session, conversation, approval, turn, and artifact
activity records, then pruned every JSON file not present in the local
filesystem scan.

That behavior was unsafe for federated runners. A remote runner can publish a
signed `session.updated`, `conversation.updated`, or `turn.updated`
observation, but Host may have no shared runner filesystem record for that
activity. A later local runtime synchronization could delete the remote
observation projection even though it was the authoritative federated signal.

## Target Model

Observed activity records must record their projection source:

- `observation_event` for runner-signed `entangle.observe.v1` events;
- `runtime_filesystem` for same-workstation compatibility imports from local
  runner files.

Local compatibility synchronization may prune stale `runtime_filesystem`
records, but it must not delete records sourced from signed observations.
Host's high-level session list should use projected session activity when no
local runtime filesystem inspection exists for that session.

## Impacted Modules/Files

- `packages/types/src/runtime/activity-observation.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `source` to observed activity schemas with a compatibility default of
  `runtime_filesystem`.
- Store the full bounded `session` record on observed session activity records
  when Host receives or imports a session observation.
- Mark records written by observe-event reducers as `observation_event`.
- Mark records written by local filesystem synchronization as
  `runtime_filesystem`.
- Replace broad activity pruning with source-aware pruning that only removes
  stale `runtime_filesystem` records.
- Add projected session-list summaries for sessions that exist only in Host
  observed activity projection.

## Tests Required

- Type contract tests for backward-compatible schema parsing.
- Host session API test proving a remote `session.updated` observation survives
  local runtime synchronization when no local session file exists.
- Host session API test coverage proving stale `runtime_filesystem` session
  activity is still pruned.
- Host and types typechecks.

## Migration/Compatibility Notes

Existing observed activity JSON without `source` parses as
`runtime_filesystem`, preserving compatibility with current same-workstation
state. Existing session activity records without embedded `session` still parse,
but projected session-list fallback requires a full session record and therefore
only applies to newly emitted or re-imported observations.

The deep session inspection endpoint still uses local runtime detail readers.
This slice moves the high-level session list one step toward projection-backed
operation without pretending that every deep-detail session API has been
federated.

## Risks And Mitigations

- Risk: preserving observation-event records can retain stale records after a
  graph changes.
  Mitigation: projected summaries are scoped to the active graph id and active
  node ids before they are surfaced.
- Risk: projected summaries have less consistency detail than local filesystem
  inspection.
  Mitigation: filesystem-backed summaries still win when local inspection data
  exists; projected summaries fill only missing federated sessions.
- Risk: source defaults hide old data origin.
  Mitigation: the default intentionally classifies old records as
  `runtime_filesystem`, the only source that local pruning may delete.

## Open Questions

- Should all observed activity records move into a dedicated ProjectionStore
  table before the multi-machine proof, or is JSON-file projection acceptable
  through the first distributed smoke?
