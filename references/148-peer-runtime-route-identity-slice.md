# Peer Runtime Route Identity Slice

This slice makes effective runtime routes identity-aware without widening
secret delivery or allowing agents to invent destinations.

## Problem

The runner already received `relayContext.edgeRoutes`, but each route only
identified the peer node id, relation, channel, and relay profile refs. That
was enough for relay selection, but not enough for controlled autonomous
node-to-node work initiation because a protocol message also needs the peer's
Nostr public key.

The previous multi-node git handoff proof remained user-mediated: the test and
Docker smoke published the downstream task from the outside. The next runtime
deepening step is to let a node reason over real graph routes and peer protocol
identities while preserving host ownership of identity materialization.

## Implemented behavior

- `EffectiveEdgeRoute` now accepts an optional non-secret `peerPubkey`.
- `entangle-host` injects `peerPubkey` for adjacent non-user nodes by resolving
  the peer's host-owned runtime identity during effective context
  materialization.
- User-node edge routes intentionally keep `peerPubkey` unset because the host
  does not yet own real end-user Nostr identity binding.
- `entangle-runner` now includes a bounded peer-route summary in engine turn
  requests, including peer node id, edge id, relation, channel, relay refs, and
  whether a peer pubkey is resolved.

## Boundary decisions

- Peer public keys are non-secret runtime metadata.
- The host remains the only owner of local runtime identity materialization.
- The runner may consume resolved peer identity, but it does not create peer
  identity, mutate graph topology, or infer hidden destination pubkeys.
- This slice deliberately stops before automatic `task.handoff` emission. That
  next behavior needs an explicit runner policy and state model, not a hidden
  provider-output convention.

## Tests

Added coverage that:

- host runtime context for a worker includes the reviewer node's resolved
  runtime public key on the non-user edge route;
- user-node routes remain present but do not get a synthetic host-generated
  user pubkey;
- runner engine turn requests include bounded peer-route context.

## Result

Entangle now has the missing non-secret peer identity substrate for controlled
autonomous multi-node runtime work. The next slice can build explicit
`task.handoff` emission on top of resolved edge routes instead of hardcoding or
guessing peer destinations.
