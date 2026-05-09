# User Client Wiki Conflict Patch Draft Slice

## Current Repo Truth

The runner already supports runner-owned wiki page `patch` mode through
unified diffs with hunk headers, and the React User Client already renders
stale-edit conflict summaries beside visible wiki page editors.

Before this slice, the User Client could load the current projected page after
a conflict, but it did not help preserve the participant's stale draft as a
runner-applicable patch against that current page. Its existing local diff was
a visual preview and did not include the `@@` hunk header required by the
runner patch parser.

## Target Model

A human graph participant should be able to recover from a visible stale-edit
wiki conflict without manually constructing a patch. When the User Client sees
both the current projected page and the participant's unsent/stale draft, it
can convert the draft into a bounded unified diff and prefill the current page
hash as the next stale-edit guard. The runner remains authoritative for patch
validation and applies the change only if context/removal lines still match.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a User Client helper that builds runner-compatible wiki patch drafts
  with `---`, `+++`, and `@@` unified-diff headers.
- Expose a `Build Patch Draft` action in the React User Client conflict block
  when a current projected page exists and the participant editor still holds
  different draft content.
- Prefill the editor with the generated patch, switch the mutation mode to
  `patch`, and set `expectedCurrentSha256` to the conflict's current page hash.

## Tests Required

- Focused User Client Vitest for runner-compatible conflict patch draft
  generation.
- User Client typecheck.
- Focused User Client ESLint for changed files.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No protocol, schema, or data migration is required. The generated patch uses
the existing runner-owned `runtime.wiki.upsert_page` patch mode and the
existing Human Interface Runtime JSON API.

## Risks And Mitigations

- Risk: the generated patch can become stale again. Mitigation: the User Client
  submits the current projected hash as `expectedCurrentSha256`, and the runner
  still validates hash and patch context before writing.
- Risk: a full-page hunk can be verbose for large wiki pages. Mitigation: this
  is a recovery draft for visible projected wiki previews; broader merge UI can
  introduce more focused hunks later.
- Risk: users may confuse visual preview diffs with applicable patches.
  Mitigation: the new helper is separate from the visual preview helper and
  includes hunk headers accepted by the runner parser.

## Open Questions

Future collaborative wiki work can add a richer three-pane merge UI, fallback
HTML parity, and explicit merge conflict visualization for simultaneous edits.

## Verification

Completed in this slice:

- Red focused User Client Vitest for `builds runner-compatible wiki patch drafts`
  failed because the helper did not exist.
- Green focused User Client Vitest for the same behavior passed after adding
  the helper.

The final slice audit also runs User Client typecheck, focused ESLint, product
naming, whitespace, changed-diff marker checks, and `git diff` review before
commit.
