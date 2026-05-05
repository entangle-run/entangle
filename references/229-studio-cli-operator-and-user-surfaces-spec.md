# Studio CLI Operator And User Surfaces Spec

## Current Repo Truth

Studio and CLI are mature local Host clients.

CLI commands cover validation, package init/inspect, local backup/restore,
local doctor/diagnostics/repair, Host status/events, Host Authority, runner
registry, runtime assignments, User Node identities, signed User Node message
publication, projection-backed inbox inspection, catalog, package sources,
external principals, graph, nodes, edges, runtimes, runtime context, turns,
artifacts, memory, approvals, source candidates/history, projected wiki refs,
recovery, sessions, launch, and graph templates.

Studio covers Host status, federation projection summary, User Node identity
summary, projected User Node conversations, graph editing/validation/revisions/
diff, package source admission, external principals, runtime lifecycle,
runtime detail, sessions, approvals, turns, artifacts, memory, source
candidates/history, projected wiki refs, recovery, event refresh, and
federated source-history replay requests from selected source-history detail.
Federation summary also includes the projected source-history replay outcome
count. Assignment inspection now includes a Host-backed timeline, and Studio
groups projected runner receipts under assignment rows.

Missing surfaces:

- independent per-relay transport telemetry beyond the current derived
  per-relay Host status rows;
- richer participant-aware runtime reassignment workflows beyond the current
  CLI operator command and Studio prepare/timeline controls;
- richer participant-side review flows beyond the current scoped artifact,
  source-change, wiki, command-receipt, workload, and runtime-status surfaces;
- production authentication/key-custody flows for User Client access beyond
  runtime-local Basic Auth and proof-kit placeholders;

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
- Distributed proof kits can now opt into required User Client Basic Auth for
  User Node runner machines, writing env placeholders and generated start
  checks instead of putting cleartext credentials on the kit command line.
- CLI `entangle user-nodes clients --check-health` can now probe projected
  User Client `/health` endpoints from the operator machine and serialize
  successes, missing URLs, HTTP failures, or connection failures into
  `clientHealth` summaries.
- Studio User Node overview summaries now combine identity, runtime state,
  runner placement, User Client URL, conversation counts, active counts,
  pending approval counts, unread counts, local read markers, and
  participant-requested command receipt counts from Host projection.
- CLI now exposes `entangle inbox read <conversationId> --user-node <nodeId>`
  for clearing a User Node conversation's local unread count.
- User Client message history now shows derived delivery labels for outbound
  relay publish coverage and inbound User Client receipt.
- User Client message history now renders bounded artifact refs attached to
  messages.
- User Client artifact refs now include a server-side `Preview` action that
  renders bounded Host artifact previews without exposing runtime-local source
  paths in browser output. The dedicated User Client now uses the local JSON
  artifact preview route, which prefers Host projection before falling back to
  runtime preview.
- CLI now exposes `entangle user-nodes clients`, a User Node-focused endpoint
  discovery command that joins active User Node identities with Host-projected
  Human Interface Runtime state, runner placement, assignment id, `clientUrl`,
  conversation count, unread count, pending approval count, latest message
  time, participant-requested command receipt count, and failed command
  receipt count.
- Host exposes `GET /v1/user-nodes/:nodeId/command-receipts`, and both CLI
  User Node receipt inspection and Human Interface Runtime `/api/state` use
  that scoped endpoint instead of reading the full operator projection.
- Human Interface Runtime `/api/state` now includes the running User Node's
  own projected runtime status: assignment, backend, runner, desired/observed
  lifecycle state, restart generation, last-seen time, status message, and
  projected client URL.
- The React User Client and fallback HTML now render detailed participant
  command receipt lines for assignment, artifact/source/wiki ids, target paths,
  replay/restore/proposal ids, session ids, and shortened wiki hash
  transitions.
- CLI now exposes `entangle user-nodes assign <nodeId> --runner <runnerId>`,
  including optional `--revoke-existing`, as a User Node-focused wrapper around
  the Host assignment boundary.
- Studio User Node runtime rows can prepare the Host assignment form for that
  User Node and open the projected assignment timeline when an assignment id is
  known.
