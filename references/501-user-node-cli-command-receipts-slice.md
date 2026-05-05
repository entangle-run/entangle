# User Node CLI Command Receipts Slice

## Current Repo Truth

The Host projection now preserves optional `requestedBy` attribution on
runtime command receipts, and the running User Client filters those receipts to
the current User Node. The operator CLI can inspect all command receipts
through `entangle host command-receipts`, including a `--requested-by` filter.

Before this slice, there was no first-class headless User Node command that
listed only the receipts requested by one human graph participant.

## Target Model

User Node surfaces should work both through the running browser User Client and
through headless CLI. A human graph participant can inspect the commands that
their User Node requested without switching to the operator-oriented Host
projection command.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `entangle user-nodes command-receipts <nodeId>`.
- Filter Host projection receipts to `requestedBy === <nodeId>`.
- Support optional target-node, command type, status, limit, and summary
  filters on that User Node command.
- Add User Node CLI projection helpers for sorting, filtering, and compact
  command receipt summaries.
- Keep the operator `host command-receipts` command unchanged as the full
  projection surface.

## Tests Required

- CLI presentation tests for User Node receipt filtering and compact summary
  projection.
- CLI typecheck and lint.

## Migration And Compatibility Notes

This is an additive CLI surface. Existing operator commands and User Client
JSON state remain compatible.

Older unattributed command receipts remain visible through the operator Host
surface but do not appear in User Node command-receipt output, because the
participant-scoped command intentionally requires `requestedBy` attribution.

## Risks And Mitigations

- Risk: duplicating operator and User Node receipt inspection creates drift.
  Mitigation: both commands consume the same Host projection and shared schema
  type; the User Node helper adds only requester scoping and participant
  summary formatting.
- Risk: users expect this command to sign messages.
  Mitigation: this command is read-only inspection; message sending remains in
  `entangle user-nodes message`.

## Open Questions

- Whether Host should expose a dedicated `/v1/user-nodes/:nodeId/command-receipts`
  API so both CLI and Human Interface Runtime avoid fetching the full
  projection when only participant receipts are needed.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/user-node-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
