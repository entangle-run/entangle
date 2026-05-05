# User Client Wiki Patch-Set Slice

## Current Repo Truth

`runtime.wiki.patch_set` already exists as a signed Host-to-runner control
command. Host API, host-client, CLI, runner join, runner service, projection,
Studio summaries, and CLI summaries can request and display runner-owned
multi-page wiki patch-sets. The running User Client could already request
single-page wiki updates through the Human Interface Runtime when a `wiki_page`
resource was visible in the selected User Node conversation, but it could not
request the multi-page patch-set command.

## Target Model

A running User Node should be able to request related wiki page updates through
the same participant-scoped Human Interface Runtime boundary used for
single-page wiki updates. The runtime must require conversation visibility for
every requested page, derive an expected base hash from visible projected wiki
previews when the client does not supply one, forward the mutation to Host with
`requestedBy` set to the stable User Node id, and return the runner command
response plus the visible wiki refs used to authorize the request.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a User Client helper for `POST /api/wiki/pages/patch-set`.
- Add a Human Interface Runtime JSON endpoint at
  `/api/wiki/pages/patch-set`.
- Validate node, conversation, page count, page content, page mode, and optional
  expected SHA-256 values before forwarding.
- Resolve each requested page through the existing selected-conversation
  `wiki_page` visibility boundary.
- Forward visible page requests to Host
  `POST /v1/runtimes/:nodeId/wiki/pages/patch-set` with the stable User Node id
  as `requestedBy`.
- Return the parsed runtime patch-set response with `source: "runtime"`,
  `userNodeId`, and the visible `wikiRefs`.

## Tests Required

- User Client runtime API helper serialization test.
- Human Interface Runtime JSON endpoint test for an allowed visible wiki page
  patch-set.
- Human Interface Runtime JSON endpoint test for hidden page rejection.
- Runner/User Client typecheck.
- Runner/User Client lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is an additive participant surface over the existing federated command. It
does not remove the single-page User Client update path, the operator
single-page path, the operator non-atomic batch path, or CLI patch-set
requests.

## Risks And Mitigations

- Risk: a User Client could attempt to update a page that was not actually
  referenced by the active conversation.
  Mitigation: the Human Interface Runtime resolves every patch-set page through
  the same conversation-scoped `wiki_page` visibility rule used by single-page
  updates before it contacts Host.
- Risk: stale edits overwrite newer runner-owned memory.
  Mitigation: the endpoint forwards explicit expected hashes when provided and
  otherwise derives a base hash from complete projected previews when
  available; the assigned runner still performs the final base-hash validation.
- Risk: clients confuse this with an operator authority path.
  Mitigation: the Host request carries `requestedBy` as the User Node id and
  the endpoint is served only by that node's Human Interface Runtime.

## Open Questions

The browser UI still needs a collaborative multi-page draft and merge workflow.
This slice only exposes the participant JSON capability needed by that UI.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit; no new relevant hits
