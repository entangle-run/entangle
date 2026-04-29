# NIP-59 Seal Signer Verification Slice

## Current Repo Truth

The runner Nostr A2A transport had started carrying `signerPubkey` on runner
envelopes, but it initially treated the unwrapped rumor pubkey as the signer.
Inspection of the installed `nostr-tools` implementation showed that
`nip59.unwrapEvent` returns only the decrypted rumor and does not expose the
seal event signer. A malicious sender could craft a rumor whose pubkey matched
the payload `fromPubkey` while sealing it with a different key.

## Target Model

For NIP-59 A2A delivery, the authenticated sender is the seal event signer.
The runner must decrypt the gift wrap, parse and verify the seal event, decrypt
the rumor through the verified seal pubkey, and accept the A2A payload only
when:

- the seal signature is valid;
- the rumor hash matches its id;
- the rumor pubkey equals the verified seal pubkey;
- the A2A payload `fromPubkey` equals that same signer pubkey.

## Impacted Modules/Files

- `services/runner/src/nostr-transport.ts`
- `services/runner/src/nostr-transport.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/365-runner-a2a-signer-hardening-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace direct `nip59.unwrapEvent` use in runner A2A receive handling with a
  verified unwrap path that decrypts and validates the seal event.
- Set runner envelope `signerPubkey` from the verified seal signer.
- Reject mismatches between seal signer, rumor pubkey, and payload
  `fromPubkey`.
- Add coverage for a forged rumor whose pubkey and payload match each other but
  whose seal signer differs.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/nostr-transport.test.ts`

## Migration/Compatibility Notes

This only tightens the real Nostr receive path. Messages produced by the
existing Entangle Nostr A2A publisher already use the same key for rumor and
seal, so valid messages continue to pass.

## Risks And Mitigations

- Risk: third-party NIP-59 senders that produce inconsistent rumor/seal
  identity will now be dropped.
  Mitigation: Entangle requires node identity to bind to the signed sender; an
  inconsistent sender should not be accepted as an Entangle node.

## Open Questions

- The shared `@entangle/nostr-fabric` package can later expose a reusable
  verified NIP-59 unwrap helper if A2A and control/observe transports need to
  share the same lower-level implementation.
