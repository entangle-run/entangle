# Projected Turn Read API Slice

## Current Repo Truth

Runner `turn.updated` observations already reached Host and drove typed
`runner.turn.updated` events, but runtime turn list/detail APIs still read only
runner-local turn files through `runtimeRoot`.

That meant remote turn activity could appear in Host events and projected
session detail, while `/v1/runtimes/:nodeId/turns` and
`/v1/runtimes/:nodeId/turns/:turnId` remained local-filesystem backed.

## Target Model

Turn read APIs should merge observed turn projection with local compatibility
turn files. Local files remain preferred when present, but a signed
`turn.updated` observation carrying a full bounded turn record should be enough
for read-only turn list/detail.

## Impacted Modules/Files

- `packages/types/src/runtime/activity-observation.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Persist the full bounded runner turn record on observed turn activity
  records.
- Add projected turn record listing scoped to active graph id and node id.
- Merge projected turn records with local runtime turn files, with local files
  winning on id collisions.
- Allow turn list/detail GET routes to use projection even when a runtime has no
  local context.
- Extend Host tests for projected turn list/detail.

## Tests Required

- Type schema tests and typecheck.
- Host turn list/detail tests from observed projection.
- Host lint/build.
- Federated process-runner smoke.

## Migration/Compatibility Notes

Existing observed turn activity records without embedded `turn` still parse,
but only records with the full turn can back projected turn APIs. Filesystem
compatibility synchronization now enriches observed turn activity with the full
turn record.

## Risks And Mitigations

- Risk: projected turn detail is less complete than future richer execution
  telemetry.
  Mitigation: this slice reuses the existing bounded `RunnerTurnRecord`
  contract and does not expose raw engine prompts or logs.
- Risk: stale projected turns could appear after graph replacement.
  Mitigation: projected turn reads are scoped to the active graph id and node id.

## Open Questions

- Should future turn projection include replay cursors or event ids so Host can
  explain exactly which signed observation last updated each turn record?
