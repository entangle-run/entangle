# Runner Approved Approval Gate Repair Slice

## Purpose

Move approval-gated session repair from "pending approvals block completion" to
"only unresolved approvals block completion."

The previous runner behavior correctly prevented drained sessions with
`waitingApprovalIds` from completing, but it treated all waiting ids as
unresolved even when the matching approval record was already `approved`. That
left an approved session blocked until a future manual repair cleared the
waiting id.

## Implemented Behavior

The runner state store now exposes `listApprovalRecords()` so runner-owned
repair paths can inspect the same persisted approval records that the host
already surfaces read-only.

During live conversation-drain handling and startup repair, the runner now:

- derives open conversations from durable conversation records;
- removes `waitingApprovalIds` whose matching approval record is `approved`;
- preserves waiting ids whose approval record is missing, pending, rejected,
  expired, or withdrawn;
- moves drained `active` sessions with remaining waiting ids to
  `waiting_approval`;
- completes drained `active` sessions once no unresolved waiting approvals
  remain;
- moves `waiting_approval` sessions back through `active` and then to
  `completed` when all waiting gates are approved and no open conversations
  remain.

## Boundary Decisions

- The runner remains the only component mutating runner-owned session state.
- The host remains a read-only diagnostic and operator visibility surface.
- Only `approved` clears a waiting gate automatically.
- Missing approval records and non-approved terminal records remain unresolved
  gates. They continue to surface through host consistency diagnostics instead
  of being silently interpreted as successful approval.
- Lifecycle repair still requires durable last-message context before changing
  session status during startup.

## Tests

Runner service coverage now asserts that:

- a live final `task.result` completes a drained session when its waiting
  approval record is already `approved`;
- pending approval records still move drained sessions to `waiting_approval`;
- startup repair completes a `waiting_approval` session when all waiting gates
  are approved;
- repaired sessions clear approved waiting ids while preserving canonical
  last-message attribution.

## Result

Approved gates no longer strand otherwise drained sessions. Entangle now
distinguishes unresolved approval work from already-granted approval evidence
while preserving conservative behavior for missing, pending, rejected, expired,
and withdrawn approval records.
