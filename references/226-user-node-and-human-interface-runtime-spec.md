# User Node And Human Interface Runtime Spec

## Current Repo Truth

User nodes exist in `nodeKindSchema` and graph specs. Validator warns when a
graph has no user node. Studio renders user nodes visually.

User nodes are now partially runtime-capable:

- Host filters them out of agent runner synchronization, but materializes
  stable User Node identities from the active graph;
- peer routes to user nodes include stable User Node pubkeys;
- session launch signs `task.request` with stable User Node key material;
- Host exposes a User Node A2A message publishing surface for local gateway
  use.
- Host maps `nodeKind: "user"` to `runtimeKind: "human_interface"` for
  runtime assignment and can assign multiple User Nodes to distinct
  `human_interface` runners.
- Host can export a portable User Node bootstrap bundle and identity secret for
  a Human Interface Runtime through the authenticated runtime bootstrap APIs.
- The joined runner starts a first-party minimal Human Interface Runtime for
  `human_interface` assignments. That runtime serves a basic User Client HTTP
  shell, exposes `/health`, and publishes messages through the Host User Node
  gateway without exposing the Host token to the browser. A runner can set
  `ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL` when the bind address is not the URL
  that Studio/CLI should show to operators.
- Runner `runtime.status` observations can carry a `clientUrl`, Host records it
  in observed runtime state, Host projection exposes it, Studio renders an open
  action, and the CLI projection summary includes it.
- Host now exposes `GET /v1/user-nodes/:nodeId/inbox`, and the runner-served
  User Client uses it instead of filtering the global projection directly. The
  client exposes `/api/state`, renders a conversation list and selected thread
  metadata, and can send messages while preserving selected conversation and
  session ids. `/api/state` now also includes the User Node runtime identity,
  Host API status, primary relay profile, relay URLs, and Host-projected status
  for its own `human_interface` runtime: assignment id, backend, client URL,
  desired/observed state, runner id, restart generation, last seen, projection
  update time, and status message. The rendered page polls `/api/state` and
  refreshes when inbox/source/wiki/runtime projection state changes. The Human
  Interface Runtime also exposes local JSON routes for selected conversation
  detail and message publishing through `GET /api/conversations/:conversationId`
  and `POST /api/messages`.
- A first dedicated `apps/user-client` Vite/React app now consumes those local
  JSON routes for runtime status, conversation inspection, message publishing,
  approval responses, artifact preview, source-change diff and file preview loading,
  source-candidate accept/reject review, and wiki preview cards.
- The Human Interface Runtime can serve dedicated User Client static assets
  from `ENTANGLE_USER_CLIENT_STATIC_DIR` while keeping `/api/*` routes dynamic.
- The Human Interface Runtime can require browser-native Basic Auth for all
  non-health routes when
  `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=username:password` is set. `/health`
  remains public for liveness probes, and the Host API bearer token remains
  server-side inside the runtime.
- Participant wiki page mutation can now include an expected current page
  SHA-256 digest. The Human Interface Runtime derives it from a visible,
  complete projected wiki preview when available, and the assigned runner
  rejects stale edits before writing runner-owned wiki state.
- Participant wiki page mutation can now request patch mode with a single-page
  unified diff, still through the Human Interface Runtime and Host-signed
  runner control path.
- The federated dev runner image now builds and bundles that dedicated app at
  `/app/user-client`, sets `ENTANGLE_USER_CLIENT_STATIC_DIR` by default, and
  the Docker launcher adapter can publish a host port plus
  `ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL` for User Node runtime contexts.
- Host now persists outbound User Node messages it publishes and exposes them
  through `GET /v1/user-nodes/:nodeId/inbox/:conversationId`; the User Client
  renders those recorded messages for the selected thread.
- The Human Interface Runtime now subscribes to A2A messages as the assigned
  User Node when identity key material is available, forwards bounded inbound
  message records to Host, and Host exposes those records through the same
  conversation detail API.
- User Node message records now preserve approval metadata, and the User Client
  renders approve/reject controls that publish signed `approval.response`
  messages as the selected User Node. Approval request cards now render
  resource metadata and link to a source-change diff preview when the request
  targets a `source_change_candidate`. The signed approval response can now
  preserve the reviewed operation, resource, and reason context. The same
  source-change cards and diff page now include signed `source_change.review`
  publishing stamped with the running User Node id. Runtime
  approval records now preserve request event id, request signer pubkey,
  response event id, response signer pubkey, and source message id when that
  signed-message lineage is available. Runners now apply approval responses
  only when the response sender node is listed in the approval record's
  approver set. Runner A2A envelopes now carry signer pubkeys where the
  transport can know them; Nostr delivery verifies the NIP-59 seal signer,
  drops seal/rumor/fromPubkey mismatches, and service handling rejects
  mismatched signer envelopes before state
  mutation. User Node inbound/outbound inbox message records now preserve
  signer pubkeys when available, and Host rejects inbound User Node message
  records whose signer differs from the payload `fromPubkey`. CLI compact
  message summaries and User Client timeline headers now expose signer audit
  state when available.
