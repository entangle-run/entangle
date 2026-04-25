# Session-Level Consistency Diagnostics Slice

## Purpose

Extend delegated-session diagnostics beyond conversation-id-specific drift.

After the host learned to compare `activeConversationIds` with durable
conversation records, one semantic gap remained: a session could still be
`active` while having no active ids and no open conversation records. That
state is not tied to one conversation id, so forcing it into a conversation
finding would have made the diagnostic misleading.

## Implemented Behavior

`HostSessionConsistencyFinding` now supports session-level findings by making
`conversationId` optional.

The host now emits a bounded warning finding with code
`active_session_without_open_conversations` when:

- the runner-owned session status is `active`;
- `activeConversationIds` is empty;
- no open conversation records exist for that session on the node.

The finding participates in the same read and health surfaces as existing
conversation-level findings:

- `GET /v1/sessions`;
- `GET /v1/sessions/{sessionId}`;
- `GET /v1/host/status`;
- `session.updated` finding-code summaries when the host observes session
  activity.

Any session-level finding contributes to top-level degraded host status through
the existing session diagnostics counters.

## Presentation Behavior

Shared `packages/host-client` session presentation now renders findings without
a conversation id as `nodeId/session`, avoiding synthetic conversation ids while
keeping CLI and Studio summaries compact.

CLI session summaries carry the optional finding payload unchanged, so
automation can distinguish session-level and conversation-level findings by the
presence or absence of `conversationId`.

## Boundary Decisions

- The host finding is diagnostic only. Runner startup repair may complete the
  active session later when no open work, no waiting approvals, and known last
  message context make the lifecycle transition safe.
- The runner remains responsible for lifecycle transitions and repair.
- The host does not infer which message should close the session.
- The API change is additive inside the current internal contract: existing
  conversation-level findings still include `conversationId`.

## Tests

Coverage now asserts:

- the type schema accepts session-level findings without conversation ids;
- host session inspection returns the new finding for active sessions with no
  open work;
- host status counts the finding and degrades health;
- shared presentation formats session-level findings without inventing a
  conversation id;
- CLI summary projection accepts optional finding `conversationId` payloads.

## Result

Operators can now distinguish three different delegated-session problems:

- bad active references;
- missing active references for real open conversations;
- active sessions that no longer have any open work to explain why they are
  still active.
