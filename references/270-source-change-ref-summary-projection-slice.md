# Source Change Ref Summary Projection Slice

## Current Repo Truth

Runner source-change candidates already contain bounded `sourceChangeSummary`
records with file counts, additions, deletions, changed-file summaries, and
optional diff excerpts. Host projection also already stores
`sourceChangeRefs`, but before this slice the `source_change.ref` observation
payload and projection record only carried candidate id, status, and associated
artifact refs.

That shape was enough to prove a candidate existed, but not enough for Host,
Studio, CLI, or a User Client to show useful source-review metadata without
falling back to runner-local runtime detail readers.

## Target Model

Observed source-change refs should carry enough bounded metadata for projection
consumers to list and triage source candidates without reading runner-local
files:

- candidate id;
- candidate status;
- associated artifact refs;
- bounded source-change summary.

Full candidate diffs and file previews still belong behind explicit artifact,
source snapshot, or git/object-backed content fetch paths. Nostr observations
should carry summaries, not large diffs.

## Impacted Modules/Files

- `packages/types/src/protocol/observe.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/index.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/269-runner-observed-ref-emission-slice.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added optional `sourceChangeSummary` to the `source_change.ref` observation
  payload contract;
- added optional `sourceChangeSummary` to
  `SourceChangeRefProjectionRecord`;
- persisted the observed summary in Host's source-change ref reducer;
- emitted the candidate's bounded summary from the generic joined-runner
  observation publisher;
- extended type and Host projection tests to cover source-change summaries in
  observation/projection payloads.

Deferred to later slices:

- projection-backed source-change diff content fetching;
- projection-backed User Client source review cards that render these
  summaries without requiring the deep runtime diff endpoint;
- read-model replay/idempotency hardening for richer observed source refs.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/runner test -- service.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/runner typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/host test -- index.test.ts` passed;
- `pnpm --filter @entangle/runner test -- service.test.ts` passed before the
  final lint/check pass;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/runner lint` passed;
- `node --check scripts/smoke-federated-process-runner.mjs` passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

The field is optional and additive. Existing observed source-change refs remain
valid, and Host projection records created before this slice parse without a
summary.

## Risks And Mitigations

- Risk: summaries become too large for observation events.
  Mitigation: the existing `sourceChangeSummary` contract is already bounded by
  runner harvesting limits and carries summaries rather than full diffs.
- Risk: consumers mistake summary availability for full source review support.
  Mitigation: docs keep diff/file-preview migration as a separate
  projection-backed content-fetch slice.

## Open Questions

No open question blocks this slice. The next useful step is to let User Client
approval/source cards render projection summaries before calling deep diff
endpoints.
