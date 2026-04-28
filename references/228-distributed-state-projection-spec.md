# Distributed State Projection Spec

## Current Repo Truth

Host read models are still mostly derived from local files.

`services/host/src/state.ts` reads runtime context and then reads
`context.workspace.runtimeRoot` for sessions, conversations, approvals, turns,
artifacts, source-change candidates, source history, artifact restore/promotion
records, wiki publications, and cancellation requests. Host events are then
derived from those local records.

This works only for a same-machine compatibility profile where Host and runner
share a volume. It cannot work when Host and runner live on separate machines.

Federated projection foundations now exist for Host Authority, runner
registry/heartbeat, assignments, User Node identity, signed User Node messages,
and observed artifact/source/wiki refs. Joined agent runners now emit
`artifact.ref`, `source_change.ref`, and `wiki.ref` observations during normal
turn execution, so those projection records are no longer only test-fed.
Observed `source_change.ref` records now include bounded source-change
summaries. Observed `artifact.ref` records can now include bounded text
previews, and Host projection exposes those previews to the User Client without
reading runner disk. Observed activity records now carry a source marker so
local filesystem synchronization can prune stale local imports without deleting
records sourced from signed observations. The Host session list now also has a
projection fallback for remote sessions that have no Host-readable runner
filesystem record, and the session detail route can return bounded projected
inspection for those sessions. Runner-owned approval lifecycle changes now emit
`approval.updated` observations with bounded approval records, and Host reduces
them into observed approval activity. Runtime approval list/detail GET routes
now read from that projection as well as local compatibility files. Runtime
turn list/detail GET routes now read from observed turn projection as well as
local compatibility files. Runtime artifact list/detail GET routes now read
from observed `artifact.ref` projection as well as local compatibility files.
Runtime artifact preview GET routes now prefer local preview files when
available and otherwise fall back to bounded observed `artifact.ref` preview
content without requiring or fabricating runner-local paths.
Joined runners now include the full bounded `SourceChangeCandidateRecord` when
publishing `source_change.ref`, and Host runtime source-change candidate
list/detail GET routes can read those projected records without local runner
files. The process-runner smoke now verifies projected turn, approval, and
session read APIs after a deterministic OpenCode-adapter
task turn from a real joined runner process. Joined runners now also publish
session/conversation observations for later lifecycle transitions including
handoffs, coordination result/close, approval request/response, completion,
cancellation, and failure paths. The remaining deep runtime APIs still need to
be moved off local file reads.

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
- Continue defining projection record schemas for sessions, conversations,
  turns, approvals, source history, and transport health.
- Continue implementing Host observation ingestion with signature verification
  and event-id replay.
- Replace Host APIs that read `runtimeRoot` with projection-backed APIs.
- Preserve local file readers only behind explicit local debug/migration
  functions.
- Continue changing runner service to emit observations whenever it currently
  writes local lifecycle state. Session, conversation, turn phase, artifact ref,
  artifact ref with bounded preview, source-change ref with bounded summary, and
  wiki ref emissions now exist, including later session/conversation lifecycle
  transitions after handoffs, coordination messages, approvals, completion,
  cancellation, and failure.
- Preserve observation-event activity records during local compatibility
  synchronization and treat runtime-file imports as the only activity records
  eligible for local stale-record pruning.
- Continue replacing session, approval, turn, source, and wiki detail endpoints
  with projection-backed read models. The high-level session list and bounded
  session inspection now have projection fallbacks; approval and turn read APIs
  can read projection; artifact list/detail reads can read projected
  `artifact.ref` records; artifact preview can read bounded projected preview
  content; source-change candidate list/detail reads can read projected full
  candidate records; deeper runtime source diff/file, artifact history, wiki,
  and mutation surfaces still need projected equivalents.
- Treat `approval.updated` as the signed approval lifecycle projection feed for
  session counts and approval read APIs.
- Treat `turn.updated` as the signed runner turn projection feed for turn
  list/detail read APIs.
- Keep deterministic process smoke coverage for projected read APIs separate
  from optional live provider-backed OpenCode testing.
- Add replay and snapshot support so Host can rebuild projection.
- Add projection consistency diagnostics.

## Tests Required

- Projection reducer tests for every observation type.
- Idempotency tests for duplicate observations.
- Out-of-order assignment observation tests.
- Host API tests proving projection-backed responses.
- Runner observation emission tests, including artifact/source/wiki ref
  emissions during normal turns.
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
