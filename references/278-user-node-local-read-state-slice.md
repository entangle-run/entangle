# User Node Local Read State Slice

## Current Repo Truth

User Node inbox projection counted every inbound message as unread forever.
The User Client could open a conversation and render message history, but Host
had no durable read marker for the selected User Node and conversation. CLI and
Studio could display unread counts from projection, but there was no Host API or
CLI command to clear those counts.

This was not a protocol-level read receipt problem yet. It was a local user
surface usability gap: the running User Client needed to mark its own selected
thread as read without sending a message to peer agents.

## Target Model

Host keeps a per-User-Node, per-conversation read marker as Host projection
state. Projection exposes `lastReadAt` and computes `unreadCount` from inbound
messages created after that marker.

The runner-served User Client marks the selected conversation as read when the
human opens it. CLI exposes the same operation through `entangle inbox read`.
Protocol-level read receipts to peer nodes remain a later A2A feature.

## Impacted Modules/Files

- `packages/types/src/projection/projection.ts`
- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/268-user-client-message-delivery-state-slice.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `lastReadAt` to `UserConversationProjectionRecord`.
- Add Host API contracts for User Node conversation read records and responses.
- Persist User Node conversation read records under observed Host state.
- Add Host route `POST /v1/user-nodes/:nodeId/inbox/:conversationId/read`.
- Recompute projected unread counts from inbound messages newer than
  `lastReadAt`.
- Add host-client support for marking a User Node conversation read.
- Add `entangle inbox read <conversationId> --user-node <nodeId>`.
- Have the Human Interface Runtime mark a selected conversation read before
  rendering the User Client state.
- Include `lastReadAt` in Studio/CLI projection summaries where conversations
  are already displayed.

## Tests Required

- Types contract tests for `lastReadAt` and read mutation responses.
- Host API/projection test proving read markers clear unread count.
- host-client route test for the read mutation.
- runner User Client test proving selected conversation rendering calls the
  Host read endpoint.
- CLI output test proving compact summaries retain `lastReadAt`.
- Studio formatting test proving conversation inspection includes read state.

## Migration/Compatibility Notes

Existing projection records without `lastReadAt` remain valid. Conversations
without read markers keep the previous behavior of counting all inbound
messages as unread.

This slice intentionally does not create a Nostr A2A read receipt message. It
is Host projection state for the local User Node interface.

## Risks And Mitigations

- Risk: conflating local read state with federated read receipts.
  Mitigation: docs and API naming scope this as User Node inbox read state, not
  peer-visible delivery semantics.
- Risk: unread counts can be wrong if runner clocks drift.
  Mitigation: v1 uses Host-recorded message timestamps; future protocol-level
  receipts can include event ordering if needed.
- Risk: GET page rendering now has a write side effect.
  Mitigation: the side effect is scoped to the User Client selecting a
  conversation and mirrors normal messaging client behavior.

## Open Questions

- Whether protocol-level read receipts should later be A2A messages visible to
  peer nodes.
- Whether multi-device User Client deployments need per-device read markers or
  a shared per-User-Node marker.
