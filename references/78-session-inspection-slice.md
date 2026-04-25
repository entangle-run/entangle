# Host Session Inspection Slice

## Summary

Completed the next host-control-plane observability slice by adding read-only
session inspection surfaces through `entangle-host`, `packages/host-client`,
and the CLI.

The implemented surfaces are:

- `GET /v1/sessions`
- `GET /v1/sessions/{sessionId}`

This slice intentionally lands **before** broader host-event widening into
session and runner activity.

That ordering is deliberate. Without a stable host-owned inspection boundary,
event widening would have pushed session semantics into transient event payloads
without a matching persisted read model.

## Semantics frozen by this slice

### Session inspection is host-owned and read-only

The host now exposes persisted runner session state without making Studio or
CLI infer session truth from raw files or from future event streams.

This slice does **not** add mutation semantics for sessions. It only exposes a
stable read surface.

### Aggregation model

`GET /v1/sessions` returns host-owned summaries grouped by `sessionId` across
the current host runtime set.

Each summary includes:

- `activeConversationIds`
- `graphId`
- `latestMessageType`
- `sessionId`
- `nodeIds`
- `nodeStatuses`
- `rootArtifactIds`
- `traceIds`
- `waitingApprovalIds`
- `updatedAt`

`GET /v1/sessions/{sessionId}` returns the node-owned session entries that
contribute to that aggregated session view, pairing:

- the current runtime inspection for the node;
- the persisted `SessionRecord` read from that node's runtime state.

### Boundary rule

The surface is grounded in the **current host runtime state**, not in a
separate session warehouse.

That means:

- inspection is derived from the current active runtime set;
- persisted runner session files remain the source material;
- the host owns aggregation, normalization, and `404` behavior.

### Consistency rule

If node-owned entries for the same `sessionId` disagree on `graphId`, the host
now treats that as an invariant violation instead of silently selecting one
entry as truth.

This is intentionally strict. Session inspection should not hide cross-node
state corruption behind heuristic merging.

## Implemented changes

### Shared contracts

Added canonical host-session DTOs in `packages/types`:

- `HostSessionSummary`
- `SessionListResponse`
- `SessionInspectionResponse`

These now define the shared boundary for host routes, host-client consumers,
CLI output, tests, and future Studio usage.

### Host state

`services/host` now:

- reads persisted `SessionRecord` files from runner runtime roots;
- aggregates them by `sessionId`;
- derives list summaries and detail inspection payloads;
- validates those payloads through the shared contracts.

### Host API

`entangle-host` now exposes:

- `GET /v1/sessions`
- `GET /v1/sessions/{sessionId}`

with structured `404 not_found` behavior when a session does not exist in the
current host runtime state.

### Shared client and CLI

The same boundary is now available through:

- `packages/host-client`
- `entangle host sessions list`
- `entangle host sessions get <sessionId>`

This keeps session inspection headless-capable and prevents Studio from
becoming the only serious operator surface.

The CLI now also supports compact operator summaries through:

- `entangle host sessions list --summary`
- `entangle host sessions get <sessionId> --summary`

## Testing and verification

This slice was closed only after:

- targeted `@entangle/types` tests;
- targeted `@entangle/host-client` tests;
- targeted `@entangle/host` tests;
- full `pnpm verify`;
- `git diff --check`.

New coverage includes:

- host-client parsing for session list and inspection responses;
- host integration coverage for:
  - session summary listing;
  - session detail inspection;
  - `404` behavior for missing sessions.

## Outcome

The host control plane now has a stable session-inspection boundary on top of
persisted runner state.

That means the next observability slices can widen host events into session and
runner activity without forcing event-only semantics or duplicating inspection
logic across clients.
