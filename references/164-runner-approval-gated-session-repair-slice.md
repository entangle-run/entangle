# Runner Approval-Gated Session Repair Slice

## Purpose

Close the lifecycle gap where the runner could complete a session only because
all conversations had drained, even though the session still carried pending
approval ids.

In Entangle's state model, drained conversation work and approval-gated work
are different conditions. A session with no open conversations may still be
blocked on an explicit approval gate, so it must not advance to
`synthesizing` or `completed` until that gate resolves.

## Implemented Behavior

The runner now applies the same approval gate in both relevant paths:

- during normal message handling, when a final `task.result` or
  `conversation.close` drains the last open conversation;
- during startup repair, when stale `activeConversationIds` are reconciled
  before the runner subscribes to transport intake.

If the repaired or current session is `active`, has no open conversations, and
still has one or more `waitingApprovalIds`, the runner transitions the session
to `waiting_approval` instead of completing it.

If no waiting approval ids remain, the runner may still complete a drained
active session through the canonical `active -> synthesizing -> completed`
path when last-message context is known.

## Boundary Decisions

- Pending approval ids are treated as unresolved work gates, not as passive
  metadata.
- The runner remains the only component that mutates runner-owned session
  lifecycle state.
- The host diagnostic remains read-only and continues to surface suspicious
  active-session drift.
- Startup repair does not invent missing message context; when context is
  missing, the state remains diagnostic-only until a later explicit repair or
  approval workflow can explain the transition.

## Tests

Runner service coverage now asserts that:

- a live `task.result` closing the final conversation moves an approval-gated
  session to `waiting_approval`;
- startup repair moves a drained approval-gated active session to
  `waiting_approval`;
- both paths preserve the pending approval ids and the message context used for
  the transition.

## Result

Session completion now respects approval gates consistently across live intake
and startup repair. This keeps the lifecycle model aligned with the documented
state machine and prevents a future approval workflow from being bypassed by
conversation-drain reconciliation.
