# User Client Wiki Conflict Recovery Slice

## Current Repo Truth

The running User Client already renders stale-edit wiki command receipts as
explicit conflict summaries. Wiki page cards can load complete projected page
previews into a draft and compute an `expectedCurrentSha256` guard. The same
panel can request page upserts or queue patch-set pages.

Before this slice, the conflict receipt and the editable wiki page card were
separate surfaces. A human node participant could see the failed expected/current
hashes, but had to manually find the current projected page card and load it
before retrying the edit.

## Target Model

When a visible wiki page has a failed stale-base receipt, the User Client should
surface the conflict next to the editable page controls and let the participant
load the current projected page preview as the retry draft with the current
hash already installed as the stale-edit guard.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a runtime-api helper that selects the latest wiki-page conflict summary,
  optionally scoped to a normalized page path.
- Render the matching conflict summary inside the User Client wiki resource
  editor when the selected approval resource is a wiki page.
- When a complete current projected page preview exists, expose a recovery
  button that loads that current page into the edit draft and uses the
  conflict's current hash as `expectedCurrentSha256`.
- Keep command receipts unchanged; this is a participant UX layer on top of the
  existing projection and runner-owned mutation protocol.

## Tests Required

- User Client runtime-api helper coverage for path-scoped conflict selection.
- User Client tests.
- User Client typecheck.
- User Client lint.
- User Client production build.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This slice changes only the bundled User Client source. No Host, runner,
protocol, schema, command, or projection contract changes are required. Existing
conflict receipts remain valid and continue to render in the command receipt
list.

## Risks And Mitigations

- Risk: the recovery button could load a stale projection. Mitigation: it uses
  only complete projected previews already visible to the User Node and carries
  the conflict's current hash into the next runner-enforced request.
- Risk: the page editor shows conflicts for unrelated pages. Mitigation: the
  helper normalizes paths and scopes the selected conflict to the effective page
  path when one is known.
- Risk: users confuse patch-set and single-page retries. Mitigation: the
  loaded draft still uses the existing page mode selector and patch-set queue;
  the protocol path stays explicit at request time.

## Open Questions

Future collaborative merge UI should go beyond loading the current base: it
should offer side-by-side expected/current/draft diffs and generate safe
multi-page patch-set retries.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/user-client build`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit
