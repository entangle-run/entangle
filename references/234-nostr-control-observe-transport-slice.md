# Nostr Control/Observe Transport Slice

## Current Repo Truth

The repository has a working NIP-59 A2A transport in
`services/runner/src/nostr-transport.ts`. It publishes and subscribes to
gift-wrapped `entangle.a2a.v1` messages by runtime context relay profiles.

Federated control and observation are not wired yet. Slice 1 added
`entangle.control.v1` and `entangle.observe.v1` payload schemas, and Slice 2
added Host Authority signing material. No shared Host-runner Nostr fabric yet
signs, verifies, wraps, unwraps, publishes, subscribes, or deduplicates
control/observe events.

## Target Model

Control and observation events use the same relay/gift-wrap substrate as A2A
but with separate protocol domains:

- Host Authority signs `entangle.control.v1` events for runner recipients.
- Runners sign `entangle.observe.v1` events for the Host Authority recipient.
- NIP-59 remains the private delivery envelope.
- The signed inner event carries the typed payload, while the wrapper carries
  relay delivery.
- Consumers validate the signed inner event, payload schema, signer role,
  expected Host Authority, expected runner, payload hash, and duplicate event
  ids before accepting an event.

This slice creates transport primitives only. It does not yet implement runner
registry state, assignment lifecycle, or projection reducers.

## Impacted Modules/Files

- new `packages/nostr-fabric`
- `tsconfig.solution.json`
- `services/host/package.json`
- `services/host/tsconfig.json`
- `services/host/src/federated-nostr-transport.ts`
- `services/host/src/federated-nostr-transport.test.ts`
- `services/runner/package.json`
- `services/runner/tsconfig.json`
- `services/runner/src/federated-nostr-transport.ts`
- `services/runner/src/federated-nostr-transport.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add a shared `@entangle/nostr-fabric` workspace package;
- expose a pool-compatible Nostr fabric using `nostr-tools`;
- build signed inner Nostr events for typed control/observe payloads;
- gift-wrap signed inner events for private recipient delivery;
- unwrap, verify, parse, role-check, and hash-check incoming events;
- deduplicate accepted control/observe event ids;
- expose Host wrapper methods for publishing control and subscribing to
  observations;
- expose runner wrapper methods for subscribing to control and publishing
  observations;
- add tests for signing, wrapping, unwrapping, wrong-domain rejection,
  wrong-signer rejection, expected identity rejection, and dedupe.

## Tests Required

- `pnpm --filter @entangle/nostr-fabric test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/nostr-fabric lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/nostr-fabric typecheck` passed;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/runner typecheck` passed;
- `pnpm --filter @entangle/nostr-fabric test` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/runner test` passed;
- `pnpm --filter @entangle/nostr-fabric lint` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm --filter @entangle/runner lint` passed;
- `pnpm typecheck` passed.
- `git diff --check` passed;
- `CI=1 TURBO_DAEMON=false pnpm verify` passed root lint and root typecheck,
  then hung in the Turbo aggregate test phase while running
  `@entangle/runner:test`; it was stopped after direct runner tests had already
  passed for this slice.

## End-Of-Slice Audit

The mandatory local-assumption search was run before commit:

```bash
git diff -U0 | rg "^\+.*(runtimeProfile.*single-machine|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

Classified hits:

- the command block itself is an audit record, not product behavior;
- `effective-runtime-context.json` appears only in this document as a
  migration compatibility note describing existing behavior that later slices
  must replace.

No invalid local-only runtime assumptions were added by the implementation.

## Migration/Compatibility Notes

This slice is additive. Existing A2A message transport remains unchanged.
Existing local runner startup still uses `effective-runtime-context.json` until
later slices rebase bootstrap and assignment. The new package is intentionally
small and protocol-specific so Host and runner can converge on one transport
fabric without changing current local runtime behavior in this slice.

## Risks And Mitigations

- Risk: NIP-59 rumors are not signature-bearing enough for audit records.
  Mitigation: the fabric signs an explicit inner Nostr event and then
  gift-wraps that signed event for delivery.
- Risk: a validly signed event from an unexpected key is accepted.
  Mitigation: unwrap helpers require expected Host Authority and/or runner
  pubkeys at the wrapper boundary.
- Risk: relay replay causes duplicate processing.
  Mitigation: subscriptions own an event-id dedupe set and skip duplicates
  before invoking callbacks.
- Risk: Host and runner wrappers drift.
  Mitigation: both wrappers delegate to the same shared package.

## Open Questions

No open question blocks this slice. Public/unwrapped observation events remain
out of scope for v1; the first implementation keeps control and observe
private through NIP-59.