- User Client message history now shows derived delivery labels: outbound relay
  publish coverage and inbound receipt by the User Client.
- Runtime command receipts preserve optional `requestedBy` attribution. Host
  exposes `GET /v1/user-nodes/:nodeId/command-receipts`, and Human Interface
  Runtime uses that scoped route for the running User Client's participant
  command receipt list. The React User Client and fallback HTML render bounded
  receipt details, including assignment, artifact/source/wiki ids, target
  paths, replay/restore/proposal ids, session ids, and shortened wiki hash
  transitions when available.
- The User Client renders bounded artifact refs attached to message records,
  including backend, kind, summary, and locator details, and now exposes a
  server-side artifact preview page that renders bounded content without
  exposing runtime-local preview paths to the browser.
- User Client artifact and source-change routes are scoped to the selected
  conversation. Artifact preview/history/diff APIs require a conversation id
  and only resolve refs visible in that conversation. Source-change diff/review
  and file preview APIs require a conversation id and accept either an inbound
  approval request resource visible in that conversation or a Host-projected
  source-change candidate tied to the same peer session.
- The process-boundary smoke now starts one real joined agent runner and one
  real joined User Node `human_interface` runner, assigns both through the same
  control plane, verifies User Client `/health`, and proves the signed User
  Node message reaches the agent runner without shared Host/runner filesystem
  state.
- The same smoke now includes a second User Node assigned to a second
  `human_interface` runner, verifies a second User Client, and proves both User
  Nodes publish with distinct stable pubkeys.
- CLI now exposes `entangle user-nodes clients` so operators and headless users
  can discover each active User Node's projected Human Interface Runtime state,
  runner placement, assignment id, User Client URL, conversation/unread/pending
  approval counts, latest message time, and participant-requested command
  receipt counts without filtering the full projection snapshot by hand.

Still missing:

- richer projection-backed source/wiki review actions and object-backed
  artifact workflow controls;
- richer User Client review flows beyond the current source-change diff/file
  preview, signed source-change review, approval response, artifact preview,
  artifact history/diff, artifact restore, artifact source-change proposal,
  source-history publication/reconcile, wiki publication, wiki page upsert,
  stale-edit detection, patch mode, detailed participant command receipt
  visibility, and read-only runtime status projection;
- production-grade User Node key custody beyond the current Host-provisioned
  development key backend.

## Target Model

A User Node is a graph actor with stable identity.

It should be driven by a Human Interface Runtime when running. The Human
Interface Runtime exposes the User Client used by the human participant. CLI
may remain a development/headless gateway, but Studio is the operator control
room and should not become the primary User Node chat client.

User Node capabilities:

- stable Nostr pubkey;
- assignable `human_interface` runtime;
- runtime-owned User Client endpoint;
- placement on a specific runner/machine through Host assignment;
- inbox/outbox;
- conversation list;
- task launch to connected nodes;
- reply/answer;
- approval/rejection;
- artifact/source-change/wiki review;
- bounded artifact preview;
- bounded source-change diff preview;
- derived delivery status;
- local conversation read state;
- per-node policy and edge constraints;
- multiple user nodes in one graph.

Host Authority is not the User Node. Operator identity is not the User Node.

## Impacted Modules/Files

- `packages/types/src/graph/graph-spec.ts`
- `packages/types/src/runtime/runtime-identity.ts`
- `packages/types/src/protocol/a2a.ts`
- new `packages/types/src/user-node/*.ts`
- `packages/types/src/host-api/sessions.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/validator/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/session-launch.ts`
- `services/runner/src/service.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/assignment-materializer.ts`
- `services/runner/src/human-interface-runtime.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`
- `apps/user-client`

## Concrete Changes Required

- Add `UserNodeIdentityRecord` and key-ref contracts. Done for the current
  Host-provisioned development key backend.
