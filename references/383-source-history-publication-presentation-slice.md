# Source-History Publication Presentation Slice

## Current Repo Truth

`382-source-history-multi-target-publication-slice.md` added durable
`SourceHistoryRecord.publications` retention while preserving `publication` as
the latest compatibility field. Host API list/detail responses already carry
the full record shape, and Studio/CLI consume shared source-history
presentation helpers from `packages/host-client`.

The remaining gap was presentation drift: shared helpers, CLI summaries, and
Studio detail output still described only the latest publication. Operators
could see that a latest publication existed, but not that the same
source-history entry had been published to multiple repository targets.

## Target Model

Source-history read surfaces should expose both:

- the latest publication summary through existing fields;
- the complete per-target publication set through shared presentation helpers.

CLI and Studio should stay aligned by using the same `host-client` formatting
logic.

## Impacted Modules And Files

- `packages/host-client/src/runtime-source-history.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/runtime-source-history.test.ts`
- `apps/cli/src/runtime-source-history-output.ts`
- `apps/cli/src/runtime-source-history-output.test.ts`
- `apps/studio/src/runtime-source-history-inspection.test.ts`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/382-source-history-multi-target-publication-slice.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes

- Added `listRuntimeSourceHistoryPublications` to shared host-client
  presentation helpers.
- Added compact per-publication presentation records with artifact id, branch,
  state, optional approval id, and resolved target label.
- Extended source-history detail lines with a `publications <count>` summary
  and one compact line per publication when more than one target exists.
- Extended CLI source-history summaries with `publicationCount`,
  `publicationTargets`, and `publishedArtifactIds`.
- Kept existing `publicationState`, `publicationTarget`, and
  `publishedArtifactId` as latest-publication compatibility fields.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/host-client test -- runtime-source-history.test.ts`
- `pnpm --filter @entangle/cli test -- runtime-source-history-output.test.ts`
- `pnpm --filter @entangle/studio test -- runtime-source-history-inspection.test.ts`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`

## Migration And Compatibility Notes

This is a read-surface presentation change only. Existing API contracts and
latest-publication summary fields remain intact.

Older records with only `publication` still present as a single publication
through the shared helper. New records with `publications` render all targets.

## Risks And Mitigations

- Risk: CLI consumers depending on compact summary shape may see new fields.
  Mitigation: fields are additive, and existing latest-publication fields are
  unchanged.
- Risk: Studio and CLI diverge again.
  Mitigation: both surfaces consume `packages/host-client` helpers rather than
  duplicating target formatting.

## Open Questions

- Should Studio eventually render publication targets as a dedicated table
  instead of detail lines?
- Should Host source-history detail add a computed `publicationTargets`
  convenience field, or keep the canonical record shape only?
