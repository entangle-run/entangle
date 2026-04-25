# Runner Approval Message Handling Slice

## Purpose

Turn `approval.request` and `approval.response` from passive coordination
messages into runner-owned approval lifecycle updates.

Before this slice, the protocol already listed approval message types and the
runner could observe persisted approval records, but inbound approval messages
were handled like generic non-executable coordination. That meant approval
records were test-seeded or externally written, rather than materialized by the
runner when approval messages arrived.

## Implemented Behavior

`packages/types` now exports explicit A2A approval metadata contracts:

- `entangleA2AApprovalRequestMetadataSchema`
- `entangleA2AApprovalResponseMetadataSchema`
- `entangleA2AApprovalResponseDecisionSchema`

`approval.request` metadata carries an approval id, optional approver node ids,
and an optional reason. `approval.response` metadata carries an approval id and
an `approved` or `rejected` decision.

The runner now handles inbound approval coordination messages as follows:

- `approval.request`
  - parses the metadata contract;
  - creates or refreshes a pending runner-local `ApprovalRecord`;
  - defaults the approver to the recipient node when no approver list is
    provided;
  - adds the approval id to the session's `waitingApprovalIds`;
  - moves the conversation to `awaiting_approval`;
  - moves the session to `waiting_approval` when the session state allows it.
- `approval.response`
  - parses the metadata contract;
  - updates the matching approval record to `approved` or `rejected` only when
    the approval lifecycle transition is valid;
  - attributes the responding node in `approverNodeIds`;
  - moves approved approval conversations back through `working` and closes
    them when response policy allows;
  - reuses the existing no-open-work repair path so approved gates can clear
    `waitingApprovalIds` and complete unblocked waiting sessions.

Rejected decisions are persisted as rejected approval records, close the
approval conversation when policy allows, clear active approval gates from the
local terminal session, and fail the local session when the session lifecycle
allows it.

## Boundary Decisions

- Approval mutation remains runner-owned.
- The host stays read-only for approval records in this slice.
- Invalid or missing approval metadata is now rejected by the canonical A2A
  validator before the runner writes session, conversation, or approval state.
- A response for an unknown approval id does not synthesize a new approval
  record. Missing records remain visible through existing consistency
  diagnostics when there is existing local session or conversation context.
- A response for an unknown approval id with no matching local approval,
  session, or conversation state is absorbed without creating phantom active
  work.
- The protocol metadata contract is intentionally minimal until richer approval
  policy, authority, timeout, and evidence rules are implemented.

## Tests

Coverage now asserts that:

- the type package accepts the approval request and response metadata contracts;
- inbound `approval.request` creates a pending approval record, moves the
  conversation to `awaiting_approval`, and moves the session to
  `waiting_approval`;
- inbound approved `approval.response` updates the approval record, closes the
  approval conversation when policy allows, clears the waiting gate, and
  completes the unblocked session.
- inbound rejected `approval.response` updates the approval record, closes the
  approval conversation when policy allows, clears active waiting gates, and
  fails the blocked session.
- malformed approval metadata is rejected at the A2A validator boundary before
  runner-local lifecycle state is written.
- orphan approval responses with no matching local state are absorbed without
  creating local session, conversation, or approval records.

## Result

Entangle now has the first closed runner-local approval message loop:

1. an approval request can materialize a durable pending gate;
2. an approval response can update the durable approval record;
3. approved gates can unblock session completion through the existing lifecycle
   repair path;
4. operators can observe the resulting state through the already implemented
   host, CLI, Studio, trace, and session-summary surfaces.
