# Host Session Activity Detail Slice

This slice surfaces the runner's active-work session semantics through the
host-owned event boundary.

## Problem

After runner-local `activeConversationIds` became a reconciled open-work set,
the host still reduced `session.updated` events to status, owner, trace, and
timestamps. That left operator-facing runtime traces with an avoidable blind
spot:

- a session could be `active`, but the event did not say how many conversations
  were still open;
- a session could be `completed`, but the event did not confirm that active
  work had drained;
- root artifact context was absent from the session event even though it is
  already canonical session state;
- shared Studio and CLI trace presentation could not distinguish active work
  from total session history without additional reads.

## Implemented behavior

`ObservedSessionActivityRecord` and `session.updated` host events now include:

- `activeConversationIds`;
- `rootArtifactIds`;
- optional `lastMessageType`.

The host derives those fields directly from persisted runner `SessionRecord`
state during session-activity synchronization.

Because observed-session fingerprints include the widened record, a change in
active conversations or root artifacts can produce a new durable host event
even when the high-level session status remains unchanged.

## Presentation behavior

The shared runtime-trace presentation in `packages/host-client` now renders
session event detail lines for:

- trace id;
- active conversation count;
- root artifact count;
- last A2A message type when available.

Studio consumes the same shared detail lines. CLI trace summaries already use
the shared host-client presentation path and therefore inherit the new session
details.

## Boundary decisions

- The host still does not own runner session lifecycle transitions.
- The runner remains the source of session truth.
- The host records and emits observed session activity for diagnostics and
  operator-facing traces.
- This slice does not add a new API route; it widens the existing typed event
  and observed-state contracts.

## Tests

Coverage now asserts:

- typed `session.updated` events accept the new active-work fields;
- host-derived session events include active conversations, root artifacts, and
  last message type;
- shared runtime-trace presentation renders the new session details;
- Studio surfaces those shared session detail lines.

## Result

Operators can now read a host runtime trace and immediately see whether a
session still has open delegated work, how many root artifacts are attached,
and which A2A message type most recently moved the session.
