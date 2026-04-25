# Session Snapshot Approval Context Slice

## Purpose

Carry runner-local approval evidence into the same bounded session snapshot used
by `inspect_session_state` and model-guided memory synthesis.

The previous session snapshot surfaced `waitingApprovalIds` only through the
session record. That was enough to know that a session was blocked, but not
enough for a runner turn or synthesis pass to distinguish pending, approved,
rejected, expired, withdrawn, or missing approval evidence without using a
separate host-facing inspection path.

## Implemented Behavior

`buildRunnerSessionStateSnapshot()` now reads persisted approval records
alongside conversations, turns, and artifacts. For the requested session it
returns:

- bounded approval summaries sorted by newest update time;
- approval id, status, requester, approver node ids, conversation id, reason,
  and update timestamp;
- `approvalCount`, representing all recorded approvals for the session;
- `waitingApprovalCount`, representing the session's active waiting gate list.

The prompt projection used by runtime turns now renders a compact approval
summary before conversation, turn, and artifact summaries. The
`inspect_session_state` builtin accepts a bounded `maxApprovals` input with the
same current-session-only constraint as the existing snapshot inputs.

Model-guided memory synthesis now requests a bounded approval slice and includes
recorded approval counts plus status summaries in deterministic session context
lines.

## Boundary Decisions

- The snapshot remains runner-local and read-only.
- The builtin still cannot inspect other sessions.
- The host remains the shared operator visibility boundary, while runner
  memory synthesis consumes the runner-owned snapshot without widening host or
  filesystem access.
- `waitingApprovalIds` and approval records are intentionally reported as
  separate counts because drift between the two is diagnostically meaningful.
- Approval mutation authority remains inside runner lifecycle paths, not in
  snapshot rendering or builtin tool execution.

## Tests

Runner coverage now asserts that:

- session snapshots include bounded approval summaries and approval counts;
- unrelated approval records from other sessions are filtered out;
- prompt rendering includes waiting approval count, recorded approval count, and
  compact approval summary lines;
- `inspect_session_state` returns the approval payload and rejects
  out-of-bounds `maxApprovals` values.

## Result

Runner turns, builtin inspection, and durable memory synthesis now share the
same bounded approval context. This closes the gap between approval lifecycle
repair and runtime context without creating a new mutation path or weakening the
host/runner boundary.
