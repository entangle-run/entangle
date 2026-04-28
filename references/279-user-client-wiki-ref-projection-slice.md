# User Client Wiki Ref Projection Slice

## Current Repo Truth

Host projection already exposed observed `wiki.ref` records emitted by joined
agent runners. Studio could count those refs, and Host tests proved the reducer
path, but the running User Client did not render projected wiki memory for the
human User Node. A user opening a conversation could inspect report artifacts
and source-change summaries, but not the peer agent's latest wiki snapshot ref
or wiki-scoped approval context.

## Target Model

The User Client should surface node memory/wiki as projection state beside the
selected thread. For v1 this is a bounded reference view: artifact id, summary,
locator, and observation timestamp. It must not read runner-local wiki files
or imply that the wiki content is available in Nostr.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add projected `wikiRefs` to the User Client state model.
- Render a selected-thread Wiki section filtered to the peer node.
- Render matching wiki refs inside `wiki_repository` and `wiki_page` approval
  request cards.
- Display wiki artifact id, kind, content summary, locator, and observed time.
- Keep the surface projection-only; no Host runtime filesystem read or large
  wiki content transfer is added by this slice.

## Tests Required

- Runner User Client test proving `/api/state` exposes wiki refs from Host
  projection.
- Runner User Client page test proving the selected thread renders the peer
  wiki summary and locator.
- Runner User Client page test proving wiki-scoped approval requests render
  the matching projected wiki ref.
- Runner typecheck and lint.

## Migration/Compatibility Notes

Projection responses without `wikiRefs` remain valid because the Host
projection schema defaults the array. The User Client renders an empty state
when no selected peer has wiki refs.

## Risks And Mitigations

- Risk: users may expect the full wiki content to be embedded in the thread.
  Mitigation: render this as a bounded ref with locator and observed time.
- Risk: accidentally reintroducing runner-local reads through a preview action.
  Mitigation: this slice intentionally renders refs only and does not add a
  wiki preview link.

## Open Questions

- Whether the next wiki slice should publish the wiki repo as a remote git ref
  automatically, or keep publication as an explicit approval-controlled action.
- Whether User Nodes should be able to subscribe to wiki-ref updates outside a
  selected conversation.
