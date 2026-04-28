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
  session ids.
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
  preserve the reviewed operation, resource, and reason context.
- The User Client renders bounded artifact refs attached to message records,
  including backend, kind, summary, and locator details, and now exposes a
  server-side artifact preview page that renders bounded content without
  exposing runtime-local preview paths to the browser.
- The process-boundary smoke now starts one real joined agent runner and one
  real joined User Node `human_interface` runner, assigns both through the same
  control plane, verifies User Client `/health`, and proves the signed User
  Node message reaches the agent runner without shared Host/runner filesystem
  state.
- The same smoke now includes a second User Node assigned to a second
  `human_interface` runner, verifies a second User Client, and proves both User
  Nodes publish with distinct stable pubkeys.

Still missing:

- the current User Client is a first usable runner-served shell, not the final
  dedicated app with richer source/wiki review actions, projection-backed
  artifact/source preview, and richer artifact/source workflow controls;
- Studio approval decisions still include operator-side mutation paths for
  admin/debug compatibility even though User Client approval responses now use
  signed User Node protocol behavior;
- Host approval mutation still writes local approval records.

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
- new `apps/user-client` or equivalent Human Interface client app

## Concrete Changes Required

- Add `UserNodeIdentityRecord` and key-ref contracts. Done for the current
  Host-provisioned development key backend.
- Add Host APIs for listing user-node identities and projected inbox state.
  Basic identity, User Node-specific projected conversation inbox surfaces,
  inbound/outbound message history, server-side artifact preview, and
  source-change diff preview now exist. Signed approval responses now preserve
  scoped operation/resource context when the User Client has it.
- Map `nodeKind: "user"` to `runtimeKind: "human_interface"` for assignment.
  Done.
- Add a User Interaction Gateway/Human Interface Runtime service boundary that
  can sign as a user node. A minimal runner-owned runtime now publishes through
  the Host User Node gateway; the durable gateway/read-model split remains open.
- Start a User Client when a User Node runtime is assigned and running. Done for
  the minimal runner-served shell.
- Expose User Client endpoint/health through runner observations and Host
  projection. Done through `runtime.status.clientUrl`.
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
- Risk: approvals remain operator mutations.
  Mitigation: make approval decisions messages first, then project them.

## Open Questions

- Should the first User Client app be named `apps/user-client` or
  `apps/human-interface`?
- Should the first Human Interface Runtime serve the client directly from the
  runner process or launch a separate child process?
- When should User Node key custody move from Host-provisioned development key
  refs to runner/local-gateway storage?
