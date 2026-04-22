# Communication and Protocol

## Protocol stack

Entangle should separate the communication stack into three layers.

### 1. Transport and authenticity

Use Nostr as the signed transport and routing layer.

Primary protocol references:

- NIP-01 for the base event structure;
- NIP-17 and NIP-59 for private direct messaging patterns;
- NIP-90 as semantic inspiration for request/result flows.

### 2. Application-level semantic protocol

Define an Entangle-specific agent-to-agent protocol, tentatively:

- `entangle.a2a.v1`

This protocol defines message meaning independently of the outer Nostr envelope.

### 3. Artifact substrate

Artifacts and durable work products live outside the message body when appropriate:

- git;
- file paths;
- wiki pages;
- patch files;
- structured reports.

## Why not just use raw NIP-90

NIP-90 is conceptually close, but too narrow for the full Entangle model. Entangle needs semantics for:

- request and result;
- updates;
- handoff;
- approvals;
- closures;
- artifact references;
- graph-aware delegation.

The right approach is to stay mentally compatible with NIP-90 but define a richer application-layer protocol.

## External protocol references

Entangle should also study two external protocol references without collapsing into either of them.

### A2A

A2A is relevant because it focuses on interoperability between opaque agentic systems.

What is useful:

- capability discovery;
- long-running task semantics;
- interoperability framing across heterogeneous agents;
- comparison with an HTTP and JSON-RPC style ecosystem protocol.

What Entangle should not do:

- replace its Nostr-native transport and identity model with A2A;
- flatten its graph semantics into an opaque-agent gateway model too early.

The right stance is:

> study A2A as an interoperability and comparison reference, not as Entangle's core protocol.

### MCP

MCP is relevant because it standardizes how clients and runtimes interact with tools, resources, and structured capabilities.

What is useful:

- schema discipline;
- clean boundary design;
- future interoperability with tool ecosystems;
- understanding how Entangle runners may expose or consume external capability surfaces.

What Entangle should not do:

- confuse tool protocol with agent graph protocol;
- replace Entangle's internal node, edge, session, and message model with MCP primitives.

The right stance is:

> use MCP to inform tool/runtime boundaries, not to define Entangle's internal agent-to-agent model.

## Suggested semantic message types

- `task.request`
- `task.accept`
- `task.reject`
- `task.update`
- `task.handoff`
- `task.result`
- `artifact.ref`
- `question`
- `answer`
- `approval.request`
- `approval.response`
- `conversation.close`

## Envelope fields

Suggested application payload fields:

- `protocol`
- `message_type`
- `graph_id`
- `session_id`
- `conversation_id`
- `turn_id`
- `parent_message_id`
- `from_node`
- `to_node`
- `intent`
- `response_policy`
- `work`
- `constraints`

## Stop and continuation control

Do not let the model itself fully control whether the conversation continues.

The runner should enforce:

- response required or not;
- final or non-final;
- close-on-result behavior;
- maximum followups;
- maximum hop depth;
- approval gates.

## Transport policy

Transport policy must be modeled canonically at the edge level.

The hackathon may support only a restricted transport profile, but the type itself should already support:

- directionality;
- per-relation relay policy;
- acknowledgment rules;
- later, more advanced routing.

The key principle is:

> simplify supported cases, not the core type.