- Studio now has a Federation panel assignment control that offers any active
  graph node, including User Nodes, to a Host-projected trusted runner via the
  Host assignment API.
- Studio now lists projected assignment rows and can revoke active, accepted,
  offered, or revoking assignments through the Host assignment API.
- Studio now lists projected runner rows and can trust pending/revoked runners
  or revoke pending/trusted runners through the Host runner registry API.
- Studio now enriches those projected runner rows with full Host runner
  registry liveness, heartbeat, runtime-kind, engine-kind, and capacity
  summaries when the registry read is available.
- Studio assignment timeline drilldowns now join Host projection and runner
  registry evidence for compact runtime state, runner liveness/heartbeat,
  source-history count, replay count, and command receipt count, with related
  navigation to the existing runtime, runner, source-history, and command
  receipt panels.
- CLI, Studio, and the User Client wiki page mutation path can now carry
  `expectedCurrentSha256`; command receipt summaries can expose wiki page hash
  transitions when the runner completes or rejects the mutation.
- The same wiki page mutation surfaces can select patch mode, where the
  content field carries a single-page unified diff for runner-side application.
- The React User Client now offers an `Edit Page` action on visible
  `wiki_page` cards when Host projection contains a complete preview, loading
  the projected content and normalized page path into the participant update
  form as a replacement draft.
- Distributed proof profiles, generated verifier scripts, and direct verifier
  runs can now opt into `requireExternalUserClientUrls`, which rejects
  loopback or wildcard projected User Client URLs for physical multi-machine
  proof runs.
- Host status now includes bounded federated control/observe transport health,
  CLI host-status summaries include it, and Studio's Host Status panel renders
  the same Host-owned read model.
- Host now supports configured CORS for browser-based Studio development via
  `ENTANGLE_HOST_CORS_ORIGINS`, and the process-runner demo prints a Studio
  startup command with the live Host URL and operator token.
- Shared runtime inspection now includes the resolved agent engine permission
  mode; CLI runtime summaries inherit it from the shared host-client formatter,
  and Studio shows it in the selected-runtime inspector.
- Studio no longer exposes a selected-runtime session/task launch card; signed
  participant task launch belongs to User Client or CLI User Node surfaces.
- User Node inbox/outbox projection is implemented through durable Host
  message records, projected `userConversations`, inbox/conversation/message
  APIs, CLI output, and the runner-served User Client; the previous missing
  item was stale documentation.

## Target Model

Studio is the operator/admin surface:

- authority, graph, resources, policies, runner registry, assignments,
  projection health, transport health, artifacts, source, memory, and
  lifecycle;
- User Node identity/runtime health, active conversations, pending approval
  counts, engine permission posture for agent runtimes, and a link to open the
  User Client for a running User Node.

The selected User Node inbox, conversations, replies, approvals,
artifact/source/wiki review, and session/thread context belong in the User
Client exposed by the Human Interface Runtime, not in Studio.

CLI has matching headless surfaces:

- `entangle authority show`
- `entangle authority export`
- `entangle authority import`
- `entangle host catalog agent-engine list`
- `entangle host catalog agent-engine get <profileId>`
- `entangle host catalog agent-engine upsert <profileId>`
- `entangle runners list`
- `entangle runners join-config --runner <runnerId> --output runner-join.json`
- `entangle runners trust <runnerId>`
- `entangle runners revoke <runnerId>`
- `entangle assignments list`
- `entangle nodes assign <nodeId> --runner <runnerId>`
- `entangle assignments revoke <assignmentId>`
- `entangle inbox list --user-node <nodeId>`
- `entangle inbox show <conversationId> --user-node <nodeId>`
- `entangle user-nodes clients`
- `entangle user-nodes assign <nodeId> --runner <runnerId> --revoke-existing`
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
- Add CLI command groups for authority/runners/assignments/inbox/user-node.
  Done, including User Client endpoint discovery through
  `entangle user-nodes clients`.
  actions. Authority, runner, assignment, User Node, projection inbox, reply,
  approve, and reject surfaces now exist; CLI signed approval responses now
  accept scoped operation/resource/reason metadata and can derive context from
  recorded approval-request messages through direct message lookup; message
  history now has the first inbound/outbound projection path. CLI also exposes
  `host runtimes source-history-publish` as an operator request surface that
  asks the accepted federated runner assignment to publish or retry a concrete
  source-history record, and `host runtimes source-history-replay` as an
  operator request surface that asks the accepted runner to replay a concrete
  source-history record under runner-owned policy checks, instead of mutating
  runner files from Host. CLI also exposes
  `host runtimes source-history-replays` and
  `host runtimes source-history-replay-get` for inspecting observed replay
  outcomes from Host projection. CLI also exposes `assignments timeline` for
  the per-assignment lifecycle and receipt read model. CLI now exposes
  `host catalog agent-engine upsert` for Host-backed agent engine profile
  creation/update, including attached OpenCode profiles, permission mode, state
  scope, default-profile selection, dry-run request payloads, and compact
  summaries. Real profile saves now use Host's focused
  `PUT /v1/catalog/agent-engine-profiles/:profileId` route instead of applying
  a client-mutated full catalog document. The same command group also exposes
  focused `list` and `get` inspection with deterministic ordering and
  default-aware summaries.
