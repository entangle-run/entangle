# User Client Wiki Publication Slice

## Summary

This slice lets a running User Node client request wiki publication for the
agent node it is conversing with.

Studio already had an operator-facing wiki publication control. That is not the
same product surface as a human graph participant. The Human Interface Runtime
now exposes a conversation-scoped JSON route, and the dedicated User Client can
call it from wiki approval cards. The request still goes through Host, which
publishes the signed `runtime.wiki.publish` control command to the accepted
runner assignment. The Human Interface Runtime tags the request with the stable
User Node id through `requestedBy`.

## Current Repo Truth

- Host already exposes `POST /v1/runtimes/:nodeId/wiki-repository/publish`.
- Host-client, CLI, and Studio already call that Host endpoint.
- The runner owns actual wiki repository synchronization/publication after
  receiving `runtime.wiki.publish`.
- The Human Interface Runtime already projected wiki refs into User Client
  state and rendered them in the HTML/runtime views.
- The dedicated User Client could display wiki cards, but it could not ask the
  owning runner to publish the visible wiki repository.

## Target Model

A human graph participant should be able to act from the runtime attached to
its User Node, without using Studio as an admin substitute. Wiki publication
requests from that participant must:

- be scoped to the selected User Node conversation;
- require an inbound wiki approval/resource from the target node;
- use Host as the control boundary;
- preserve runner-owned execution;
- tag the request with the User Node id;
- return projected wiki refs alongside the command acknowledgement so the
  client can show exactly what evidence authorized the request.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `POST /api/wiki-repository/publish` to the Human Interface Runtime.
- The route validates `conversationId` and `nodeId`, loads the selected User
  Node conversation, requires an inbound `wiki_repository` or `wiki_page`
  approval resource from the target node, then matches that resource to
  projected wiki refs.
- The runtime forwards a Host wiki publication request with
  `requestedBy: <userNodeId>` and optional `reason`/`retryFailedPublication`.
- Added `publishWikiRepository` to the dedicated User Client runtime API.
- Added a wiki publication action to User Client wiki cards with reason and
  retry controls.
- Added unit coverage for the User Client API helper and Human Interface
  Runtime JSON route.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 90000`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist: no
  relevant hits

During root-gate verification, `validator`, `package-scaffold`, and
`host-client` fork-pool package scripts reproduced no-output hangs before the
root gate reached completion. Those packages now use the default Vitest pool
again, and the root gate passed after that correction.

## Migration And Compatibility

This is additive. Existing Host, CLI, and Studio wiki publication controls
continue to work. Existing User Client state shape is preserved; the new API
response augments Host's wiki publication acknowledgement with `source`,
`userNodeId`, and the visible `wikiRefs`.

No runner filesystem path is exposed to the User Client. The Human Interface
Runtime only uses Host projection, Host inbox reads, and Host control commands.

## Risks And Mitigations

- Risk: a User Client could request publication for a wiki it has not been
  shown.
  Mitigation: the runtime requires conversation context and a matching inbound
  wiki approval/resource before forwarding to Host.
- Risk: the action is mistaken for direct git publication from the User Client.
  Mitigation: the route only requests Host-signed runner control; runner-owned
  execution and observation remain unchanged.
- Risk: operators still need target repository selection for advanced wiki
  publication.
  Mitigation: target selection remains in admin/operator surfaces for now; this
  participant action uses the default allowed target.

## Open Questions

- Should User Node participant policy eventually allow explicit target
  selection, or should that remain admin-only?
- Should the Human Interface Runtime also expose the same action through the
  server-rendered HTML fallback, or is the dedicated User Client now the primary
  human-node client surface?
