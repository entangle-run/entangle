# User Client Message Delivery State Slice

## Current Repo Truth

User Node message records already contain `publishedRelays` and `relayUrls` for
outbound messages. Inbound records are written when the Human Interface Runtime
receives and forwards an A2A message to Host.

Before this slice, the User Client rendered message direction and type but did
not expose any delivery/read state in the message history.

## Target Model

The User Client should make message delivery status visible to the human graph
participant. The first useful state can be derived from existing message
records:

- outbound messages show relay publish coverage;
- inbound messages show that the User Client has received the message.

Local per-User-Node conversation read markers were added later in
[278-user-node-local-read-state-slice.md](278-user-node-local-read-state-slice.md).
Protocol-level read receipts remain a later feature.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- render outbound relay publish coverage in User Client message history;
- render inbound User Client receipt state in message history;
- test the new delivery labels in the existing Human Interface Runtime page
  test.

Deferred:

- protocol-level read receipts;
- per-device/per-client read state beyond the current shared User Node marker;
- delivery failure/retry history beyond current relay publish results.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- runner typecheck passed;
- runner focused test command passed with all runner test files;
- runner lint passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is a presentation-only change. No schema changes or migration are needed.

## Risks And Mitigations

- Risk: derived delivery labels overstate protocol guarantees.
  Mitigation: labels are intentionally narrow: outbound relay publish coverage
  and inbound receipt by the User Client, not end-user read receipts.
- Risk: no relay URLs are present.
  Mitigation: outbound messages fall back to `publish status unknown`.

## Open Questions

The next protocol question is whether read receipts should be User Node A2A
messages, observation events from Human Interface Runtime, or both.
