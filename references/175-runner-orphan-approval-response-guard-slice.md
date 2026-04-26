# Runner Orphan Approval Response Guard Slice

## Purpose

Prevent valid but locally orphaned `approval.response` messages from creating
phantom active work in runner-Entangle state.

After approval-response metadata became part of the canonical A2A validator,
there was still a separate lifecycle issue: a structurally valid
`approval.response` for an unknown approval id could enter the coordination
path. The runner would create a new active session and opened conversation
before discovering that no local approval record existed.

That behavior was too permissive. An approval response is only meaningful when
it can attach to existing local approval, session, or conversation state. When
none of those records exist, the message should be absorbed as irrelevant or
stale protocol traffic, not turned into new active work.

## Implemented Behavior

`RunnerService.handleCoordinationEnvelope(...)` now performs an early orphan
check for `approval.response` messages:

- parse the already-validator-approved response metadata;
- look for the referenced local `ApprovalRecord`;
- look for the target local `SessionRecord`;
- look for the target local `ConversationRecord`;
- if none exist, return a handled no-op without writing runner-local lifecycle
  state.

The guard applies only to `approval.response`. Inbound `approval.request`
messages still create pending approval gates because they are the message type
that initiates local approval state.

## Boundary Decisions

- The message remains protocol-valid when its metadata is valid.
- Unknown approval ids are not a protocol-shape error.
- Existing local session or conversation context still allows the runner to
  record the coordination observation and preserve diagnostics.
- Fully orphaned approval responses do not create sessions, conversations, or
  approval records.
- Approval mutation authority remains runner-owned, and the host remains a
  read-only observer for approval records.

## Tests

Runner service coverage now asserts that a valid `approval.response` with no
matching local approval, session, or conversation state returns a handled
no-op and leaves all three local record types unwritten.

## Result

The approval-response path now has two layers of protection:

1. malformed lifecycle metadata is rejected by the canonical A2A validator;
2. structurally valid but locally orphaned responses are absorbed without
   creating phantom active sessions.
