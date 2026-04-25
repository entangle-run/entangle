# Approval Metadata Validation Slice

## Purpose

Close the protocol-contract gap left after adding runner handling for
`approval.request` and `approval.response`.

Before this slice, `packages/types` exposed explicit approval metadata schemas
and the runner parsed them before mutating approval state, but
`validateA2AMessageDocument(...)` only validated the generic A2A envelope. A
malformed approval message could therefore pass the canonical A2A validator and
arrive at the runner as a coordination message that did not mutate lifecycle
state.

That was too weak for a protocol boundary: approval messages are lifecycle
messages, so malformed lifecycle metadata should fail validation before local
state is written.

## Implemented Behavior

`packages/validator` now applies message-type-specific metadata validation on
top of the generic `entangleA2AMessageSchema`:

- `approval.request` must carry `work.metadata.approval.approvalId`;
- `approval.request` may carry `approverNodeIds` and `reason`, using the
  existing type-owned metadata contract;
- `approval.response` must carry `work.metadata.approval.approvalId`;
- `approval.response` must carry a valid `decision` of `approved` or
  `rejected`.

The validator emits bounded semantic findings:

- `a2a_approval_request_metadata_invalid`;
- `a2a_approval_response_metadata_invalid`.

The finding path is rooted under `work.metadata`, which keeps validation output
aligned with the actual message field that needs correction.

## Runner Boundary Impact

`RunnerService.handleInboundEnvelope(...)` already calls
`validateA2AMessageDocument(...)` before routing executable or coordination
messages. With this slice, malformed approval requests and responses now return
`handled: false` with `reason: "invalid_message"` before the runner creates or
updates session, conversation, or approval records.

This keeps approval mutation authority runner-owned while making the protocol
gate stricter and easier to reason about.

## Boundary Decisions

- The generic A2A schema remains broad enough to carry metadata for all message
  types.
- Approval-specific metadata requirements live in the semantic validator layer.
- The host remains read-only for approval records.
- Unknown approval ids in otherwise valid responses are still a runner-local
  lifecycle concern, not a protocol-shape error.
- The metadata contract remains intentionally minimal until richer approval
  authority, timeout, evidence, and policy semantics are added.

## Tests

Coverage now asserts that:

- valid approval request metadata passes canonical A2A validation;
- missing approval request metadata fails canonical A2A validation;
- valid approval response metadata passes canonical A2A validation;
- invalid approval response decisions fail canonical A2A validation;
- the runner rejects a malformed approval request before writing local session,
  conversation, or approval state.

## Result

Approval coordination is now guarded at the protocol boundary:

1. generic A2A envelope validation still rejects malformed transport payloads;
2. approval metadata validation rejects malformed lifecycle intent;
3. the runner only materializes approval state from messages that passed both
   checks.
