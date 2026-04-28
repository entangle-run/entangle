# CLI User Node Approval From Message Slice

## Current Repo Truth

CLI `approve`, `reject`, and generic `user-nodes message` can publish signed
User Node `approval.response` messages. They can also carry optional scoped
operation/resource/reason metadata.

Before this slice, headless approval/rejection still required the operator to
manually supply target node, conversation id, session id, parent event id, and
approval context. That made CLI approvals more error-prone than the User
Client, which naturally preserves those fields from the clicked request card.

## Target Model

The CLI should support a headless User Node approval flow that starts from the
recorded inbound `approval.request` message:

```bash
entangle approve --user-node user-a --from-message <eventId>
entangle reject --user-node user-a --from-message <eventId>
```

The CLI should reuse the recorded message's:

- approval id;
- operation/resource/reason context;
- target node;
- conversation id;
- session id;
- parent event id;
- turn id.

Manual approval id and target-node publishing remains available for advanced
or scripted use.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-message-command.ts`
- `apps/cli/src/user-node-output.test.ts`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/272-cli-user-node-approval-context-slice.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `--from-message <eventId>` to `entangle approve`;
- added `--from-message <eventId>` to `entangle reject`;
- made the approval id argument optional when `--from-message` is supplied;
- kept approval id plus `--target-node` required for manual mode;
- added CLI inbox lookup that searches recorded User Node conversations for the
  referenced message;
- added helper logic that validates the referenced message is an inbound
  `approval.request` and builds a signed `approval.response` request preserving
  the recorded context;
- preserved explicit context flags as overrides when supplied.

Deferred:

- a direct `inbox approve <eventId>` command namespace;
- paging/limits for very large inbox histories;
- UI output that shows which original request was answered by a response.

## Tests Required

- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test -- user-node-output.test.ts`
- `pnpm --filter @entangle/cli lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- CLI typecheck passed;
- focused CLI tests passed;
- CLI lint passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is additive. Existing manual `approve <approvalId> --target-node <nodeId>`
and `reject <approvalId> --target-node <nodeId>` flows still work.

## Risks And Mitigations

- Risk: searching every conversation is inefficient for large inboxes.
  Mitigation: current local profile histories are small; a future indexed
  message lookup route can replace the client-side search without changing the
  command contract.
- Risk: an operator supplies an approval id that does not match the message.
  Mitigation: helper validation rejects mismatches instead of publishing a
  contradictory signed response.

## Open Questions

Should Host expose `GET /v1/user-nodes/:nodeId/messages/:eventId` so CLI and
User Client can resolve a recorded message without scanning conversations?
