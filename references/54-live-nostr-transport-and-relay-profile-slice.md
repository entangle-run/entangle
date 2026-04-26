# Live Nostr Transport and Relay Profile Slice

This document records the batch that moved Entangle from a deterministic local
runner transport into a real live-relay Nostr transport slice.

It also records the deployment correction required to make the local `strfry`
profile real instead of only nominal.

## What changed

This slice added:

- canonical machine-readable Nostr transport constants in `packages/types`;
- a real `NostrRunnerTransport` in `services/runner`;
- long-lived runner startup wired to the Nostr transport by default;
- relay-readiness semantics at runner startup;
- a corrected local `strfry` Compose profile with an explicit mounted config
  file;
- a live smoke validation against a real local relay.

## 1. Canonical transport constants

The repository now owns canonical constants for the current Entangle Nostr
profile:

- gift-wrap event kind `1059`;
- Entangle rumor kind `24159`;
- transport mode `nip59_gift_wrap`.

This matters because the transport profile is no longer only prose; the type
system now carries the stable constants consumed by runtime code and tests.

## 2. Real Nostr runner transport

`services/runner` now includes a first real transport adapter that:

- subscribes on the NIP-59 gift-wrap kind;
- unwraps incoming events with the runner node secret key;
- requires the inner wrapped event to be the Entangle rumor kind;
- parses the inner content through the canonical Entangle A2A schema;
- publishes outbound messages by creating rumor -> seal -> wrap chains;
- treats the inner rumor id as the canonical message id for local threading and
  persisted runner state.

This is the correct stance for Entangle because:

- A2A traffic is structured protocol traffic, not plain chat;
- the outer gift-wrap event is transport metadata, not the stable semantic
  message identity;
- the inner rumor is the durable protocol payload that the runner actually
  interprets.

## 3. Relay-readiness correction

The first draft of the transport boundary allowed a subtle race:

- the runner could report itself as started immediately after registering a
  subscription object;
- the underlying relay connections might still not be established;
- a message published immediately after startup could therefore be missed.

The runner transport now explicitly preconnects readable relay URLs before the
runner service is considered started for the Nostr-backed profile.

This is not an optimization. It is a correctness requirement for the
long-lived-runner lifecycle.

## 4. Local relay profile correction

The batch also found and fixed a real deployment flaw:

- the federated dev Compose `strfry` service previously attempted to run without a
  config file;
- the container existed, but the relay was not actually usable.

The local deployment profile now mounts an explicit `strfry.federated-dev.conf` and
passes it to `strfry` in the Compose service definition.

The local relay config currently fixes:

- an explicit database path;
- bind address `0.0.0.0`;
- local relay port `7777`;
- NIP-42 disabled for the first federated dev profile.

## 5. Verification performed

This slice was verified in four layers:

1. runner-local lint, typecheck, and test gates;
2. repository-wide `pnpm verify`;
3. direct relay connectivity check using `nostr-tools` `SimplePool.ensureRelay`;
4. a live end-to-end smoke where:
   - a local runner started against a real runtime context;
   - a real NIP-59 wrapped Entangle message was published into local `strfry`;
   - the runner materialized session, conversation, and turn state under the
     runtime root;
   - the conversation closed and the session completed as expected.

The live smoke confirmed that:

- the runner can receive wrapped Entangle events from a real relay;
- the persisted local records use the expected canonical ids and lifecycle
  transitions;
- the corrected relay profile is actually usable, not only declared in Compose.

## 6. Why this slice matters

Before this slice:

- the runner had a deterministic transport abstraction;
- the long-lived service existed;
- the Nostr profile was still only partially proven.

After this slice:

- the runner has a real Nostr transport implementation;
- startup semantics now respect relay readiness;
- the local relay profile is actually operable;
- the runtime can be demonstrated on top of a real local relay path.

## 7. What remains next

This slice does not yet complete runner execution.

The next meaningful runtime work remains:

- git artifact work and handoff semantics;
- richer runtime trace exposure into host and Studio;
- stronger restart and recovery semantics;
- explicit relay-auth (`nip42`) coverage beyond the current local unauthenticated
  profile;
- broader integration coverage for multi-node live flows.
