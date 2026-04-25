# Runner Autonomous Handoff Slice

This slice turns peer-aware runtime routes into controlled autonomous
`task.handoff` emission by the runner.

## Problem

The prior route-identity slice gave runners non-secret peer pubkeys on
effective edge routes, but handoff execution was still externally mediated.
An engine could reason about peer routes, but there was no structured way to
ask the runner to hand work to another node.

Allowing free-form assistant text to trigger handoffs would be unsafe:

- it would let the model invent destinations;
- it would bypass graph relation semantics;
- it would create untracked outbound conversations;
- it would make emitted coordination messages invisible in runner-turn,
  host-event, and client surfaces.

## Implemented behavior

The engine turn result contract now includes `handoffDirectives`.

Each directive must include:

- `summary`;
- either `edgeId` or `targetNodeId`;
- optional `intent`;
- optional artifact inclusion policy: `none`, `produced`, or `all`;
- an A2A response policy, defaulting to a bounded required response.

The runner now validates every directive before emitting any handoff:

- the local node policy must allow session initiation;
- the directive must resolve to exactly one effective edge route;
- the route must include a materialized peer Nostr public key;
- the edge relation must be one of the allowed autonomous handoff relations:
  `delegates_to`, `peer_collaborates_with`, `reviews`, or `routes_to`;
- the final `task.handoff` payload must pass the canonical A2A validator.

When valid, the runner publishes a `task.handoff` message to the resolved peer
pubkey, includes only the requested artifact refs, and records the outbound
conversation before publishing so immediate downstream responses do not race
with local state creation.

## State and observability changes

`RunnerTurnRecord` now carries `emittedHandoffMessageIds`.

That field also flows into:

- observed runner activity records;
- `runner.turn.updated` host events;
- host-client runtime-turn summaries and detail lines.

The runner result shape now returns both the ordinary response envelope and
the published handoff envelopes, making tests and future host integration
explicit about multi-message turns.

The runner also distinguishes executable work messages from coordination
messages:

- `task.request` and `task.handoff` enter the engine-execution path;
- `task.result` and `conversation.close` update conversation/session state
  without triggering a new engine turn.

That prevents a delegated result from becoming an accidental work request.

## Protocol correction

The A2A schema now rejects every response-required message with
`maxFollowups: 0`, not just `task.request`. This aligns the machine-readable
contract with the earlier prose invariant that response-required messages must
leave at least one follow-up slot.

## Tests

Added coverage that proves:

- engine handoff directives get canonical defaults and reject missing route
  selectors;
- response-required `task.handoff` messages with zero follow-ups are invalid;
- an upstream runner can publish a git-backed artifact, emit a
  topology-bound `task.handoff`, and have a downstream runner retrieve that
  artifact through the same in-memory transport;
- the upstream runner records the emitted handoff message id;
- a downstream `task.result` closes the outbound handoff conversation without
  re-entering the upstream engine path;
- host runtime-turn inspection preserves the new handoff-id field.

## Boundary decisions

- Engine output is advisory, not authoritative. The runner owns validation,
  routing, message construction, and state persistence.
- Handoffs do not mutate graph topology.
- Handoffs do not infer peer pubkeys.
- User-node routes remain blocked for autonomous handoff until real user
  identity binding exists.
- Artifact refs remain the work handoff substrate; messages coordinate the
  transfer.

## Result

Entangle now has the first controlled autonomous multi-node work path:
a node can produce a git-backed artifact, ask the runner for a graph-valid
handoff, and have another node consume that artifact under the same A2A,
runner-state, and host-observability contracts.
