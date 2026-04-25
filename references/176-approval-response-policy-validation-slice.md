# Approval Response Policy Validation Slice

## Purpose

Close the remaining approval-message loop-control gap in the canonical A2A
validator.

Approval metadata validation ensures that approval messages carry the right
lifecycle payload. It does not, by itself, guarantee that the message exchange
cannot become a protocol ping-pong. Approval requests should ask for an
approval response. Approval responses should be terminal decision messages.

## Implemented Behavior

`validateA2AMessageDocument(...)` now enforces approval-specific response
policy semantics:

- `approval.request` must have `responsePolicy.responseRequired: true`;
- `approval.response` must have `responsePolicy.responseRequired: false`;
- `approval.response` must have `responsePolicy.maxFollowups: 0`.

The validator emits bounded semantic findings:

- `a2a_approval_request_response_policy_invalid`;
- `a2a_approval_response_policy_invalid`.

## Boundary Decisions

- The generic A2A schema still owns universal response-policy invariants.
- Approval-specific loop-control rules live in `packages/validator` as
  semantic validation.
- `approval.request` can still choose whether the conversation should close
  after the result through `closeOnResult`.
- `approval.response` is terminal for the approval decision exchange and must
  not request another message.
- Runner approval mutation authority remains unchanged.

## Tests

Validator coverage now asserts that:

- approval requests without a required response are rejected;
- approval responses that request follow-ups are rejected;
- existing valid approval request and response messages still pass.

## Result

Approval coordination now has both lifecycle-shape and loop-control protection:

1. metadata must identify the approval and decision payload;
2. requests must actually request a response;
3. responses must be terminal and cannot ask for further follow-up.
