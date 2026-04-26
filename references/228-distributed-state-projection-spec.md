# Distributed State Projection Spec

## Current Repo Truth

Host read models are currently derived from local files.

`services/host/src/state.ts` reads runtime context and then reads
`context.workspace.runtimeRoot` for sessions, conversations, approvals, turns,
artifacts, source-change candidates, source history, artifact restore/promotion
records, wiki publications, and cancellation requests. Host events are then
derived from those local records.

This works for Local because Host and runner share a volume. It cannot work
when Host and runner live on separate machines.

## Target Model

Host projection should be built from:

- desired graph state;
- Host Authority control events;
- runner registration state;
- runtime assignment state;
- signed runner observation events;
- signed user-node A2A events;
- artifact/source/wiki refs resolved through external backends.

ProjectionStore is the canonical Host read model for Studio, CLI, and Host API.

Runner-local filesystem remains implementation detail. The runner may store
sessions and artifacts locally, but it must publish bounded signed observations
and refs so Host can inspect global state without reading runner disk.

## Impacted Modules/Files

- `packages/types/src/runtime/activity-observation.ts`
- `packages/types/src/runtime/session-state.ts`
- `packages/types/src/runtime/runtime-state.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/host-api/sessions.ts`
- new `packages/types/src/projection/*.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/runner/src/service.ts`
- `services/runner/src/state-store.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`

## Concrete Changes Required

- Define projection record schemas for runner status, assignment status,
  sessions, conversations, turns, approvals, artifacts, source changes, source
  history, wiki refs, and transport health.
- Define observation event schemas that can update those projections.
- Implement Host observation ingestion with signature verification.
- Replace Host APIs that read `runtimeRoot` with projection-backed APIs.
- Preserve local file readers only behind explicit local debug/migration
  functions.
- Change runner service to emit observations whenever it currently writes local
  lifecycle state.
- Add replay and snapshot support so Host can rebuild projection.
- Add projection consistency diagnostics.

## Tests Required

- Projection reducer tests for every observation type.
- Idempotency tests for duplicate observations.
- Out-of-order assignment observation tests.
- Host API tests proving projection-backed responses.
- Runner observation emission tests.
- Negative tests proving Host APIs do not require runner filesystem paths in
  federated mode.

## Migration/Compatibility Notes

During migration, Host can run a compatibility importer that reads existing
local runtime roots once and emits synthetic projection records marked
`source: "local_import"`. New runtime state should flow through observations.

Existing Host API response shapes may initially keep high-level fields, but
`contextPath`, `runtimeRoot`, and local `sourcePath` fields should become
debug/local-only fields or disappear from canonical endpoints.

## Risks And Mitigations

- Risk: projection loses detail that Studio currently shows.
  Mitigation: define bounded observation payloads for every visible surface
  before replacing local file reads.
- Risk: event volume becomes large.
  Mitigation: emit summaries and refs; store large content in git/object
  backends.
- Risk: Host projection diverges from runner local truth.
  Mitigation: heartbeat includes state cursors and periodic summary hashes.

## Open Questions

- Should projection storage stay JSON-file based for the first federated slice,
  or move to SQLite before distributed smoke? JSON is simpler; SQLite gives
  better query/replay discipline.
