# Source-History Multi-Target Publication Slice

## Current Repo Truth

`379-runner-owned-source-history-target-publication-slice.md` made
`runtime.source_history.publish` target-aware. The assigned runner could
resolve an explicit git target selector, enforce non-primary
`source_publication` approval policy, publish the source-history commit from
runner-owned state, and emit projected `artifact.ref` plus
`source_history.ref` evidence.

The remaining limitation was record shape and retry behavior. A
`SourceHistoryRecord` had only one `publication` field. Once automatic
primary-target publication wrote that field, the runner rejected any later
publication request, even when the later request targeted a different git
repository. That made the API target-aware but not truly multi-target for a
single accepted source-history entry.

## Target Model

A source-history entry can be published to multiple resolved git repository
targets:

- automatic primary publication keeps the existing artifact id shape for
  compatibility;
- explicit non-primary publication creates target-qualified artifact ids;
- the latest publication remains available through `publication` for current
  Host, CLI, and Studio read paths;
- the full target history is retained in `publications`;
- retry semantics apply per resolved target, not globally per source-history
  entry;
- Host still only requests and observes the operation through signed control
  and observation events.

## Impacted Modules And Files

- `packages/types/src/runtime/session-state.ts`
- `services/runner/src/source-history.ts`
- `services/runner/src/service.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `apps/studio/src/runtime-source-history-inspection.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `SourceHistoryRecord.publications` as a defaulted array of publication
  records.
- Kept `SourceHistoryRecord.publication` as the latest/backward-compatible
  publication summary.
- Updated runner source-history publication to resolve the target before
  checking existing publication metadata.
- Changed duplicate-publication detection from global to per resolved target.
- Preserved existing failed-publication retry behavior, now scoped to the
  matching target.
- Preserved primary artifact ids such as `source-<sourceHistoryId>`.
- Added target-qualified artifact ids for non-primary publication to avoid
  artifact record collisions.
- Added runner service coverage for publishing first to the primary target and
  then to an approved non-primary target from the same source-history entry.
- Extended the process-runner smoke to create a sibling source git repository,
  request explicit non-primary source-history publication after automatic
  primary publication, wait for projected artifact evidence, and verify the
  sibling bare git branch head.

## Tests Required

Implemented and passed so far:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/runner test -- service.test.ts`
- `pnpm --filter @entangle/studio test -- runtime-source-history-inspection.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/studio lint`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`

The process smoke passed with explicit `targeted-source-history-publication`
and `targeted-runtime-source-history-publication` assertions against a sibling
source git repository.

## Migration And Compatibility Notes

Existing source-history records that only contain `publication` remain valid.
The runner treats targetless legacy publication metadata as primary-target
metadata when matching retry or duplicate-publication checks.

Existing primary publication artifact ids are unchanged. Non-primary artifact
ids now include resolved target identity so the runner can persist one artifact
record per publication target.

The Host and user/operator surfaces can continue reading `publication` as the
latest summary. Richer multi-target presentation can read `publications` in a
future UI/API refinement without changing the runner protocol again.

## Risks And Mitigations

- Risk: legacy records without target metadata might be misclassified.
  Mitigation: targetless publication records fall back to the runtime's primary
  git repository target for matching.
- Risk: repeated publication could overwrite prior artifact evidence.
  Mitigation: non-primary artifact ids include service, namespace, and
  repository identity while primary ids remain stable.
- Risk: UI surfaces may only show the latest publication.
  Mitigation: the latest field remains intentional compatibility state; the
  full `publications` array is now available for future multi-target views.
- Risk: the smoke could pass by finding the primary artifact.
  Mitigation: the targeted source-history assertion filters by requested
  repository name and verifies that repository's branch head.

## Open Questions

- Should Host API source-history detail expose a compact per-target
  publication summary in addition to the raw record shape?
- Should Studio render all publication targets for a source-history entry, or
  keep latest publication as the default until multi-target git workflows
  mature?
