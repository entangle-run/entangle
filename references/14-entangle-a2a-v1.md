# Entangle A2A v1

This document defines the first application-level agent-to-agent protocol for Entangle.

## Protocol scope

Entangle A2A is not the transport layer. It is the semantic layer carried by Nostr events.

It should define:

- message intent;
- session correlation;
- artifact references;
- stop conditions;
- response behavior.

The protocol must be interpreted together with the state and transition rules in [21-state-machines-and-runtime-transitions.md](21-state-machines-and-runtime-transitions.md). Message validity is not only a payload-shape question; it also depends on conversation, approval, and session state.

## Top-level payload

```json
{
  "protocol": "entangle.a2a.v1",
  "messageType": "task.request",
  "graphId": "graph-alpha",
  "sessionId": "session-123",
  "conversationId": "conv-123",
  "turnId": "turn-001",
  "parentMessageId": null,
  "fromNodeId": "worker-it",
  "fromPubkey": "1111111111111111111111111111111111111111111111111111111111111111",
  "toNodeId": "reviewer-it",
  "toPubkey": "2222222222222222222222222222222222222222222222222222222222222222",
  "intent": "review_commit",
  "responsePolicy": {
    "responseRequired": true,
    "closeOnResult": true,
    "maxFollowups": 1
  },
  "work": {
    "summary": "Review the parser patch and report blocking issues",
    "artifactRefs": []
  },
  "constraints": {
    "approvalRequiredBeforeAction": false
  }
}
```

The canonical machine-readable contract now lives in `packages/types` and uses
camelCase JSON keys for consistency with the rest of the Entangle repository.

## Message types

### `task.request`

Create or delegate a unit of work.

### `task.accept`

Receiver explicitly accepts ownership or active participation.

### `task.reject`

Receiver rejects the task due to capability, policy, or context mismatch.

### `task.update`

Intermediate progress update with optional artifact references.

### `task.handoff`

Pass active ownership or recommended next-step work to another node.

The current runner may emit `task.handoff` autonomously only from structured
engine handoff directives that resolve to one effective runtime edge route
with a materialized peer pubkey and an allowed handoff relation. Free-form
assistant text is not a routing authority.

### `task.result`

Final or near-final result for the current task scope.

### `artifact.ref`

Reference to durable work product independent of task finality.

### `approval.request`

Request approval before continuing or before publishing a response.

### `approval.response`

Approve or reject the requested transition.

### `conversation.close`

Declare that no more followup is expected for this conversation.

## Nostr transport recommendation

### Private messaging

Use NIP-17/NIP-59 style private messaging for inter-node communication.

For the current Entangle implementation profile:

- the outer wrapped event kind is the canonical NIP-59 gift-wrap kind `1059`;
- the inner Entangle rumor kind is the dedicated custom kind `24159`;
- message threading and local session correlation must use the inner rumor id as
  the canonical message/event id, not the outer gift-wrap event id.

### Public events

Use public custom events only for:

- node advertisement;
- graph metadata publication later;
- registry/discovery surfaces.

## Mandatory behavioral invariants

- every message must be signed;
- every message must identify sender and recipient by both graph-local node id
  and authoritative pubkey;
- every message must belong to a graph and session context;
- every response-required message must allow at least one follow-up;
- every message must carry enough control metadata to avoid infinite ping-pong loops.
