# Conversation, Approval, and Artifact Host Event Slice

## Goal

Complete the next planned widening of the host-owned event surface by deriving
typed conversation, approval, and artifact trace events from persisted runner
state.

Before this slice, Entangle already had:

- durable host-owned event storage and WebSocket streaming;
- runtime recovery events;
- session and runner-turn activity events;
- runner-local persistence for conversations, approvals, and artifacts.

What it still lacked was host-owned trace observation for:

- conversation lifecycle state;
- approval lifecycle state; and
- artifact lifecycle/publication/retrieval state.

That left an avoidable gap between the runner state Entangle persisted and the
operator-visible event surface exposed by `entangle-host`.

## Decisions frozen in this slice

### The host remains the owner of trace observation

The runner does not publish these events directly.

The host already owns:

- event persistence;
- live event streaming;
- cross-runtime inspection;
- deduplicated observed-state materialization.

This slice keeps the same rule for conversation, approval, and artifact trace:
the host derives events from persisted runner state instead of trusting the
runner to emit operator-facing events.

### Trace widening must be deduplicated through observed-state records

The slice does not append host events directly from raw files on every read.

Instead it adds observed activity records for:

- conversations;
- approvals;
- artifacts.

Each observed record carries a fingerprint and is persisted under observed host
state before any new event is appended. This preserves the same no-duplicate
behavior already used for session and runner-turn activity.

### Artifact events must stay linked to runtime/session context

Artifact records do not always carry all routing context directly, so the host
resolves the best available graph/session/conversation linkage from persisted:

- artifact records;
- turn records;
- conversation records;
- session records.

This keeps artifact trace events useful for operators without pushing graph
inference into Studio or CLI.

## Implemented changes

### Shared contracts

Added observed activity record schemas for:

- conversations;
- approvals;
- artifacts.

Added typed host event contracts for:

- `conversation.trace.event`
- `approval.trace.event`
- `artifact.trace.event`

These now participate in the same canonical host-event union used by:

- persisted host event logs;
- WebSocket streaming;
- shared host-client parsing;
- CLI filtering;
- Studio live event consumption.

### Host behavior

`entangle-host` now derives and persists observed activity for:

- conversation records under `observed/conversation-activity/`;
- approval records under `observed/approval-activity/`;
- artifact records under `observed/artifact-activity/`.

It emits new typed events only when the observed fingerprint changes.

Artifact trace events also resolve the best available graph/session/conversation
context before emission, so later operator surfaces can reason over artifact
provenance without inventing their own join logic.

### Tests

The slice widened:

- shared host-event contract tests in `packages/types`;
- host integration tests so one runtime now produces session, conversation,
  approval, artifact, and runner-turn events from persisted runtime state;
- no-duplicate assertions across successive host reads for the new trace event
  classes.

## Verification

The slice was closed only after:

- targeted `@entangle/types` tests;
- targeted `@entangle/host` tests;
- targeted `@entangle/host` lint and typecheck;
- full `pnpm verify`;
- `git diff --check`.

## Result

Entangle's host event surface now covers the main trace entities already
persisted by the runner:

- sessions;
- conversations;
- approvals;
- runner turns;
- artifacts.

The next gap is no longer “make trace entities visible from the host”. It is
narrower:

- deepen Studio into richer runtime, artifact, and operator workflows on top
  of the now broader host event surface;
- improve CLI parity where that adds real headless operator value;
- widen remaining diagnostics only when they create real operator leverage.
