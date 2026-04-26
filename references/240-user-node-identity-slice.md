# User Node Identity Slice

## Current Repo Truth

User nodes already existed in graph specs as `nodeKind: "user"`, and the
federated contracts already had `UserNodeIdentityRecord` plus
`UserInteractionGatewayRecord`. Before this slice, Host did not materialize
stable User Node identities from the active graph, user-node peer routes in
runtime contexts had no peer pubkey, and Studio/CLI had no Host API surface for
inspecting user-node identity state.

Session launch and approval handling still use the older operator-side Host
mutation path. This slice does not yet convert user tasks, replies, approvals,
or rejections into signed User Node A2A messages.

## Target Model

Every user node in the graph must have a stable Nostr identity owned by the
User Node actor, separate from Host Authority identity and operator identity.
Host may provision local development key material, but the public model must
preserve the boundary:

- Host Authority signs graph, control, and assignment decisions;
- User Node identity signs human participant messages and approval responses;
- Studio and CLI act as gateways for selected User Nodes through Host-facing
  surfaces;
- agent runtime contexts can address user peers by stable pubkey.

This slice establishes the identity substrate required by the later signed
conversation and approval slice.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add Host API response contracts for user-node list and inspection surfaces;
- create Host state storage under `desired/user-node-identities`;
- provision stable per-graph, per-node Nostr key material behind
  `secret://user-nodes/<graph-node>` secret refs;
- preserve existing identity records and revoked status across graph
  reconciliation;
- materialize User Node identities during active graph synchronization;
- include User Node peer pubkeys in agent runtime edge routes;
- expose `GET /v1/user-nodes` and `GET /v1/user-nodes/:nodeId`;
- add `createHostClient().listUserNodes()` and `getUserNode()`;
- add contract, Host API, and host-client tests for the new surfaces.

Deferred to later slices:

- inbox/outbox projection records;
- gateway signing records beyond the empty inspection placeholder;
- signed task, reply, approval, and rejection messages;
- Studio and CLI user-node inbox/chat/approval UI and commands;
- remote or hardware-backed User Node key custody.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/types typecheck` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host-client typecheck` passed;
- `pnpm --filter @entangle/types test` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host-client test` passed;
- `pnpm --filter @entangle/types lint` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/host-client lint` passed;
- `pnpm typecheck` passed.

## End-Of-Slice Audit

This slice does not add Host reads from runner-local runtime files and does not
add new Docker or shared-volume assumptions. The only local state introduced is
Host-owned identity metadata and secret-ref-backed key material for the local
development custody profile.

The local-assumption audit should classify the new secret refs as identity
custody compatibility work, not a federated transport shortcut.

## Migration/Compatibility Notes

The new API is additive. Existing session launch and approval endpoints remain
available until the signed User Node conversation slice replaces them as the
canonical path.

Identity record ids are derived from graph id plus node id, so the same user
node keeps its pubkey across Host restarts and graph reconciliation. Renaming a
node id intentionally creates a new identity unless a later migration maps the
old identity record to the new node.

## Risks And Mitigations

- Risk: Host-provisioned local keys blur User Node custody.
  Mitigation: records expose `keyRef` and `publicKey`, not secret material, and
  the target model keeps remote/hardware custody open for later profiles.
- Risk: read APIs repair missing identity records.
  Mitigation: graph synchronization already provisions identities; read-time
  repair is acceptable during pre-release local development and should be
  revisited when external key custody is added.
- Risk: user-node API appears to imply full Human Interface Runtime support.
  Mitigation: this record explicitly limits the slice to identity substrate and
  routes signed conversations/approvals to the next slice.

## Open Questions

No open question blocks this slice. Later User Node runtime work should decide
how much key custody is handled by Host-managed secret refs versus a dedicated
Human Interface Runtime or external signer.
