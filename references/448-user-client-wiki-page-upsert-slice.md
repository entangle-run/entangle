# User Client Wiki Page Upsert Slice

## Current repo truth

After [447-runner-owned-wiki-page-upsert-slice.md](447-runner-owned-wiki-page-upsert-slice.md),
operators and CLI could ask Host to publish a signed
`runtime.wiki.upsert_page` command to the accepted runner assignment. The
running User Client still had wiki publication controls, but not a
participant-scoped page mutation path.

## Target model

A human User Node may request a wiki page mutation only through its running
Human Interface Runtime and only for a page resource visible in the selected
conversation:

- the User Client sends `/api/wiki/pages` to its local Human Interface Runtime;
- the Human Interface Runtime verifies the selected conversation contains an
  inbound `wiki_page` approval resource from the target node;
- the Human Interface Runtime normalizes the markdown page path and forwards to
  Host with `requestedBy` set to the User Node id;
- Host publishes the same signed `runtime.wiki.upsert_page` command;
- the assigned runner owns the file write, repository sync, `wiki.ref`, and
  command receipt.

The User Client never writes runner memory directly.

## Impacted modules and files

- `services/runner/src/human-interface-runtime.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/App.tsx`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.test.ts`

## Concrete changes

- Added `POST /api/wiki/pages` to the Human Interface Runtime.
- Added User Client API helper `upsertWikiPage`.
- Added User Client controls for `wiki_page` approval resources.
- Added conversation-scoped visibility checks for page path mutation.
- [453-wiki-page-optimistic-concurrency-slice.md](453-wiki-page-optimistic-concurrency-slice.md)
  later made the Human Interface Runtime derive `expectedCurrentSha256` from a
  visible complete wiki preview and forward it through Host when the User
  Client does not provide one.
- Extended the process-runner smoke to publish a synthetic `wiki_page`
  approval request, call the running User Client JSON route, and wait for the
  projected `runtime.wiki.upsert_page` receipt and `wiki.ref`.

## Tests required

- User Client runtime API helper test for `/api/wiki/pages`.
- Runner Human Interface Runtime test for conversation-scoped page mutation,
  normalized path forwarding, and `requestedBy` propagation.
- Host process-runner smoke coverage for the live User Client page mutation
  path.

## Migration and compatibility

This is additive. Existing wiki publication controls remain unchanged. The new
participant path is narrower than the operator CLI path: it requires a visible
`wiki_page` conversation resource and does not grant arbitrary repository-wide
wiki mutation.

## Risks and mitigations

- Overbroad human edits are mitigated by requiring a selected conversation and
  a visible inbound `wiki_page` resource from the target node.
- Path confusion is mitigated by normalizing leading locator slashes for the
  User Client boundary while the runner still enforces its stricter
  runner-local markdown path validator.
- Stale UI evidence is mitigated by forwarding through Host and relying on
  command receipts plus `wiki.ref` projection for completion evidence.

## Open questions

- Rich collaborative wiki editing still needs line-level patch/merge semantics;
  stale page base detection is now in place for replacement or append commands.
- User-owned personal memory/wiki mutation should be modeled separately from
  peer-node page mutation if Entangle needs private human notes.
