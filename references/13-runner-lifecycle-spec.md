# Runner Lifecycle Specification

## Purpose

The runner is the executable embodiment of a node. This document defines the lifecycle the runner should implement.

## Inputs to the runner

The runner starts with:

- an `AgentPackage`;
- a `NodeInstance`;
- a `RuntimeProjection`;
- mounted secrets and keys;
- mounted artifact workspace;
- mounted wiki memory;
- runtime engine configuration.

## Long-running responsibilities

The runner continuously:

- maintains relay subscriptions;
- watches inbound messages;
- tracks session-local state;
- manages memory updates;
- maintains workspace integrity;
- enforces edge-local policy.

## Message handling lifecycle

### Phase 1: receive

- receive event from Nostr relay;
- verify signature and addressed recipient;
- parse Entangle envelope;
- reject if protocol version unsupported.

### Phase 2: authorize

- verify sender is permitted by current edge policy;
- verify relation type allows this message type;
- verify session and graph context are valid;
- verify reply depth and stop conditions.

### Phase 3: resolve context

Construct local execution context from:

- package prompt files;
- node-local overlays;
- runtime projection;
- local wiki pages;
- artifact references;
- current session state.

### Phase 4: agentic execution

Invoke the engine with access to:

- local filesystem;
- git workspace;
- wiki;
- allowed tools;
- prior context and task state.

### Phase 5: side effects

The engine may:

- update workspace;
- create or modify git branches;
- write report files;
- update wiki;
- produce artifact references;
- decide on escalation or approval requirements.

### Phase 6: memory consolidation

After work completes:

- append interaction log;
- update relevant knowledge pages;
- record decisions and new references;
- add unresolved next steps if needed.

### Phase 7: response control

The runner, not just the model, decides whether to emit messages based on:

- message type semantics;
- `response_required`;
- approval state;
- final/close semantics;
- max followup limits.

### Phase 8: emit

If emission is allowed:

- construct outbound protocol payload;
- sign with node key;
- publish to the correct relay path;
- store local execution record.

## Failure handling

The runner should distinguish:

- transport failure;
- policy failure;
- execution failure;
- artifact failure;
- approval timeout;
- protocol parse failure.

Each class should map to an explicit internal outcome instead of collapsing into "the model failed".

## Hackathon runner profile

The first implementation can be strict and narrow:

- one engine adapter;
- one shared git remote;
- one or two relay endpoints;
- one transport mode;
- no remote package fetch;
- bounded concurrency.
