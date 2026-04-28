# Nostr Event Fabric Spec

## Current Repo Truth

Entangle already uses Nostr for A2A:

- `entangle.a2a.v1` is the semantic message protocol;
- NIP-59 gift wrap kind `1059` and custom rumor kind `24159` are defined;
- runner transport subscribes by `#p` recipient pubkey;
- runner transport unwraps NIP-59 events and validates A2A payloads;
- Host session launch publishes NIP-59 A2A task requests.

The current Nostr layer lacks:

- Host Authority control events;
- runner observation events;
- runner registration events;
- assignment events;
- receipts and heartbeats;
- replay/deduplication rules for Host projection;
- signer-role validation beyond A2A payload pubkeys.

## Target Model

Use distinct protocol domains:

- `entangle.a2a.v1`: node-to-node and user-to-agent messages.
- `entangle.control.v1`: Host Authority to runner commands and assignments.
- `entangle.observe.v1`: runner to Host Authority observations, receipts, and
  heartbeats.

All domains should use typed payload schemas plus a signed event envelope.

Nostr carries:

- A2A messages;
- runner hello;
- trust receipts where appropriate;
- assignment offers and revocations;
- assignment accept/reject receipts;
- heartbeats;
- bounded lifecycle observations;
- bounded log summaries;
- artifact refs, hashes, and bounded text previews;
- source-change refs;
- wiki publication refs;
- approval requests and responses.

Nostr must not carry:

- private keys;
- full workspaces;
- full repositories;
- large artifacts;
- full logs;
- Host database snapshots;
- model caches.

## Impacted Modules/Files

- `packages/types/src/protocol/nostr-transport.ts`
- `packages/types/src/protocol/a2a.ts`
- new `packages/types/src/protocol/control.ts`
- new `packages/types/src/protocol/observe.ts`
- new `packages/types/src/protocol/signed-envelope.ts`
- `packages/validator/src/index.ts`
- `services/runner/src/nostr-transport.ts`
- `services/host/src/session-launch.ts`
- new Host Nostr transport module
- tests in `services/host` and `services/runner`

## Concrete Changes Required

- Add event domain constants and schemas.
- Add signed envelope shape with protocol, kind/domain, payload, signer,
  signature, created-at, id, and optional correlation ids.
- Add helper functions for signing and verifying domain events.
- Add control event payloads:
  - `runner.hello.ack`;
  - `assignment.offer`;
  - `assignment.revoke`;
  - `assignment.lease.renew`;
  - `runtime.start`;
  - `runtime.stop`;
  - `runtime.restart`;
  - `runtime.session.cancel`;
  - `runtime.source_history.publish`;
  - `runtime.source_history.replay`.
- Add observe event payloads:
  - `runner.hello`;
  - `runner.heartbeat`;
  - `assignment.accepted`;
  - `assignment.rejected`;
  - `assignment.receipt`;
  - `runtime.status`;
  - `session.updated`;
  - `turn.updated`;
  - `approval.updated`;
  - `artifact.ref`;
  - `source_change.ref`;
  - `source_history.ref`;
  - `source_history.replayed`;
  - `wiki.ref`;
  - `log.summary`.
- Add dedupe and replay rules for event ids and correlation ids.

## Tests Required

- Envelope signing/verification tests.
- Wrong-domain and wrong-signer rejection tests.
- NIP-59 wrapping/unwrapping tests for control/observe where private delivery
  is required.
- Public/unwrapped observation tests if selected for non-sensitive heartbeat
  events.
- Relay publish/subscribe adapter tests.
- Replay/deduplication tests.

## Migration/Compatibility Notes

A2A message schemas should remain stable where possible. Control and observe
domains should be additive.

Existing A2A rumor kind can remain for node messages. New domains may use new
custom rumor kinds or shared rumor kind with typed protocol field. The simplest
first implementation is shared NIP-59 wrapping plus explicit protocol payload
validation.

## Risks And Mitigations

- Risk: Nostr becomes a blob transport.
  Mitigation: schema limits, bounded preview payloads, and artifact-ref-first
  policy for full artifact content.
- Risk: relay history replay corrupts projection.
  Mitigation: idempotent event handling and monotonic assignment revisions.
- Risk: sensitive observations leak.
  Mitigation: use private wrapping where payload reveals task, policy, or
  artifact details.

## Open Questions

- Which observation events may be public/unwrapped for operational dashboards,
  if any? v1 can keep all control and observation events private.
