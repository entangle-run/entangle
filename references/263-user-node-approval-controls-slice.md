# User Node Approval Controls Slice

## Current Repo Truth

The User Node runtime could receive and display inbound A2A messages, but the
message history did not preserve approval metadata and the User Client did not
provide an approval/rejection action. CLI already had signed
`approval.response` commands, but the product participant surface should be the
User Client running with the User Node.

## Target Model

Approval requests addressed to a User Node should arrive through the same A2A
inbox as other agent messages. The Human Interface Runtime should render the
request in the User Client, expose approve/reject controls, and publish a
signed `approval.response` as that User Node through the Host gateway.

Studio remains the operator/admin surface; it should not be the primary human
participant approval client.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/262-user-node-inbound-message-intake-slice.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added optional approval metadata to `UserNodeMessageRecord`;
- preserved `approval.request` metadata from inbound A2A messages;
- preserved `approval.response` metadata for outbound User Node messages;
- folded approval request/response records into User Node conversation
  projection pending approval ids;
- rendered approval metadata in the runner-served User Client;
- added approve/reject buttons that submit a signed `approval.response` through
  the existing Host User Node gateway;
- extended the process runner smoke with a synthetic signed `approval.request`
  and a User Client-submitted signed `approval.response`.

Deferred:

- artifact/source/wiki review panels next to approval requests;
- richer reason/comment input for rejection;
- read/delivery state;
- browser-side signing/key custody.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- lints for changed packages;
- `node --check scripts/smoke-federated-process-runner.mjs`;
- process runner smoke against a live relay.

Verification record:

- focused typechecks passed for `types`, `host`, and `runner`;
- focused tests passed for `types`, `host`, and `runner`;
- package lints passed for `types`, `host`, and `runner`;
- `node --check scripts/smoke-federated-process-runner.mjs` passed;
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
  passed against the federated dev relay, including
  `user-node-approval-request`, `user-node-approval-response`, two User Node
  runtimes, and filesystem isolation.

## Migration/Compatibility Notes

The approval field is additive on User Node message records. Existing records
without approval metadata remain valid.

## Risks And Mitigations

- Risk: a visible approval button sends an incomplete response.
  Mitigation: the User Client posts `approvalId`, `parentMessageId`,
  `conversationId`, `sessionId`, target node, and decision through the same
  schema-validated User Node publish endpoint.
- Risk: pending approval projection drifts from runner approval state.
  Mitigation: this is a User Node inbox projection only; runner approval state
  remains handled by signed A2A `approval.response` intake.
- Risk: rejection needs a human reason.
  Mitigation: minimal reject action exists first; richer comment input remains
  explicit follow-up.

## Open Questions

The next UI decision is whether approval requests should open a richer review
panel with linked artifact/source/wiki refs before allowing a decision.
