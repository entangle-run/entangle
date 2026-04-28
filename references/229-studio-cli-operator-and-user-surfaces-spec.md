# Studio CLI Operator And User Surfaces Spec

## Current Repo Truth

Studio and CLI are mature local Host clients.

CLI commands cover validation, package init/inspect, local backup/restore,
local doctor/diagnostics/repair, Host status/events, Host Authority, runner
registry, runtime assignments, User Node identities, signed User Node message
publication, projection-backed inbox inspection, catalog, package sources,
external principals, graph, nodes, edges, runtimes, runtime context, turns,
artifacts, memory, approvals, source candidates/history, wiki publications,
recovery, sessions, launch, and graph templates.

Studio covers Host status, federation projection summary, User Node identity
summary, projected User Node conversations, graph editing/validation/revisions/
diff, package source admission, external principals, runtime lifecycle,
runtime detail, sessions, approvals, turns, artifacts, memory, source
candidates/history, wiki publications, recovery, and event refresh.

Missing surfaces:

- transport health;
- full User Node runtime assignment workflow controls in Studio;
- rich Human Interface Runtime visibility beyond the projected runtime row;
- durable user-node inbox/outbox projection;
- Studio signed user-node task launch migration;

Recently added:

- Host projection records can include `clientUrl` from runner
  `runtime.status` observations;
- Studio shows an `Open User Client` action for projected runtimes with a
  client endpoint;
- CLI projection summaries include `clientUrl`.
- Host exposes a User Node-specific inbox API at
  `/v1/user-nodes/:nodeId/inbox`;
- CLI inbox commands now use the User Node inbox API instead of filtering the
  global projection;
- the runner-served User Client now has a conversation list, selected thread
  metadata, `/api/state`, and conversation/session-preserving message
  publishing.
- Host exposes User Node conversation detail with recorded inbound/outbound
  messages, CLI `inbox show` uses that detail endpoint, and the User Client
  renders recorded messages for the selected thread.
- User Client approval controls now render from inbound `approval.request`
  message metadata and publish signed `approval.response` messages through the
  Host User Node gateway.
- User Client approval request cards now render approval resource metadata and
  provide a server-side source-change diff preview action when the resource is
  a `source_change_candidate`.
- User Client approval request cards now render bounded projected
  source-change summaries for matching `source_change_candidate` refs before
  the explicit diff review action.
- The User Client source-change diff review page now prefers projected
  `sourceChangeSummary.diffExcerpt` evidence from Host projection and only
  falls back to the runtime-local diff endpoint when no projected excerpt is
  available.
- User Client approval responses now carry optional operation, resource, and
  reason context from the reviewed request so the signed response is
  self-describing in User Node history.
- CLI signed approval responses now have matching optional
  operation/resource/reason flags on `approve`, `reject`, and generic
  `user-nodes message` publishing.
- CLI `approve` and `reject` can now use `--from-message <eventId>` to build
  the signed response from a recorded inbound `approval.request`, preserving
  target, conversation, session, parent message, turn, and scoped approval
  context. Host now exposes direct recorded message lookup so this does not
  require scanning every conversation.
- Studio User Node overview summaries now combine identity, runtime state,
  runner placement, User Client URL, conversation counts, active counts,
  pending approval counts, unread counts, and local read markers from Host
  projection.
- CLI now exposes `entangle inbox read <conversationId> --user-node <nodeId>`
  for clearing a User Node conversation's local unread count.
- User Client message history now shows derived delivery labels for outbound
  relay publish coverage and inbound User Client receipt.
- User Client message history now renders bounded artifact refs attached to
  messages.
- User Client artifact refs now include a server-side `Preview` action that
  renders bounded Host artifact previews without exposing runtime-local source
  paths in browser output. Projection-backed artifact preview and richer
  review controls remain follow-up work.

## Target Model

Studio is the operator/admin surface:

- authority, graph, resources, policies, runner registry, assignments,
  projection health, transport health, artifacts, source, memory, and
  lifecycle;
- User Node identity/runtime health, active conversations, pending approval
  counts, and a link to open the User Client for a running User Node.

The selected User Node inbox, conversations, replies, approvals,
artifact/source/wiki review, and session/thread context belong in the User
Client exposed by the Human Interface Runtime, not in Studio.

