# Host Session Summary Active Work Slice

This slice aligns the host session list read model with the active-work
semantics already exposed by runner session state and `session.updated` events.

## Problem

The runner now reconciles `activeConversationIds` from open conversation
records, and the host event stream carries those active-work details on
`session.updated` events. However, `GET /v1/sessions` still exposed only graph,
node, trace, status, and timestamp summary fields.

That meant operators could see active-work detail in a runtime trace, but not
in the list-level session surface used for quick triage and Studio session
selection.

## Implemented behavior

`HostSessionSummary` now includes aggregate active-work fields derived from the
node-owned `SessionRecord` entries contributing to the host summary:

- `activeConversationIds`;
- `waitingApprovalIds`;
- `rootArtifactIds`;
- optional `latestMessageType`.

The host computes the id lists as deterministic unique sorted sets across all
participating node session records for the same `sessionId`. It resolves
`latestMessageType` from the newest node session record that has a known last
message type.

## Presentation behavior

Studio runtime session summaries now render:

- active conversation count;
- waiting approval count;
- root artifact count;
- latest message type when available.

Per-node drilldown remains grounded in `GET /v1/sessions/{sessionId}` and
continues to render node-owned active conversations, approvals, root artifacts,
and last message type directly from each `SessionRecord`.

## Boundary decisions

- The runner remains the source of session truth.
- The host owns aggregation and deterministic list-summary normalization.
- The session list remains a read model over the current host runtime set, not
  a separate session warehouse.
- The list response exposes aggregate ids, not lifecycle authority.

## Tests

Coverage now asserts:

- host session list responses include aggregate active conversations, waiting
  approvals, root artifacts, and latest message type;
- the shared host client parses the widened session summary contract;
- Studio summary helpers render the aggregate active-work fields.

## Result

Operators can now identify open delegated work, pending approval pressure, and
root artifact presence from the session list itself before opening per-node
session detail or scanning event traces.