- Add Host APIs for listing user-node identities and projected inbox state.
  Basic identity, User Node-specific projected conversation inbox surfaces,
  inbound/outbound message history, server-side artifact preview, and
  source-change diff preview now exist. Signed approval responses now preserve
  scoped operation/resource context when the User Client has it, and
  source-candidate review controls now publish signed `source_change.review`
  messages as the running User Node. The Human Interface Runtime also
  exposes local JSON APIs for selected conversation detail and message
  publishing, preparing the same runtime boundary for a bundled user client.
- Map `nodeKind: "user"` to `runtimeKind: "human_interface"` for assignment.
  Done.
- Add a User Interaction Gateway/Human Interface Runtime service boundary that
  can sign as a user node. A minimal runner-owned runtime now publishes through
  the Host User Node gateway; the durable gateway/read-model split remains open.
- Start a User Client when a User Node runtime is assigned and running. Done for
  the minimal runner-served shell.
- Expose User Client endpoint/health through runner observations and Host
  projection. Done through `runtime.status.clientUrl`.
- Add a dedicated User Client app distinct from Studio. Done for the first
  Vite/React app that consumes Human Interface Runtime JSON APIs.
- Add CLI User Client endpoint discovery. Done through
  `entangle user-nodes clients`, which joins User Node identity records with
  Host runtime projection and reports unassigned User Nodes explicitly.
- Add runtime-local JSON APIs for artifact/source review. Done for
  conversation-scoped artifact preview/history/diff, projection-first source
  diff, source file preview, and source-candidate review. Source-change
  diff/file/review access is scoped to the selected conversation through either
  visible approval-resource metadata or Host-projected same-session
  source-change evidence.
- Serve dedicated User Client assets from the running Human Interface Runtime.
  Done when `ENTANGLE_USER_CLIENT_STATIC_DIR` points at a built/static app
  directory, and now enabled by default in the federated dev runner image.
- Publish a browser-openable User Client URL when the Docker launcher adapter is
  used for a User Node runtime context. Done with deterministic, configurable
  host-port publication for User Node contexts.
- Keep session launch publishing signed `task.request` from the selected User
  Node identity.
- Move user-facing `reply`, `answer`, `approve`, and `reject` flows onto the
  signed User Node A2A message surface. Studio should show operator visibility
  and a link to the User Client, not own chat state. The first User Client
  approve/reject controls are implemented.
- Project inbound and outbound user-node conversations into Host read models.
  Conversation-level projection and first per-message inbound/outbound records
  exist.
- Persist outbound User Node message records. Done for Host-published messages.
- Persist inbound User Node message records. Done through the Human Interface
  Runtime relay subscriber and Host inbound intake endpoint.
- Make approval records include signer pubkey, event id, and source message id.
  Done for optional request/response lineage fields on `ApprovalRecord`.
- Add edge-route pubkeys for user-node peers.
- Add multi-user selection in Studio and CLI.

## Tests Required

- User Node identity creation/persistence tests.
- Multiple user-node graph tests.
- Human Interface Runtime assignment tests.
- Multiple Human Interface Runtime placement tests.
- User Client endpoint projection tests.
- Process smoke coverage for one assigned agent runner plus two assigned User
  Node runners.
- User Node inbox API tests.
- User Client state and selected-conversation publish tests.
- User Node conversation detail/message-history tests.
- User Node inbound relay intake tests.
- Signed user task launch tests.
- Signed reply and answer tests.
- Signed approval.response tests.
- User Client approval request/response tests.
- Rejection of Host-signed user messages.
- Inbox/outbox projection tests.
- Studio and CLI user-node surface tests.

## Migration/Compatibility Notes

For local dev, Host may initially provision a User Node key record, but the
contract must model it as User Node key material and not as Host Authority
signing. A later key backend can move user signing to the browser, OS keychain,
or a local gateway process without changing message semantics.

Existing `fromNodeId` launch requests can remain if they resolve to a stable
User Node identity before publishing. Ephemeral launch keys should be removed
from canonical behavior.

## Risks And Mitigations

- Risk: Studio becomes the source of truth for chat state.
  Mitigation: Studio remains operator-only for this boundary; the running Human
  Interface Runtime owns the User Client surface and Host only projects signed
  state.
- Risk: user-node keys are stored unsafely.
  Mitigation: use key refs and profile-specific secret storage; never expose
  private keys in Host API responses.
- Risk: approvals are mistaken for operator decisions.
  Mitigation: approval responses are signed User Node messages and Studio stays
  on inspection/assignment surfaces.

## Open Questions

- When should User Node key custody move from Host-provisioned development key
  refs to runner/local-gateway storage?
