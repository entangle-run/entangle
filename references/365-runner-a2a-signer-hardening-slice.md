# Runner A2A Signer Hardening Slice

## Current Repo Truth

Runner A2A envelopes carried the inner event id, received time, and parsed
message payload. Runtime approval records could preserve request/response
signer fields, but the runner used the message-declared `fromPubkey` as the
signer because the transport did not expose the unwrapped Nostr rumor signer.

The Nostr transport already unwraps NIP-59 gift wraps. Follow-up inspection of
`nostr-tools` showed that direct `nip59.unwrapEvent` exposes the decrypted
rumor but not the verified seal signer, so the runner receive path now uses a
manual verified unwrap flow before setting envelope signer metadata. In-memory
tests and local service calls do not have a cryptographic envelope, but they
can still carry an explicit signer field for service-level validation.

## Target Model

Every inbound runner envelope should carry the signer pubkey when the transport
knows it. A2A message handling should reject envelopes whose signer pubkey does
not match the payload's `fromPubkey`. Approval lineage should use the envelope
signer when available, falling back only for compatibility with old
in-process/test envelopes that did not carry signer metadata.

## Impacted Modules/Files

- `services/runner/src/transport.ts`
- `services/runner/src/nostr-transport.ts`
- `services/runner/src/nostr-transport.test.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `services/runner/src/test-fixtures.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `signerPubkey` metadata to runner inbound/published envelopes.
- Populate `signerPubkey` from the verified NIP-59 seal signer and local
  in-memory transport publishes.
- Drop Nostr A2A events whose verified seal signer, rumor pubkey, and
  message-declared `fromPubkey` do not all match.
- Reject direct service envelopes with mismatched `signerPubkey` before runtime
  state mutation.
- Stamp approval request/response signer lineage from the envelope signer when
  available.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/nostr-transport.test.ts src/service.test.ts`
- `pnpm verify`

Verification note for this slice: `pnpm verify` reached the turbo runner test
phase twice and then stalled with no runner test output. The equivalent split
verification passed with `pnpm lint`, `pnpm typecheck`, `pnpm turbo run test
--concurrency=1 --filter='!@entangle/runner'`, and `pnpm --filter
@entangle/runner test`.

## Migration/Compatibility Notes

The `signerPubkey` field is optional on `RunnerInboundEnvelope` so old
in-process tests and local compatibility callers can still build envelopes.
Nostr transport envelopes always include it. Service validation only enforces
the signer check when the field is present.

## Risks And Mitigations

- Risk: a compatibility caller can omit `signerPubkey` and still rely on
  `fromPubkey`.
  Mitigation: this is limited to local/direct envelopes; the real Nostr path now
  always supplies and enforces signer metadata.
- Risk: adding signer metadata to published in-memory envelopes changes test
  snapshots.
  Mitigation: runner tests assert message behavior instead of exact whole
  envelope shape, and targeted runner tests cover the new field.

## Open Questions

- Host-recorded User Node inbound message records could later persist
  `signerPubkey` as a first-class inbox/audit field, mirroring runner approval
  lineage beyond approval-specific records.
