# Projected Source Candidate Diff API Slice

## Current Repo Truth

`SourceChangeCandidateRecord.sourceChangeSummary` can carry a bounded
`diffExcerpt`, and joined runners now publish full candidate records in
`source_change.ref` observations. Host can list and inspect those projected
candidate records without reading runner-local candidate files.

Before this slice, source-change candidate diff reads still required a
Host-readable runtime context and a runner-local shadow git snapshot.

## Target Model

Source-change candidate diff reads should prefer the local shadow-git diff when
available, but should fall back to the bounded projected `diffExcerpt` for
remote runners. The projected fallback is an observation-backed summary, not a
full source snapshot.

File preview, review, apply, source-history, and publication remain
local-context backed until they move to a runner-mediated or backend-resolved
federated protocol.

## Impacted Modules/Files

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

- Remove the local-context precondition from source-change candidate diff GET.
- Keep local shadow-git diff as the preferred path when context and snapshot
  are available.
- Fall back to projected `sourceChangeSummary.diffExcerpt` when local diff is
  unavailable.
- Return an unavailable diff response for projected candidates that do not
  include a diff excerpt.
- Extend Host API tests to prove projected diff fallback.

## Tests Required

- Host typecheck.
- Host source-change candidate API tests.
- Host lint/build.
- Federated process-runner smoke.

## Migration/Compatibility Notes

Existing local diff behavior remains unchanged when a shadow git snapshot is
present. Remote runners need only emit full candidate records with
`diffExcerpt` for bounded diff visibility.

## Risks And Mitigations

- Risk: projected diff excerpts are less complete than full git diffs.
  Mitigation: the response uses the existing `truncated` flag from the source
  summary so clients can label bounded evidence correctly.
- Risk: operators confuse projected diff visibility with mutation readiness.
  Mitigation: review/apply routes remain local-context backed until a proper
  runner-mediated mutation protocol exists.

## Open Questions

- Should future source diff reads resolve object-backed patch artifacts instead
  of relying on bounded observation excerpts?
