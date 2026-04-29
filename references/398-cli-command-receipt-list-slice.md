# CLI Command Receipt List Slice

## Current Repo Truth

Host projection now exposes runner-signed `runtime.command.receipt` records,
assignment timelines include assignment-scoped command receipts, Studio renders
recent command receipts, and `entangle host projection --summary` includes a
bounded recent receipt list. Headless operators still had to inspect the full
projection JSON or individual assignment timelines when they wanted a focused
list filtered by node, runner, assignment, command type, or receipt status.

## Target Model

The CLI should expose a dedicated read-only command receipt inspection surface
over the existing Host projection:

- no new Host API;
- no direct runner calls;
- no runner filesystem reads;
- stable newest-first ordering;
- filters for assignment id, node id, runner id, runtime command event type,
  and receipt status;
- compact summary output for operator workflows.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/397-cli-projection-command-receipt-summary-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a dedicated `entangle host command-receipts` command.
- Read Host projection through the existing host-client boundary.
- Add client-side command receipt filters and status validation.
- Reuse the existing compact command receipt summary projection.
- Return `totalMatched`, `returned`, and the limited receipt list.
- Cover sort, filter, projection, and status validation helpers with CLI tests.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/cli test -- --runInBand`
- `pnpm --filter @entangle/cli exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is an additive CLI command. Existing `entangle host projection` behavior,
Host API contracts, and projection schemas are unchanged.

## Risks And Mitigations

- Risk: the command duplicates assignment timeline behavior.
  Mitigation: it intentionally reads the global projection and filters receipts
  across assignments, while assignment timelines remain the grouped per
  assignment lifecycle view.
- Risk: receipt status typos silently produce empty output.
  Mitigation: `--status` is validated against `received`, `completed`, and
  `failed`.

## Open Questions

None for this slice.
