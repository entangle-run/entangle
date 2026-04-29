# User Client Wiki Target Visibility Slice

## Summary

This slice tightens User Client wiki publication requests when the selected
conversation exposes a target-specific wiki publication resource.

The running User Client could already request runner-owned wiki publication for
wiki resources visible in a User Node conversation, but the visibility check
proved only that a generic wiki resource was present. A participant JSON request
with an explicit git target now has to match a visible
`wiki_repository_publication` resource for that same wiki ref.

## Current Repo Truth

- Host and runner wiki publication commands already accept optional git target
  selectors.
- Operator Host/CLI/Studio surfaces can request explicit wiki publication
  targets directly through the Host control boundary.
- The Human Interface Runtime already scopes User Client wiki publication
  requests to the selected conversation before forwarding them to Host.
- The dedicated User Client already renders wiki publication controls for
  visible wiki approval resources.

## Target Model

If a User Client wiki publication request includes a git target, the selected
User Node conversation must contain a matching
`wiki_repository_publication` resource encoded as:

`<wikiResourceId>|<gitServiceRef>|<namespace>|<repositoryName>`

Generic `wiki_repository` and `wiki_page` resources still allow default wiki
publication requests, but they do not grant arbitrary target publication
through the participant route.

The dedicated User Client should derive the target from the visible approval
resource and pass it to the runtime JSON route. The fallback Human Interface
Runtime page remains read-oriented for wiki refs in this slice.

## Impacted Modules And Files

- `packages/types/src/common/policy.ts`
- `packages/types/src/index.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/wiki-repository.ts`
- `services/runner/src/wiki-repository.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Add `wiki_repository_publication` as a policy approval resource kind.
- Parse target-specific wiki resource ids inside the Human Interface Runtime.
- Require User Client wiki publication requests with a target to match a
  visible `wiki_repository_publication` resource in the selected conversation.
- Forward the matched target to Host as part of the runner-owned
  `runtime.wiki.publish` request.
- Derive and render the target in the dedicated User Client's wiki cards.
- Bound target-qualified wiki publication artifact ids with the same digest
  strategy already used by source-history publication ids, so long repository
  names still satisfy shared artifact id schema limits.
- Update runner tests to prove target forwarding and rejection of a non-visible
  wiki target.
- Update the process-runner smoke so the User Client wiki approval request
  carries the same target-specific resource shape the participant publishes.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 90000`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit

## Migration And Compatibility

This is a participant-route tightening, not a protocol break for Host operator
surfaces. Operator requests can still target explicit wiki repositories through
Host. User Client requests with a target now require conversation-visible target
evidence.

Because Entangle has not released publicly, this stricter participant behavior
can replace the previous generic route without a compatibility shim.

## Risks And Mitigations

- Risk: a manually written partial target selector could be rejected even
  though Host can resolve defaults.
  Mitigation: target matching treats omitted selector fields as wildcards
  against the fully encoded visible resource target.
- Risk: UI and JSON route target semantics could drift.
  Mitigation: the dedicated UI derives its target from the same encoded
  approval resource checked by the runtime route, and tests cover the JSON body.
- Risk: generic wiki resources might be misread as permission for arbitrary
  publication targets.
  Mitigation: generic resources continue to authorize default publication only;
  explicit targets require `wiki_repository_publication`.

## Open Questions

- Should future User Client wiki cards show all policy-allowed publication
  targets from graph state, or only targets explicitly sent as conversation
  approval resources?
