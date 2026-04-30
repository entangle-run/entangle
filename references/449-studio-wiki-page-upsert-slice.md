# Studio Wiki Page Upsert Slice

## Current repo truth

Host, host-client, CLI, runner, and the running User Client can request
runner-owned wiki page replacement or append through signed
`runtime.wiki.upsert_page` control events. Studio could publish a runner-owned
wiki repository snapshot but did not expose the page mutation command to graph
operators.

## Target model

Studio remains the admin/operator control room. Operators should be able to
request the same Host-owned control path that CLI uses, without acquiring
runner filesystem access:

- Studio builds a `RuntimeWikiUpsertPageRequest` from operator draft fields;
- Studio sends the request through `host-client.upsertRuntimeWikiPage`;
- Host publishes the signed control command to the accepted runner assignment;
- completion remains visible through command receipts and `wiki.ref`
  projection.

## Impacted modules and files

- `apps/studio/src/runtime-wiki-publication.ts`
- `apps/studio/src/runtime-wiki-publication.test.ts`
- `apps/studio/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete changes

- Added Studio helper draft/build/summary functions for wiki page upsert.
- Added a Runtime Memory form in Studio with page path, mode, content,
  requestedBy, reason, and optional expected current SHA-256 fields.
- [454-wiki-page-patch-mode-slice.md](454-wiki-page-patch-mode-slice.md)
  later widened the mode selector to include `patch`.
- Wired the form to `client.upsertRuntimeWikiPage` and reset/summary/error
  state consistently with existing wiki publication controls.

## Tests required

- Studio helper tests for request building and summary formatting.
- Studio typecheck/lint.
- Studio production build.

## Migration and compatibility

This is additive. The existing Studio wiki publication form is unchanged.
Studio still talks only to Host and does not command runners directly.

## Risks and mitigations

- Invalid page paths are still rejected by Host schema and the runner's stricter
  runner-local markdown path validator.
- Operator confusion between repository publication and page mutation is
  mitigated by separate request forms and separate command summaries.

## Open questions

- Studio may later use projected page context to prefill the selected memory
  page path/content; this slice keeps mutation explicit and conservative.
