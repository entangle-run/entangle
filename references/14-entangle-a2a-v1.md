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

## Top-level payload

```json
{
  "protocol": "entangle.a2a.v1",
  "message_type": "task.request",
  "graph_id": "graph-alpha",
  "session_id": "session-123",
  "conversation_id": "conv-123",
  "turn_id": "turn-001",
  "parent_message_id": null,
  "from_node": "npub1...",
  "to_node": "npub1...",
  "intent": "review_commit",
  "response_policy": {
    "response_required": true,
    "close_on_result": true,
    "max_followups": 1
  },
  "work": {
    "summary": "Review the parser patch and report blocking issues",
    "artifact_refs": []
  },
  "constraints": {
    "approval_required_before_action": false
  }
}
```

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

### Public events

Use public custom events only for:

- node advertisement;
- graph metadata publication later;
- registry/discovery surfaces.

## Mandatory behavioral invariants

- every message must be signed;
- every message must identify sender and recipient;
- every message must belong to a graph and session context;
- every message must carry enough control metadata to avoid infinite ping-pong loops.
