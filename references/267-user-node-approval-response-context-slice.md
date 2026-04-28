# User Node Approval Response Context Slice

## Current Repo Truth

User Node approval requests can carry operation, resource, and reason metadata.
The User Client can render that metadata and can publish signed
`approval.response` messages as the selected User Node.

Before this slice, the signed approval response and the recorded outbound User
Node message carried only `approvalId` and `decision`. That was enough for the
runner to resolve an approval by id, but it weakened audit readability because
the signed response no longer carried the concrete operation/resource context
that the human reviewed.

## Target Model

When a human User Node approves or rejects an agent request, the signed
response should preserve the scoped approval context where available:

- approval id;
- decision;
- operation;
- resource;
- reason.

The runner may continue to gate execution by approval id, but Host projection,
User Client history, CLI output, and audit tools should be able to show what
was approved without relying only on the earlier request message.

## Impacted Modules/Files

- `packages/types/src/protocol/a2a.ts`
- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/user-node-messaging.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- extended `approval.response` A2A metadata to allow optional operation,
  resource, and reason fields;
- extended User Node message publish requests with the same optional approval
  context fields;
- preserved approval context when Host records outbound User Node approval
  response messages;
- preserved approval context when Host records inbound approval responses;
- carried approval context through the User Client approve/reject form as
  hidden fields sourced from the inbound approval request;
- updated contract, Host A2A builder, and runner User Client tests.

Deferred:

- richer User Client post-response state that marks the original request card
  as answered;
- first-class source-review message types beyond approval responses.

Follow-up implemented later:

- `272-cli-user-node-approval-context-slice.md` added CLI flags for manually
  supplying operation/resource/reason context on signed approval responses.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test -- user-node-messaging.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- types, Host, and runner typechecks passed;
- types tests passed;
- focused Host and runner test commands passed;
- types, Host, and runner lints passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is backward-compatible. Existing approval responses with only approval id
and decision still validate and execute normally. New context fields are
optional.

## Risks And Mitigations

- Risk: response context could drift from the original request.
  Mitigation: the User Client sources hidden context fields from the recorded
  inbound approval request card. Host-side consistency validation can be added
  later when approval request/response correlation moves fully into projection.
- Risk: runner execution starts depending on denormalized context instead of
  approval id.
  Mitigation: this slice does not change runner gating semantics; it only
  improves signed metadata and Host/User Client history.
- Risk: CLI ad hoc approval responses remain less expressive.
  Mitigation: CLI can still send approval id/decision; resource-context flags
  are a follow-up.

## Open Questions

Should Host validate that operation/resource/reason in a response match the
original approval request before publishing, or should that validation live in
the receiving agent runner as part of its local policy gate?
