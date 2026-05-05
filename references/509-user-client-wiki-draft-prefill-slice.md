# User Client Wiki Draft Prefill Slice

## Current Repo Truth

The running User Client already renders projected `wiki.ref` cards for wiki
resources visible in the selected User Node conversation. Participant wiki page
updates travel through the Human Interface Runtime, Host-signed
`runtime.wiki.upsert_page` commands, runner-owned wiki state, signed
`wiki.ref` observations, and participant-scoped command receipts.

Before this slice, a participant could see a projected wiki page preview and
request a page update, but had to manually copy the visible page content and
path into the update form before editing it.

## Target Model

The User Client should make the running User Node's memory/wiki review loop
practical without turning the participant surface into Studio. When a complete
projected wiki page preview is visible to the conversation, the User Client can
load that preview into the participant draft form for a replacement edit.

The mutation boundary remains unchanged: the browser still calls the local
Human Interface Runtime JSON API, the runtime forwards a User Node-scoped
request to Host, Host signs the runner control command, and the assigned
runner validates and writes its own wiki state.

## Impacted Modules/Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a small User Client helper that turns a complete projected wiki preview
  into a page draft with normalized path and content.
- Render an `Edit Page` action on visible wiki page cards when a complete
  preview exists and the current approval resource allows page mutation.
- Load the projected content into the update form as a replace draft without
  exposing runner-local paths or adding a direct Host filesystem read.
- Keep the update form stable by making the wiki textarea full-width in the
  participant action row.
- Cover draft extraction with a User Client helper test, including rejection of
  truncated previews.

## Tests Required

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

No data migration is required. Existing User Client wiki update requests and
Human Interface Runtime APIs are unchanged. The draft action appears only when
projection already contains a complete, visible wiki page preview.

## Risks And Mitigations

- Risk: participants edit stale content.
  Mitigation: this slice only preloads visible projected content; the existing
  optimistic concurrency path still lets the Human Interface Runtime derive the
  expected current hash from complete projected previews, and the runner still
  rejects stale writes.
- Risk: a repository-level wiki card exposes an edit affordance without a page
  mutation boundary.
  Mitigation: the React action is shown only for `wiki_page` approval
  resources.
- Risk: truncated previews become accidental replacement drafts.
  Mitigation: the helper refuses truncated preview content.

## Verification

Completed for this slice:

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers; the only hits
  were unchanged valid Docker launcher-adapter references in canonical docs

## Open Questions

No product question blocks this participant wiki-draft usability improvement.
