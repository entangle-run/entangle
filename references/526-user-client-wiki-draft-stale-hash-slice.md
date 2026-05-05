# User Client Wiki Draft Stale Hash Slice

## Current Repo Truth

The running User Client can load a projected wiki page preview into the page
edit form and ask the assigned runner to upsert the page through federated
control. The runner already supports `expectedCurrentSha256` for stale-edit
detection when a wiki page update is requested.

Before this slice, loading a projected wiki preview into the User Client left
the expected hash field blank. A human participant could still paste the hash
manually, but the common edit path did not automatically bind the draft to the
projected version that the participant reviewed.

## Target Model

When a User Node participant loads a projected wiki page preview for editing,
the User Client should compute the SHA-256 of the preview content and populate
the expected-current hash field automatically. The subsequent page update then
carries stale-edit protection by default while still letting the participant
clear or override the value intentionally.

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

- Add a browser-compatible UTF-8 SHA-256 helper for the User Client.
- Use that helper when projected wiki previews are loaded into the page edit
  form.
- Populate `expectedCurrentSha256` from the reviewed preview content instead of
  clearing it.
- Keep the existing manual expected-hash field editable for exceptional
  operator or participant workflows.
- Add a unit test for the SHA-256 helper.

## Tests Required

- User Client runtime API tests.
- User Client typecheck.
- User Client lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No API or schema migration is required. This is a User Client behavior
improvement over the existing wiki page upsert contract.

Existing manual page updates still work. Drafts loaded from projected previews
now default to stricter stale-edit protection.

## Risks And Mitigations

- Risk: Web Crypto is unavailable in an unusual browser environment.
  Mitigation: the UI keeps the expected-hash field editable and falls back to
  an empty value if hashing fails.
- Risk: participants may not realize the hash was derived from the reviewed
  preview. Mitigation: the field remains visible and populated in the existing
  edit form.

## Open Questions

Richer collaborative wiki merge UI is still open. This slice only makes the
current preview-to-draft path safer.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over User Client and updated docs
