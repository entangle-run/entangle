# CLI User Node Approval Context Slice

## Current Repo Truth

User Node approval responses already support optional operation, resource, and
reason metadata in the shared Host API contract and A2A payload model. The
runner-served User Client preserves that context from an inbound
`approval.request` when it publishes a signed `approval.response`.

Before this slice, the headless CLI `approve`, `reject`, and
`user-nodes message` paths could publish signed User Node approval responses,
but they could only carry approval id and decision. That made the CLI less
expressive than the User Client for scoped approval audit trails.

## Target Model

Every User Node surface should publish the same signed approval-response shape:

- approval id;
- decision;
- optional policy operation;
- optional scoped policy resource;
- optional reason/context.

The CLI remains a headless/development User Node gateway, while the primary
participant UI remains the Human Interface Runtime User Client.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-message-command.ts`
- `apps/cli/src/user-node-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/267-user-node-approval-response-context-slice.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added a shared CLI helper that validates approval response context against
  the canonical policy operation and resource schemas;
- added `--approval-operation`, `--approval-reason`,
  `--approval-resource-id`, `--approval-resource-kind`, and
  `--approval-resource-label` to `entangle approve`;
- added the same context flags to `entangle reject`;
- added the same context flags to `entangle user-nodes message` for generic
  signed `approval.response` publishing;
- made generic `user-nodes message` reject partial approval metadata instead
  of silently dropping supplied context;
- covered the helper with CLI tests without expanding the CLI lint project-file
  surface.

Deferred:

- CLI rendering that marks an approval request as answered by a later signed
  response;
- Host-side correlation validation between response context and the original
  request context.

Follow-up implemented later:

- `275-cli-user-node-approval-from-message-slice.md` added
  `approve/reject --from-message <eventId>` so the CLI can source context from
  recorded inbound approval-request messages.

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

This is backward-compatible. Existing CLI approval responses with only
approval id and decision still validate and publish. New context flags are
optional.

## Risks And Mitigations

- Risk: an operator manually enters context that differs from the original
  approval request.
  Mitigation: the CLI validates shape and enum values, but does not yet claim
  correlation. Automatic extraction from inbox history remains a follow-up.
- Risk: the CLI becomes confused with Studio/operator approval mutations.
  Mitigation: these commands publish signed User Node messages through Host's
  User Node gateway, not runner-local Host approval mutation records.

## Open Questions

Should the CLI gain `approve --from-message <eventId>` and
`reject --from-message <eventId>` to source the approval id, operation, resource,
reason, conversation, session, parent message, and target node directly from
the recorded User Node inbox?
