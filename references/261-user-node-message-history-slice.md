# User Node Message History Slice

## Current Repo Truth

The User Node inbox API exposed conversation-level projection, but the User
Client could not show any durable message records. Host could publish signed
User Node messages, and runner observations could project conversations, but
the Host did not persist a User Node outbox record for messages it published.

## Target Model

The full target is a durable inbox/outbox read model built from signed User Node
messages and runner observations. This slice implements the first safe subset:
Host records the User Node messages it publishes, exposes them through a
conversation detail API, and the Human Interface Runtime renders them in the
User Client.

Inbound agent-to-user message history remained a follow-up for this slice and
is now addressed by `262-user-node-inbound-message-intake-slice.md`.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/259-user-node-inbox-client-slice.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `userNodeMessageRecordSchema`;
- added `userNodeConversationResponseSchema`;
- added Host persistence for outbound messages published through
  `/v1/user-nodes/:nodeId/messages`;
- added `GET /v1/user-nodes/:nodeId/inbox/:conversationId`;
- added `getUserNodeConversation()` to `packages/host-client`;
- changed CLI `inbox show` to use the conversation detail API and include
  message records;
- changed the Human Interface Runtime to fetch selected conversation detail and
  render recorded User Node messages;
- serialized Host runtime-status observation writes and ignored stale/equal-time
  `starting` observations that would otherwise overwrite a newer `running`
  projection during process startup;
- extended the process smoke to verify both User Node conversation detail APIs
  include the messages published during the smoke.

Deferred:

- message delivery/read state;
- parent/child message threading display;
- approval/artifact/source/wiki review message panels;
- browser-side cryptographic signing/key custody.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/host-client test -- index.test.ts`
- `pnpm --filter @entangle/cli test -- user-node-output.test.ts projection-output.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- lints for changed packages;
- process runner smoke against a live relay.

Verification record:

- focused typechecks passed for all touched packages;
- focused tests passed for all touched packages;
- package lints passed for all touched packages;
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
  passed against the federated dev relay, including
  `user-node-message-history`, `reviewer-user-node-message-history`, and
  `filesystem-isolation`.

## Migration/Compatibility Notes

The new records live under observed Host state and are additive. Existing inbox
projection responses are unchanged; conversation detail is exposed through a new
endpoint.

## Risks And Mitigations

- Risk: outbound-only message records are mistaken for full chat history.
  Mitigation: schemas include `direction`, and follow-up inbound intake now
  records agent-to-user messages separately.
- Risk: Host persistence failure after relay publication creates an inconsistent
  local outbox.
  Mitigation: current writes are schema-validated and atomic through the Host
  state writer; a later repair pass can reconcile from signed events.
- Risk: near-simultaneous runner observations regress projected runtime state.
  Mitigation: runtime-status observations are now serialized in Host state and
  stale observations no longer overwrite newer projected state.

## Open Questions

The next product decision is whether the User Client should keep a local
encrypted inbox store with only bounded Host projection, or whether Host
projection remains the canonical participant inbox for v1.
