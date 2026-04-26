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

Still missing:

- Studio approval decisions submit operator-side mutations instead of calling
  the signed User Node message surface;
- Host approval mutation still writes local approval records;
- CLI approvals use the same legacy Host mutation path;
- there is no durable user-node inbox, outbox, or conversation projection.

## Target Model

A User Node is a graph actor with stable identity.

It may be driven by a Human Interface Runtime, a Studio gateway, a CLI gateway,
or another future client. The gateway is responsible for letting the human read
messages and sign user-node outbound messages according to policy.

User Node capabilities:

- stable Nostr pubkey;
- inbox/outbox;
- conversation list;
- task launch to connected nodes;
- reply/answer;
- approval/rejection;
- artifact/source-change/wiki review;
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
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`

## Concrete Changes Required

- Add `UserNodeIdentityRecord` and key-ref contracts.
- Add Host APIs for listing user-node identities and projected inbox state.
- Add a User Interaction Gateway service boundary that can sign as a user node.
- Keep session launch publishing signed `task.request` from the selected User
  Node identity.
- Move CLI and Studio `reply`, `answer`, `approve`, and `reject` flows onto the
  signed User Node A2A message surface.
- Project inbound and outbound user-node conversations into Host read models.
- Make approval records include signer pubkey, event id, and source message id.
- Add edge-route pubkeys for user-node peers.
- Add multi-user selection in Studio and CLI.

## Tests Required

- User Node identity creation/persistence tests.
- Multiple user-node graph tests.
- Signed user task launch tests.
- Signed reply and answer tests.
- Signed approval.response tests.
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
  Mitigation: Studio reads Host projection and sends signed messages through
  the user-node gateway.
- Risk: user-node keys are stored unsafely.
  Mitigation: use key refs and profile-specific secret storage; never expose
  private keys in Host API responses.
- Risk: approvals remain operator mutations.
  Mitigation: make approval decisions messages first, then project them.

## Open Questions

- Should the first local User Interaction Gateway be embedded in Host for dev
  convenience or run as a separate process? The architecture should permit both,
  but a separate process is cleaner for demonstrating identity separation.
