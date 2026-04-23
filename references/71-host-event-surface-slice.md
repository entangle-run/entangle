# Host Event Surface Slice

This document records the implementation batch that promoted host-side
control-plane events from an internal JSONL trace into a first canonical event
surface.

The goal of this slice was not to complete all host observability. The goal was
to create the first stable event boundary that both Studio and CLI can later
consume without bypassing `entangle-host`.

## What this slice changed

The host now owns:

- typed host-event DTO contracts in `packages/types`;
- persisted event records under the existing host trace root;
- HTTP event listing through `GET /v1/events`;
- a live WebSocket stream on `GET /v1/events` when upgraded;
- shared host-client support for event listing and subscription;
- tests that cover both HTTP inspection and real WebSocket delivery.

## 1. Typed event contracts

The canonical machine-readable event contracts now include:

- `catalog.updated`
- `package_source.admitted`
- `external_principal.updated`
- `graph.revision.applied`
- `runtime.desired_state.changed`
- `runtime.observed_state.changed`
- `host.reconciliation.completed`

Each event record now carries:

- a stable `eventId`
- `schemaVersion`
- `timestamp`
- a discriminated `type`
- machine-readable event-specific fields
- a human-readable `message`

These contracts are owned by `packages/types`, not by `services/host`.

## 2. Host-state integration

The existing control-plane JSONL trace is now treated as the canonical
persistent backing store for host events rather than as an untyped internal
log.

The host now emits typed events at real mutation and reconciliation boundaries:

- catalog bootstrap and apply
- package-source admission
- external-principal upsert
- graph apply
- runtime desired-state transitions
- runtime observed-state transitions
- reconciliation snapshot changes

This means the event stream is now tied to durable host state changes instead
of being a frontend-facing convenience channel.

## 3. Backward compatibility

The host now normalizes older persisted control-plane events into the new typed
event contract when reading history.

This preserves local trace continuity for developers who already have older
JSONL entries under `.entangle/host/traces/control-plane/`.

The legacy-to-current mappings currently cover:

- `catalog_bootstrap -> catalog.updated`
- `catalog_apply -> catalog.updated`
- `package_source_admit -> package_source.admitted`
- `external_principal_upsert -> external_principal.updated`
- `graph_apply -> graph.revision.applied`

## 4. WebSocket correctness refinement

During the audit pass for this slice, one real correctness issue surfaced:

- the initial WebSocket implementation could lose or duplicate events across
  the replay-to-live handoff window

The implementation was corrected before commit by:

- subscribing first;
- buffering live events while replay is being resolved;
- replaying history;
- de-duplicating buffered events by `eventId`;
- then switching the socket into live-forwarding mode

This keeps the first event surface disciplined enough for Studio and CLI to
build on later without hidden delivery gaps at startup.

## 5. Host-client support

`packages/host-client` now exposes:

- `listHostEvents(limit?)`
- `subscribeToEvents({ onEvent, onOpen, onClose, onError, replay })`

The client also normalizes WebSocket payloads in a runtime-safe way across:

- string payloads
- `ArrayBuffer`
- typed array views

This keeps the event surface shared across Studio, CLI, and tests instead of
re-implementing stream handling in each client.

## 6. Quality work in this slice

This batch required a deeper audit loop than usual because the first working
implementation was not yet good enough.

The final batch also corrected:

- unsafe `ws` test construction under strict linting;
- an overly loose host-client WebSocket typing surface that passed tests but
  failed `tsc -b` and ESLint under the repository's strict settings;
- the replay/live race in the WebSocket route;
- strict-mode union typing around host event persistence by moving compile-time
  event-shape guarantees to the emission sites and keeping the host writer
  runtime-validated through `hostEventRecordSchema`.

## 7. Verification

The slice was closed only after:

- targeted `types`, `host-client`, and `host` tests passed;
- `pnpm verify` passed;
- `git diff --check` passed.

The host WebSocket surface was exercised with a real local `ws` client in the
host integration test, not only through mocked callbacks.

## 8. What remains next

This slice does not complete host observability.

Still remaining after this batch:

- session-level host event classes and exposure of deeper runner activity
- richer host resource mutation surfaces for nodes, edges, and revision history
- Studio consumption of the live event stream
- CLI watch/stream workflows

## 9. Why this slice matters

Before this batch, Entangle had persisted host trace files but no first-class
event surface.

After this batch, Entangle has:

- a shared event contract;
- a stable host-owned inspection route;
- a live WebSocket event surface;
- durable event persistence aligned with host truth;
- and a clean boundary for future Studio and CLI live updates.
