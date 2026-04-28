# User Node Read Receipt Slice

## Current Repo Truth

Host already persisted local per-User-Node read markers and recomputed
`unreadCount`, but that state was Host projection only. Peer agents did not
receive any signed protocol signal when a human User Node read a conversation.
The A2A message contract also had no read-receipt message type.

## Target Model

Read state has two layers:

- local read markers keep the User Node inbox usable;
- optional `read.receipt` A2A messages notify the peer node through the same
  signed Nostr-backed path as replies and approvals.

The running User Client should send one read receipt when a selected
conversation had unread inbound messages before being marked read. The receipt
uses the latest inbound message as its parent context and is signed as the User
Node through Host's existing User Node gateway.

## Impacted Modules/Files

- `packages/types/src/protocol/a2a.ts`
- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/user-node-messaging.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `read.receipt` to the A2A message type contract.
- Require `parentMessageId` for read receipts.
- Allow User Node publish requests and responses to carry `read.receipt`.
- Have the User Client publish a read receipt only when the selected
  conversation had unread inbound messages.
- Keep the existing local read marker as the source of inbox read state.

## Tests Required

- Types contract tests for User Node publish requests and A2A read receipts.
- Host User Node message builder test proving read receipts keep parent
  message context and gateway metadata.
- Runner User Client test proving selecting an unread conversation marks it
  read and publishes a signed `read.receipt` request through Host.
- Typecheck and lint for changed packages.

## Migration/Compatibility Notes

Existing peers that do not special-case `read.receipt` still record it as an
ordinary non-executable A2A message. The message does not request a response
and does not carry artifacts.

## Risks And Mitigations

- Risk: refreshing the User Client could spam read receipts.
  Mitigation: the User Client only publishes when the Host inbox projection
  showed unread inbound messages before the local read marker was updated.
- Risk: local read markers and protocol receipts drift.
  Mitigation: local marker remains the inbox source of truth; receipts are
  peer-visible notification events.

## Open Questions

- Whether read receipt publishing should later be user-configurable per edge
  policy.
- Whether peers should project explicit read-receipt status in their own
  conversation records.
