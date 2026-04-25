# Runner Session Active-Conversation Reconciliation Slice

This slice tightens the lifecycle semantics introduced by autonomous runner
handoffs.

## Problem

After a runner emitted outbound `task.handoff` messages, the local session
tracked conversation ids by accumulation. That preserved history, but it made
`activeConversationIds` ambiguous:

- a closed source conversation could still appear active;
- a completed delegated handoff could still appear active;
- a session with one remaining open handoff and several closed conversations
  could not expose a clean open-work set;
- runtime-local inspection could not distinguish active conversation count
  from total observed conversation history.

That ambiguity matters because Entangle sessions are graph-native work units.
Completion should depend on actual open conversations, not on whether a
conversation id was ever seen.

## Implemented behavior

The runner now derives `SessionRecord.activeConversationIds` from persisted
conversation records whenever it evaluates session completion.

A conversation is considered inactive for session-completion purposes when it
is in one of these states:

- `resolved`;
- `rejected`;
- `closed`;
- `expired`.

All other conversation states continue to keep the session active.

When a `task.result` or `conversation.close` message arrives:

1. the relevant conversation transitions toward `resolved` or `closed`;
2. the runner lists all persisted conversations for the session;
3. `activeConversationIds` is rewritten to the remaining non-terminal
   conversation ids;
4. the session completes only when that open set is empty.

## Multi-handoff behavior

The new test coverage proves a session with two outbound handoffs:

- the source conversation closes after the upstream response;
- the first delegated handoff closes when its downstream `task.result`
  arrives;
- the second delegated handoff remains `working`;
- the session stays `active` with only the still-working handoff id in
  `activeConversationIds`;
- after the final delegated result arrives, the session transitions to
  `completed` with an empty active-conversation set.

## Inspection behavior

The runtime-local session snapshot now distinguishes:

- `activeConversationCount`, derived from `session.activeConversationIds`;
- `conversationCount`, the total observed conversation history for the
  session.

The prompt rendering used by `inspect_session_state` now surfaces both values,
so engine context can see whether a session has open work without losing
conversation history.

## Boundary decisions

- `activeConversationIds` is current open-work state, not historical state.
- Full conversation history remains available through conversation records and
  session snapshots.
- Session completion remains runner-owned and state-derived; model text cannot
  declare a session complete.
- This is still runner-local completion semantics. Cross-host/global
  owner-level session synthesis remains future work.

## Result

Delegated sessions now have a cleaner local closure rule:

> A runner-local session remains active while any non-terminal conversation for
> that session remains open, and completes only after the final open
> conversation resolves or closes.