- Add runner join executable or CLI command surface for generating join config.
  Done: `entangle runners join-config` writes validated Host-derived JSON join
  configs, and `entangle-runner join --config` is advertised by the runner
  package bin.
- Add Studio operator panels for authority, runner registry, assignments, and
  transport/projection health. Studio now has the first projection health,
  User Node summary panel, transport health row, and first-pass assignment
  offer/revoke controls. Studio source-history detail now has a federated
  replay request form mirroring the CLI request path without direct workspace
  mutation, and the federation summary includes projected replay outcome
  counts. Studio assignment rows now include grouped runner receipt summaries
  for the same assignment timeline model. Studio graph editing now also shows
  active catalog agent engine profiles with the current default marker and
  compact kind/scope/permission/endpoint detail before node assignment editing.
  The same panel can now create or update profile records through Host's
  focused profile upsert route while leaving node-level assignment as a
  separate explicit action.
- Keep Studio browser access on Host API boundaries. Done for development:
  Host has configured CORS allow-list support, preflight requests are answered
  before operator auth, and the federated dev profile allows the default Studio
  development origins.
- Add Studio User Node runtime visibility and User Client open action. The
  projection-derived User Node runtime summaries, workload counts,
  participant-requested command receipt counts, and `clientUrl` open actions
  are implemented; runtime rows can also prepare the Host assignment form and
  open assignment timelines. Richer participant-aware reassignment workflow
  controls and production health/key-custody panels remain open.
- Build the dedicated User Client for conversation list, message detail,
  replies, and approvals. A usable runner-served shell now has conversation
  list, selected thread metadata, recorded inbound/outbound messages, and
  reply/answer/approval publishing with scoped approval-response context plus
  projected source-change summary rendering, projected source diff excerpts
  with runtime-diff fallback, artifact-ref rendering, bounded artifact preview,
  projected wiki-ref rendering, projected wiki preview rendering,
  wiki-scoped approval context rendering, scoped command receipt visibility,
  participant command receipt detail, participant workload summary, own runtime
  status projection, and local read-state updates plus signed read receipts; a
  dedicated bundled
  `apps/user-client` app now exists and richer participant-side source/wiki
  review flows beyond scoped source-diff and source-file preview remain open.
- Replace user-facing approval/session launch behavior with signed user-node
  messages in the User Client. Done for Studio: the selected-runtime launch
  card was removed, and Studio controls remain operator inspection,
  assignment, topology, policy, and observability controls, not
  approval-decision controls for graph participants.
- Keep local commands under `entangle deployment` for local adapter operations.

## Tests Required

- Host-client endpoint method tests.
- CLI parser/helper and output tests for every new command group.
- Studio helper tests for authority/runner/assignment/inbox projections.
- Studio tests for User Node runtime projection and User Client endpoint
  display.
- User Client tests for state loading and selected-conversation message
  publishing, plus runner tests for engine-originated approval request
  construction and signed approval-response resumption.
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

No operator-surface question blocks the current implementation. The separate
runner process command now lives in the runner package as `entangle-runner`,
while CLI owns Host-derived join-config generation.
