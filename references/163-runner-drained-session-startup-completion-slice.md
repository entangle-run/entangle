# Runner Drained Session Startup Completion Slice

## Purpose

Turn the new active-session-without-open-work diagnostic into a bounded
runner-owned repair when the runner has enough durable context to do it safely.

The previous startup repair pass realigned `activeConversationIds` from durable
conversation records. That fixed the derived active-work set, but it still left
an `active` session in an invalid semantic state when all conversations had
already closed.

## Implemented Behavior

During `RunnerService.start()`, after deriving the current open conversation
set, the runner now completes a session through the canonical
`active -> synthesizing -> completed` transition path when all of the following
are true:

- session status is `active`;
- derived `activeConversationIds` is empty;
- `waitingApprovalIds` is empty;
- `lastMessageId` is known;
- `lastMessageType` is known.

The runner still repairs stale active ids first, so terminal conversation ids
or missing conversation ids cannot keep the session active.

If the runner lacks the last-message context required to explain the lifecycle
transition, startup repair does not invent it. The host diagnostic remains the
operator-visible signal for those cases.

## Boundary Decisions

- The host never performs the lifecycle mutation.
- The runner uses the existing session transition graph rather than writing
  `completed` directly.
- No synthetic message id, approval id, artifact id, or lifecycle history is
  created.
- Waiting approvals prevent automatic completion because they represent a
  separate unresolved work gate.

## Tests

Runner coverage now asserts that startup repair:

- completes a drained active session with only terminal conversations;
- clears stale active ids;
- preserves the last message id and type used to justify the completion.

## Result

Delegated sessions now recover from a common interrupted-write state: all
conversation work has drained, but the session record still says `active`.
The repair happens at the correct ownership boundary, before transport intake,
and through the canonical lifecycle transitions.