CLI has matching headless surfaces:

- `entangle authority show`
- `entangle authority export`
- `entangle authority import`
- `entangle runners list`
- `entangle runners trust <runnerId>`
- `entangle runners revoke <runnerId>`
- `entangle assignments list`
- `entangle nodes assign <nodeId> --runner <runnerId>`
- `entangle assignments revoke <assignmentId>`
- `entangle inbox list --user-node <nodeId>`
- `entangle inbox show <conversationId> --user-node <nodeId>`
- `entangle reply <messageId> "..." --user-node <nodeId>`
- `entangle approve --user-node <nodeId> --from-message <eventId>`
- `entangle reject --user-node <nodeId> --from-message <eventId>`
- `entangle-runner join --config runner.toml`

Studio and CLI must talk to Host and user-node gateways. They must not directly
command runners. CLI may remain a development/headless user-node gateway, but
the product user surface should be the User Client launched for a running User
Node.

## Impacted Modules/Files

- `packages/types/src/host-api/*.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- CLI presentation/test helpers under `apps/cli/src`
- `apps/studio/src/App.tsx`
- Studio helpers/tests under `apps/studio/src`
- new `apps/user-client` or equivalent Human Interface client app
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/runner/src/join-service.ts`
- runner Human Interface Runtime module

## Concrete Changes Required

- Add host-client methods for authority, runners, assignments, inbox,
  conversations, replies, approvals, and projection health.
- Add CLI command groups for authority/runners/assignments/inbox/user-node
  actions. Authority, runner, assignment, User Node, projection inbox, reply,
  approve, and reject surfaces now exist; CLI signed approval responses now
  accept scoped operation/resource/reason metadata and can derive context from
  recorded approval-request messages through direct message lookup; message
  history now has the first inbound/outbound projection path.
- Add runner join executable or CLI command surface for generating join config.
- Add Studio operator panels for authority, runner registry, assignments, and
  transport/projection health. Studio now has the first projection health and
  User Node summary panel.
- Add Studio User Node runtime visibility and User Client open action. The
  first projection-derived User Node runtime summaries and `clientUrl` open
  actions are implemented; richer assignment/health panels remain open.
- Build the dedicated User Client for conversation list, message detail,
  replies, and approvals. A usable runner-served shell now has conversation
  list, selected thread metadata, recorded inbound/outbound messages, and
  reply/answer/approval publishing with scoped approval-response context plus
  projected source-change summary rendering, projected source diff excerpts
  with runtime-diff fallback, artifact-ref rendering, bounded artifact preview,
  projected wiki-ref rendering, wiki-scoped approval context rendering, and
  local read-state updates; richer wiki review actions, protocol-level read
  receipts, and the full bundled client app remain open.
- Replace user-facing approval/session launch behavior with signed user-node
  messages in the User Client. Existing Studio controls should remain operator
  controls or debug/admin tools only.
- Keep local commands under `entangle deployment` for local adapter operations.

## Tests Required

- Host-client endpoint method tests.
- CLI parser/helper and output tests for every new command group.
- Studio helper tests for authority/runner/assignment/inbox projections.
- Studio tests for User Node runtime projection and User Client endpoint
  display.
- User Client tests for state loading and selected-conversation message
  publishing. Approval request construction remains open.
- Regression tests for existing local runtime surfaces.

## Migration/Compatibility Notes

Existing `host runtimes ...` commands can remain while projection-backed
runtime APIs are introduced. New federated commands should use `runners` and
`assignments` terminology for execution placement.

Existing Studio runtime cards can be fed from projection records before their
layout is redesigned.

## Risks And Mitigations

- Risk: Studio becomes overloaded or turns into the User Node client.
  Mitigation: keep Studio operator-only and put participant workflows in the
  User Client served by the Human Interface Runtime.
- Risk: CLI command names conflict with existing host/runtimes groups.
  Mitigation: keep old local/runtime commands and add new top-level federated
  groups.
- Risk: user actions bypass policy.
  Mitigation: Host validates graph edges/policy before accepting signed
  user-node outbound events into projection or relay publication.

## Open Questions

- Should the runner join command live in `apps/cli` or as a separate
  `entangle-runner` binary wrapper? The target UX calls for a separate runner
  command, but implementation can start in the existing runner package.
