# Session Approval Consistency Diagnostics Slice

## Purpose

Close the diagnostic gap between session waiting-approval state and concrete
runner approval records.

Before this slice, session inspection exposed `waitingApprovalIds` and
host-derived approval lifecycle counts, but it did not verify that those two
signals agreed. A session could wait on a missing approval id, reference an
approval record that was already terminal, or have a pending approval record
that was not listed as a waiting gate.

## Implemented Behavior

`HostSessionConsistencyFinding` now supports approval-level findings by adding
an optional `approvalId` alongside the existing optional `conversationId`.

The host now compares each runner-owned `SessionRecord` with validated
runner-local `ApprovalRecord` files for the same node and session. It emits
bounded findings for:

- `waiting_approval_missing_record` when a waiting approval id has no approval
  record;
- `waiting_approval_not_pending` when a waiting approval id points at a
  non-pending approval record;
- `pending_approval_missing_waiting_reference` when a pending approval record
  is not listed in `waitingApprovalIds`;
- `waiting_approval_session_without_pending_approval` when a session is in
  `waiting_approval` but none of its waiting ids resolve to a pending approval
  record.

The findings flow through the existing session diagnostic surfaces:

- `GET /v1/sessions`;
- `GET /v1/sessions/{sessionId}`;
- `GET /v1/host/status`;
- `session.updated` finding-code summaries when host-observed session
  diagnostics change.

## Presentation Behavior

Shared `packages/host-client` session presentation now renders finding targets
as:

- `nodeId/conversation/conversationId` for conversation-level findings;
- `nodeId/approval/approvalId` for approval-level findings;
- `nodeId/session` for session-level findings.

This keeps CLI and Studio summaries compact while making the diagnostic target
unambiguous for automation and human operators.

## Boundary Decisions

- The host remains diagnostic-only. It does not approve, reject, expire, or
  delete approval records.
- Approval mutation authority remains inside the runner/runtime boundary until
  a signed approval decision protocol is implemented.
- Pending approval records are treated as unresolved work gates only when the
  session also references them through `waitingApprovalIds`.
- Terminal approval records behind `waitingApprovalIds` are warnings unless
  they also leave a `waiting_approval` session without any pending gate.

## Tests

Coverage now asserts:

- the shared type schema accepts approval-level consistency findings with
  approval ids;
- host session inspection reports approval-record drift and degrades top-level
  host status through existing session diagnostics;
- host `session.updated` observations include the new finding codes through the
  same fingerprint path as conversation diagnostics;
- shared presentation renders approval-level targets explicitly;
- CLI session summary projection accepts and displays approval-level findings.

## Result

Operators can now distinguish approval lifecycle counters from approval-gate
integrity. A waiting session no longer looks healthy merely because approval
records exist somewhere in the runtime root; the host can explain whether the
session's unresolved gates are concrete, pending, and connected to the
runner-owned approval records.
