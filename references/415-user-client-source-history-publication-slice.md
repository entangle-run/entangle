# User Client Source-History Publication Slice

## Summary

This slice lets a running User Node client request runner-owned publication for
a source-history entry visible in the selected conversation.

Host, CLI, Studio, control transport, joined runners, and command receipt
projection already supported `runtime.source_history.publish`. The missing
participant path was the User Client: a human graph node could inspect and
review source-change evidence, but could not ask the owning runner to publish a
visible source-history record through the same federated Host boundary.

## Current Repo Truth

- Host exposes
  `POST /v1/runtimes/:nodeId/source-history/:sourceHistoryId/publish`.
- The runner executes source-history publication from runner-owned state and
  emits `runtime.command.receipt` plus source-history/artifact observation
  evidence.
- Host projection already carries `sourceHistoryRefs`.
- Policy resource kinds already include `source_history` and
  `source_history_publication`.
- The Human Interface Runtime already enforced selected-conversation
  visibility for source-change, artifact, and wiki participant actions.

## Target Model

Human graph participants should be able to request source-history publication
from their User Node runtime when a source-history approval/resource is visible
in their conversation. The participant route must:

- require `conversationId`, `nodeId`, and `sourceHistoryId`;
- verify an inbound visible `source_history` or `source_history_publication`
  resource in the selected User Node conversation;
- verify a matching projected `sourceHistoryRef`;
- forward through Host control, not direct runner access;
- set `requestedBy` to the stable User Node id;
- keep source publication and receipt evidence runner-owned.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
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

- Added `sourceHistoryRefs` to Human Interface Runtime and dedicated User
  Client state.
- Added `POST /api/source-history/publish` to the Human Interface Runtime.
- The route validates request body, checks selected-conversation source-history
  resource visibility, verifies matching Host projection refs, and calls Host's
  source-history publish endpoint with `requestedBy` set to the User Node id.
- The JSON route can forward an advanced optional Host
  `SourceHistoryPublicationTarget`; the dedicated UI currently requests the
  default target only.
- Added a fallback HTML form for visible source-history resource cards.
- Added `publishSourceHistory` to the dedicated User Client runtime API.
- Added source-history resource cards and publication controls to the dedicated
  User Client.
- Extended Human Interface Runtime tests for JSON and fallback HTML publication
  requests plus Host request body attribution.
- Extended the process-runner smoke with a signed builder-originated
  source-history approval request, a running User Client publication request,
  and a completed projected `runtime.source_history.publish` command receipt
  check.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 90000`
- `pnpm test`
- `pnpm typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit: no relevant hits

## Migration And Compatibility

This is additive. Existing Host, CLI, Studio, and runner source-history
publication behavior remains unchanged. The User Client route is a
conversation-scoped participant surface over the same Host command endpoint.

No Host or User Client runner-filesystem shortcut is introduced.

## Risks And Mitigations

- Risk: a User Client could request publication for source history outside its
  graph-visible conversation.
  Mitigation: the runtime requires a selected conversation with matching
  inbound source-history resource metadata and a matching projected
  `sourceHistoryRef`.
- Risk: publication policy may require an approved runner-local approval record
  in some deployments.
  Mitigation: this slice preserves Host/runner policy enforcement; the User
  Client route only requests the command and does not bypass runner approval
  validation.
- Risk: resource ids for target-specific publication differ from plain
  source-history ids.
  Mitigation: visibility accepts exact `source_history` ids and
  `source_history_publication` ids that match the established
  `<sourceHistoryId>|...` target selector shape.

## Open Questions

- Should the dedicated User Client UI expose explicit non-primary git target
  selectors, or should target-specific participant requests remain JSON/API-only
  until stronger policy UX exists?
