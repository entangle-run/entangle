# User Client Projected Source Diff Excerpt Slice

## Current Repo Truth

Joined agent runners now emit `source_change.ref` observations that can carry a
bounded `sourceChangeSummary`, including a `diffExcerpt` when the source-change
harvester captured one. Host stores that summary in projection records.

Before this slice, the User Client source-change `Review diff` page always
called the Host runtime source-change diff endpoint. That endpoint still reads
runtime-local source snapshot state, so it is not the right canonical path for
federated User Node review when Host and runner do not share a filesystem.

## Target Model

The User Client should prefer Host projection for source review whenever the
runner has already emitted enough bounded evidence. Runtime-local detail
endpoints can remain as compatibility/debug fallback until full artifact/source
content projection exists.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- the User Client source-change diff page now fetches Host projection first;
- when a matching `source_change.ref` has `sourceChangeSummary.diffExcerpt`,
  the page renders that projection excerpt and does not call the runtime diff
  endpoint;
- the previous Host runtime diff endpoint remains a fallback when no projected
  diff excerpt is available;
- runner tests now prove the projected path avoids the runtime diff endpoint.

Deferred:

- full projection/object-backed source-change file preview;
- artifact preview migration away from runtime-local Host detail endpoints;
- explicit source review artifacts containing complete diff payloads and
  hashes.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- runner typecheck passed;
- focused runner tests passed;
- runner lint passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is backward-compatible. User Clients still fall back to the existing Host
runtime diff endpoint when projection lacks a diff excerpt.

## Risks And Mitigations

- Risk: a bounded diff excerpt may be insufficient for large reviews.
  Mitigation: the page marks projection excerpts and preserves fallback until a
  complete source-review artifact path exists.
- Risk: projected diff evidence becomes stale relative to runtime detail.
  Mitigation: projection records carry observation metadata and status; the
  target model is to move full review evidence into artifact/object refs.

## Open Questions

Should accepted source-change candidates publish a dedicated complete
`source_review` artifact ref, or should the existing source-history git artifact
be the canonical review payload for full diff inspection?
