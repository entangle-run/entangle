# Signed User Node Messages Slice

## Current Repo Truth

After the User Node identity slice, Host materializes stable per-graph User
Node identities and exposes inspection APIs. Before this slice, session launch
still generated an ephemeral Nostr key, and there was no Host API for a Studio,
CLI, or gateway client to publish an arbitrary A2A message signed as a User
Node.

The legacy runtime approval mutation endpoint still writes runner-local
approval state directly. This slice does not remove that compatibility path or
move Studio/CLI approval controls onto the new user-node messaging API.

## Target Model

User Node messages must be signed by the selected User Node identity, not by
Host Authority and not by a throwaway launch key. Host can operate as a local
development gateway that has access to User Node key refs, while preserving the
protocol boundary:

- User Node identity signs `task.request`, `question`, `answer`,
  `approval.response`, and `conversation.close` messages;
- Host resolves graph, runtime context, relay selection, and edge permission;
- Nostr carries the private A2A message to the target node;
- Studio and CLI can later call the same Host surface instead of mutating
  runner state directly.

## Impacted Modules/Files

- `packages/types/src/host-api/sessions.ts`
- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/session-launch.ts`
- `services/host/src/session-launch.test.ts`
- `services/host/src/user-node-messaging.ts`
- `services/host/src/user-node-messaging.test.ts`
- `services/host/src/index.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add user-node message publish request/response contracts;
- restrict publishable User Node message types to human/gateway-originated A2A
  messages;
- expose `POST /v1/user-nodes/:nodeId/messages`;
- enforce an enabled outbound graph edge from the User Node to the target
  runtime before publishing;
- sign and NIP-59-wrap messages with the stable User Node key material;
- add `createHostClient().publishUserNodeMessage()`;
- make `/v1/sessions/launch` resolve stable User Node signing material instead
  of generating an ephemeral key;
- include `fromPubkey` in new session launch responses;
- add tests for message contracts, Host publishing helpers, session launch
  signing, and host-client request handling.

Deferred to later slices:

- CLI `reply`, `approve`, and `reject` commands over the new surface;
- Studio inbox/chat/approval controls over the new surface;
- inbox/outbox projection records;
- replacement of legacy runtime approval mutation as canonical UI behavior;
- external User Interaction Gateway or browser/OS key custody.

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

The slice adds no new runner filesystem read path. Runtime context is still used
to discover the target node pubkey and relay profiles, which is the current
local adapter boundary and remains slated for the federated assignment
materializer/projection migration.

The local-assumption audit should classify the remaining `runtimeProfile:
"local"` and workspace paths in tests as fixtures for current local runtime
contexts, not new product assumptions.

## Migration/Compatibility Notes

The session launch API remains compatible with existing callers. New responses
may include `fromPubkey`, and old clients that ignore the field continue to
work.

The new user-node message API is additive. It should become the canonical path
for Studio and CLI reply/approval actions in the operator/user-surface slice.
Until then, the existing runtime approval mutation endpoint remains as a
pre-release compatibility path.

## Risks And Mitigations

- Risk: Host-local User Node signing is mistaken for final key custody.
  Mitigation: the API signs as the User Node identity and keeps key material
  behind secret refs; later gateways can replace Host-local custody without
  changing message semantics.
- Risk: arbitrary User Node message publishing bypasses graph policy.
  Mitigation: v1 requires an enabled outbound edge from the User Node to the
  target runtime before publishing.
- Risk: approval UX still uses the legacy mutation path.
  Mitigation: this slice creates the signed message surface required to migrate
  CLI and Studio without redesigning the protocol again.

## Open Questions

No open question blocks this slice. The next user-facing slice should decide
whether CLI/Studio should call Host-local signing first or introduce a separate
Human Interface Runtime process before replacing approval controls.
