# User Client Wiki Conflict Receipts Slice

## Current Repo Truth

Runner-owned wiki page upsert already supports `expectedCurrentSha256`,
single-page patch mode, and command receipts carrying expected, previous, and
next page hashes. The User Client already pre-fills expected hashes and shows
local draft diffs for replace/append edits.

Before this slice, failed stale-edit receipts were visible only as generic
command receipt lines. A human participant had to infer the conflict from the
short expected and previous hashes.

## Target Model

The running User Client should present stale wiki page update failures as an
explicit participant-facing conflict state. It should keep the underlying
command receipt details while also grouping the page path, expected hash,
current hash, and command id in a dedicated conflict block.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a helper that detects failed `runtime.wiki.upsert_page` receipts whose
  expected hash differs from the runner's current page hash.
- Add formatting for a concise conflict summary.
- Render that summary in User Client command receipt cards.
- Style the conflict block as an inline warning without hiding the original
  receipt evidence.

## Tests Required

- User Client runtime API helper test for conflict detection and formatting.
- User Client targeted test, typecheck, and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No Host, runner, protocol, or stored projection schema changes are required.
The User Client only uses already-projected receipt fields.

## Risks And Mitigations

- Risk: the UI overstates non-stale failures as merge conflicts. Mitigation:
  the helper requires a failed wiki page upsert receipt and different expected
  and previous page hashes.
- Risk: receipt details become duplicated. Mitigation: the conflict block is
  grouped as an additional summary while the original detail lines remain
  visible.

## Open Questions

The next richer wiki step is an actual merge/retry workflow that can reload the
latest projected page and help compose a revised patch. This slice only makes
the existing stale-edit evidence understandable.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over User Client and updated docs
