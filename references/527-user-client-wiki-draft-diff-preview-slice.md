# User Client Wiki Draft Diff Preview Slice

## Current Repo Truth

The User Client can load projected wiki page previews into an editable draft,
populate the expected-current SHA-256 for stale-edit protection, and request a
runner-owned wiki page upsert through federated control.

Before this slice, the participant could edit the loaded content but did not
get a local change preview before submitting the update request.

## Target Model

Human User Nodes should be able to review the practical effect of a wiki page
draft before asking the assigned runner to mutate the node-owned wiki. A full
collaborative merge UI is still future work, but the common replace/append
draft path should expose a bounded line diff generated from the reviewed
projection and the current draft.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add User Client helpers that format runner-compatible replace and append
  preview content.
- Add a small line-diff preview helper for reviewed wiki content versus the
  current draft.
- Track the projected base content when a wiki page preview is loaded into the
  draft form.
- Render the diff preview below the existing page-update controls.
- Preserve patch mode by showing the provided patch content directly.
- Cover replace and append preview behavior in User Client tests.

## Tests Required

- User Client runtime API tests.
- User Client typecheck.
- User Client lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No Host, runner, API, or schema migration is required. The preview is a
client-side projection aid over the existing wiki page upsert command.

## Risks And Mitigations

- Risk: participants treat the local preview as proof that a later runner
  mutation cannot conflict. Mitigation: stale-edit protection still comes from
  the expected-current hash carried to the runner; the diff is only a review
  aid.
- Risk: large wiki pages make the simple diff expensive. Mitigation: projected
  previews are already bounded by the existing preview size limits.

## Open Questions

A richer collaborative wiki merge UI remains open, including conflict-focused
views and merge assistance after stale-edit rejection.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over User Client and updated docs
