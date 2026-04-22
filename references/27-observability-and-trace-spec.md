# Observability and Trace Specification

This document defines how Entangle should expose runtime behavior so that the system remains inspectable, debuggable, governable, and demoable.

Entangle is not supposed to hide orchestration. Observability is part of the product, not a secondary operator concern.

## Design rule

Every meaningful runtime action should be traceable as structured system behavior, not only as UI animation or free-form logs.

## 1. Observability goals

The first serious version of Entangle should let an operator or user answer:

- which graph revision was used for this session;
- which nodes participated;
- which edges were traversed;
- which conversations opened and closed;
- which approvals were requested and how they resolved;
- which artifacts were produced and by whom;
- why a session completed, failed, timed out, or stalled.

## 2. Trace identity model

At minimum, observability should preserve these correlated ids:

- `graph_id`
- `graph_revision_id`
- `session_id`
- `trace_id`
- `conversation_id`
- `task_id` when present
- `artifact_id`
- `node_id`

These ids should allow deterministic reconstruction of runtime history.

## 3. Observable event classes

The system should distinguish at least these event classes:

- `session_event`
- `conversation_event`
- `approval_event`
- `artifact_event`
- `runner_event`
- `control_plane_event`

These may be transported or stored differently, but they should remain conceptually distinct.

## 4. Session trace

A session trace should capture:

- session creation;
- entrypoint acceptance;
- planning phase or delegation setup;
- active node set;
- significant state transitions;
- final outcome.

Recommended session trace attributes:

- session metadata;
- graph revision;
- entrypoint node;
- originating user node;
- current state;
- state history;
- participating nodes;
- root artifact refs;
- terminal reason when applicable.

## 5. Conversation trace

A conversation trace should capture the bounded work dialogue between two nodes.

It should include:

- participants;
- edge id used;
- message class sequence;
- response policy;
- current conversation state;
- terminal reason or timeout.

## 6. Approval trace

Approval behavior should be visible and attributable.

Approval traces should include:

- approval gate id;
- requester;
- potential approvers;
- current state;
- approval result;
- time of request and resolution;
- related session and conversation ids.

## 7. Artifact trace

Artifact traces should include:

- artifact id;
- backend;
- artifact kind;
- creator node;
- lifecycle state history;
- session/task/conversation linkage;
- supersession relationships when present.

## 8. Runner trace

Runner observability is not only about failures.

It should expose:

- receive;
- validate;
- contextualize;
- reason;
- act;
- persist;
- emit;
- block;
- error.

This can be coarse-grained in the first implementation, but the phase boundaries must remain visible.

## 9. Control-plane trace

Control-plane actions should be observable alongside data-plane execution.

Control-plane traces should include:

- graph revision creation;
- mutation proposals;
- mutation approvals or rejections;
- node admission or removal;
- edge policy changes;
- deployment-affecting binding changes.

## 10. Canonical trace relationships

Trace data should support these relationships:

- one session to many conversations;
- one conversation to many messages;
- one session to many artifacts;
- one artifact to many superseding artifacts over time;
- one graph revision to many sessions;
- one control-plane mutation to future sessions affected by it.

## 11. Trace storage expectations

The first serious version does not need a complex telemetry platform, but it does need durable structured trace storage.

Minimum acceptable options:

- JSON event logs per session;
- node-local structured logs;
- Studio-readable trace materialization;
- optional future export to a dedicated store.

## 12. User-facing observability

Entangle Studio should render trace information as product behavior, not merely hidden developer logs.

The minimum serious UI should show:

- active session state;
- participating nodes;
- state transitions;
- major message exchanges;
- artifact creation;
- approval pauses and outcomes.

## 13. Operator-facing observability

The system should eventually support stronger operator views:

- runner health;
- queue depth or active workload;
- edge throttling and failure patterns;
- relay connectivity issues;
- artifact backend failures.

These may be minimal in the hackathon build, but the trace model should already support them.

## 14. Failure observability

The system must distinguish failures such as:

- sender not authorized;
- protocol version unsupported;
- approval timed out;
- artifact backend unavailable;
- runner execution error;
- graph policy violation;
- control-plane mutation invalidated a path.

These must not collapse into a generic "agent failed".

## 15. Privacy and scope

Observability must not accidentally leak graph knowledge beyond the allowed audience.

Trace exposure should respect:

- node visibility mode;
- control-plane privileges;
- private-message boundaries;
- artifact access policy.

This is especially important once remote nodes or multi-tenant graphs exist.

## 16. Hackathon profile

The hackathon build should implement a smaller but real observability layer:

- session trace visible in Studio;
- conversation/message timeline for the active runtime subgraph;
- artifact list per session;
- approval pauses if they occur;
- coarse runner phase boundaries.

This is enough to prove that Entangle is infrastructure, not hidden orchestration.
