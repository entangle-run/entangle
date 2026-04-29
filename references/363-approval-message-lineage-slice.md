# Approval Message Lineage Slice

## Current Repo Truth

User Client approval responses are published as signed User Node A2A messages,
and the runner applies `approval.response` messages to local approval records.
Before this slice, `ApprovalRecord` did not carry canonical request/response
event ids, signer pubkeys, or the source message id that caused the approval
gate. That made approval state less auditable than the signed message fabric
that produced it.

## Target Model

Approval records should preserve enough signed-message lineage for operators,
Host projection, CLI, Studio, and future policy checks to trace who requested
or answered an approval and which message caused the gate. The record remains
bounded metadata: it stores Nostr event ids and signer pubkeys, not message
payload copies.

## Impacted Modules/Files

- `packages/types/src/runtime/session-state.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/runtime-approval.ts`
- `packages/host-client/src/runtime-approval.test.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `requestEventId`, `requestSignerPubkey`, `responseEventId`,
  `responseSignerPubkey`, and `sourceMessageId` fields to `ApprovalRecord`.
- Validate request and response event/signer pairs together.
- Stamp engine-created approval gates with the source inbound message id.
- Stamp inbound `approval.request` records with request event id, request
  signer pubkey, and source message id.
- Stamp applied `approval.response` records with response event id and response
  signer pubkey.
- Surface the lineage in shared approval detail formatting.

## Tests Required

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/host-client test -- src/runtime-approval.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/service.test.ts`
- `pnpm verify`

## Migration/Compatibility Notes

The new fields are optional, so existing approval records remain valid. New
records gain lineage opportunistically as runners process engine approval gates,
incoming `approval.request` messages, or incoming `approval.response` messages.

## Risks And Mitigations

- Risk: old records without lineage look less auditable than new records.
  Mitigation: optional fields preserve compatibility while new runtime paths
  fill the fields.
- Risk: signer metadata is mistaken for authorization.
  Mitigation: the fields are audit lineage only; policy authorization remains
  a separate concern.

## Open Questions

- Future policy work should decide whether approval signer pubkeys must be
  checked against configured user-node identities before state transitions.
