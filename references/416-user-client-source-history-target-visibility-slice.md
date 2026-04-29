# User Client Source-History Target Visibility Slice

## Summary

This slice tightens User Client source-history publication requests when the
conversation resource is target-specific.

The previous User Client publication route could forward an optional
`SourceHistoryPublicationTarget`, but visibility checking only proved that the
source-history id appeared in the selected conversation. A human participant
could therefore request an arbitrary target through the JSON route as long as a
generic source-history resource was visible. The dedicated UI also rendered only
default-target publication controls.

## Current Repo Truth

- `source_history_publication` approval resources encode target identity as
  `<sourceHistoryId>|<gitServiceRef>|<namespace>|<repositoryName>`.
- Host and runner source-history publication commands already accept optional
  target selectors.
- The Human Interface Runtime already checks selected-conversation visibility
  before forwarding User Client source-history publication requests.
- The dedicated User Client already exposes source-history publication controls
  for visible source-history resources.

## Target Model

If a User Client request includes a source-history publication target, the
selected User Node conversation must contain a matching
`source_history_publication` resource. Generic `source_history` resources still
allow default publication requests, but they do not grant arbitrary target
publication through the participant route.

The UI and fallback HTML surface should carry the target encoded by
`source_history_publication` resources instead of silently requesting the
default target.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/package.json`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Parse `source_history_publication` resource ids into publication target
  selectors inside the Human Interface Runtime.
- Require target-specific requests to match a visible
  `source_history_publication` resource in the selected conversation.
- Render fallback HTML hidden target inputs for target-specific publication
  resources.
- Derive the same target in the dedicated User Client UI and include it in the
  JSON publication request.
- Extend Human Interface Runtime tests to prove target forwarding and rejection
  of a non-visible target.
- Update the process-runner smoke source-history approval request to use the
  target-specific resource shape that the User Client publishes.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 90000`
- `pnpm test`
- `pnpm typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit: no relevant hits

## Migration And Compatibility

This is a tightening of the participant route, not a Host or runner protocol
change. Existing operator surfaces can still request explicit publication
targets through Host. User Client requests with a target now require
conversation-visible target-specific resource evidence.

## Risks And Mitigations

- Risk: a manually written User Client JSON request with only a partial target
  selector could be rejected even though Host would resolve defaults.
  Mitigation: target matching treats omitted selector fields as wildcards
  against the fully encoded conversation resource target.
- Risk: the smoke had been using a generic `source_history` resource while
  asking for a non-primary target.
  Mitigation: the smoke now publishes the precise
  `source_history_publication` resource it asks the User Client to use.

## Open Questions

- Should future User Client UI show all eligible publication targets from
  graph policy/catalog state, or only render targets explicitly sent as
  conversation approval resources?
