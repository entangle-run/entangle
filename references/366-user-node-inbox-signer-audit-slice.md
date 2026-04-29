# User Node Inbox Signer Audit Slice

## Current Repo Truth

Runner A2A envelopes now carry signer pubkeys when available, and runner
handling rejects signer/fromPubkey mismatches before state mutation. The Human
Interface Runtime records inbound User Node messages through the Host API, but
the Host-facing inbound message request and durable User Node message record did
not yet preserve the envelope signer.

## Target Model

User Node inbox records should preserve signer pubkeys for inbound and outbound
messages when available. Host should reject inbound User Node message records
whose transport signer does not match the A2A payload `fromPubkey`.

This keeps the User Client inbox aligned with the same signed-message audit
model used by runner approval lineage.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/user-node-messaging.ts`
- `services/host/src/index.test.ts`
- `services/host/src/user-node-messaging.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `signerPubkey` to User Node inbound message record requests,
  publish responses, and durable message records.
- Have the Human Interface Runtime include envelope `signerPubkey` when it
  records inbound User Node messages with Host.
- Have Host reject inbound User Node message records when signer and
  `fromPubkey` differ.
- Preserve signer pubkeys on both inbound and outbound User Node message
  records.

## Tests Required

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test -- src/user-node-messaging.test.ts src/index.test.ts`
- `pnpm --filter @entangle/runner test -- src/human-interface-runtime.test.ts src/nostr-transport.test.ts`
- `pnpm typecheck`

## Migration/Compatibility Notes

The new signer field is optional in API contracts and durable records, so old
User Node message records remain readable. New Host-generated and
Human-Interface-submitted records populate the field whenever the signing
context is available.

## Risks And Mitigations

- Risk: older Human Interface runtimes may omit `signerPubkey`.
  Mitigation: Host accepts omitted signer metadata for compatibility and only
  enforces signer/fromPubkey equality when the field is present.
- Risk: inbox clients may ignore the new field.
  Mitigation: the field is additive and does not alter existing message
  presentation contracts.

## Open Questions

- Studio and CLI can later expose signer pubkeys in User Node message detail
  output if operator-facing audit display needs this field outside raw JSON.
