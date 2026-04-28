# Projected Source Candidate Read API Slice

## Current Repo Truth

Runner turns already create durable `SourceChangeCandidateRecord` files when
OpenCode or another engine changes the source workspace. Joined runners also
publish `source_change.ref` observations with candidate id, status, artifact
refs, and bounded source-change summary.

Before this slice, the full source-change candidate record stayed only in the
runner-local filesystem. Host projection could show summary evidence through
`/v1/projection`, but `GET /v1/runtimes/:nodeId/source-change-candidates` and
`GET /v1/runtimes/:nodeId/source-change-candidates/:candidateId` still required
Host-readable runtime context.

## Target Model

Source-change candidate list/detail reads should work from signed observations
for remote runners. The runner should publish the full bounded
`SourceChangeCandidateRecord` when it owns one, and Host should store that
record in projection.

Operations that mutate or deeply inspect source state remain separate:
diff/file preview, review, apply, source-history, and publication still require
local context or a future backend resolver because they touch source snapshots,
shadow git state, approval gates, or workspace mutations.

## Impacted Modules/Files

- `packages/types/src/protocol/observe.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/runner/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/222-current-state-codebase-audit.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `candidate` to `source_change.ref` observation payloads.
- Validate that an included candidate matches payload `candidateId`, `graphId`,
  `nodeId`, and `status`.
- Add optional `candidate` to source-change projection records.
- Publish the full runner-owned candidate record in joined-runner
  `source_change.ref` observations.
- Persist projected candidate records during Host observation ingestion.
- Merge projected candidates with same-machine local candidate records in
  runtime source-change candidate list/detail APIs, with local records winning
  when both exist.
- Keep source-change diff/file preview/review/apply endpoints local-context
  backed for now.

## Tests Required

- Types typecheck and protocol tests.
- Host typecheck and source-change candidate API tests.
- Runner typecheck and tests.
- Lint and build for touched packages.
- Federated process-runner smoke.

## Migration/Compatibility Notes

The new `candidate` field is optional, so older runners that only publish
summary-level `source_change.ref` events remain accepted. Those older events
continue to appear in `/v1/projection`; only full candidate list/detail reads
require the new projected candidate payload.

Existing same-machine candidate files remain supported and override projected
records by candidate id so local review/apply state remains authoritative in
the compatibility profile.

## Risks And Mitigations

- Risk: candidate records expose more source-change metadata than summary-only
  refs.
  Mitigation: `SourceChangeCandidateRecord` is already bounded metadata and
  does not carry full source files or workspaces.
- Risk: remote review/apply appears available because list/detail works.
  Mitigation: mutation and deep inspection routes still require local context
  until a federated resolver or runner-mediated mutation protocol exists.

## Open Questions

- Should review/apply become signed User Node or Host control events sent to
  the runner instead of Host-local mutations?
- Should source-change candidate projection include the observation event id
  that last updated the record for audit UI linking?
