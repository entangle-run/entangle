# Host Session Approval Status Counts Slice

## Purpose

Make approval state visible through the same host-owned session inspection
surface that already exposes session status, active work, conversation status
counts, and consistency findings.

`SessionRecord.waitingApprovalIds` tells operators which approval ids are still
attached to a session, but it does not describe the durable lifecycle state of
the corresponding `ApprovalRecord` files. The host already observes approval
trace events, so the session read model should also expose bounded approval
status counts without moving approval ownership out of the runner.

## Implemented Behavior

The host session API contract now includes optional `approvalStatusCounts` on:

- `HostSessionSummary`;
- `HostSessionNodeInspection`.

`entangle-host` derives those counts from runner-local `ApprovalRecord` files
grouped by `sessionId` while building `GET /v1/sessions` and
`GET /v1/sessions/{sessionId}` responses.

The counts cover every approval lifecycle state:

- `not_required`;
- `pending`;
- `approved`;
- `rejected`;
- `expired`;
- `withdrawn`.

Aggregated session summaries merge counts across all node-owned records
participating in the same host session.

## Client Presentation

Shared `packages/host-client` session presentation helpers now format:

- recorded approval count;
- approval lifecycle status summary.

Studio and CLI consume those shared helpers, so visual and headless operators
see the same approval-state vocabulary without duplicating presentation logic.
The CLI summary projection also carries `approvalStatusCounts` and
`recordedApprovalCount` as structured fields.

## Boundary Decisions

- The runner remains the owner of approval lifecycle records.
- The host derives read-only counts and does not mutate approval state.
- `waitingApprovalIds` remain visible because they represent the session's
  unresolved approval gate references.
- `approvalStatusCounts` complement those ids with durable lifecycle state, but
  they do not replace approval detail or future approval-decision APIs.

## Tests

Coverage now asserts:

- schema acceptance for approval lifecycle counts on host session summaries;
- host aggregation from persisted runner approval records;
- shared host-client formatting of approval status summaries;
- CLI structured projection of approval counts;
- Studio helper output through the shared presentation boundary.

## Result

Operators can now distinguish a session with pending approval pressure from one
that merely carries stale approval ids, and future approval inbox/detail work
has a cleaner read-model foundation.
