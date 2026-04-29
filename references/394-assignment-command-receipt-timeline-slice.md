# Assignment Command Receipt Timeline Slice

## Current Repo Truth

After `393-lifecycle-session-command-receipts-slice.md`, Host projection
contained runner-signed `runtimeCommandReceipts` for lifecycle, session, and
runner-owned work commands. The per-assignment timeline API still only joined
assignment lifecycle state and `assignment.receipt` observations, so operators
had to inspect the generic projection or event stream to correlate Host-signed
runtime commands with a specific assignment timeline.

## Target Model

The assignment timeline is the operator-facing read model for assignment
progress. It should include:

- Host assignment lifecycle entries;
- runner assignment receipts;
- runner command receipts for commands carrying the assignment id.

This keeps command closure visible without making command receipts replace the
domain evidence for runtime status, artifacts, source history, wiki updates, or
session cancellation.

## Impacted Modules And Files

- `packages/types/src/host-api/assignments.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/assignment-output.ts`
- `apps/cli/src/assignment-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend `RuntimeAssignmentTimelineResponse` with `commandReceipts`.
- Extend timeline entries with `runtime.command.receipt`,
  `commandEventType`, `commandId`, and `receiptStatus`.
- Have Host load `runtimeCommandReceipts` for the assignment and fold them into
  the sorted assignment timeline.
- Have CLI compact assignment timeline summaries expose command receipt count
  and command receipt entry metadata.
- Extend targeted contract, Host, host-client, CLI, and process-smoke coverage.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test -- --runInBand`
- `pnpm --filter @entangle/host test -- --runInBand`
- `pnpm --filter @entangle/host-client test -- --runInBand`
- `pnpm --filter @entangle/cli test -- --runInBand`
- `pnpm typecheck`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- `pnpm test`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is an additive response-contract change. Existing clients that ignore
unknown timeline entry fields and the new `commandReceipts` array continue to
work. New clients can inspect command closure through the same assignment
timeline endpoint.

## Risks And Mitigations

- Risk: operators treat command receipts as domain state.
  Mitigation: the timeline keeps lifecycle receipts and command receipts as
  distinct entry kinds.
- Risk: older fixtures omit the required command receipt array.
  Mitigation: all known contract and client fixtures were updated with explicit
  empty or populated `commandReceipts`.

## Open Questions

- Should Studio add a dedicated assignment timeline detail panel, or is the
  projection-level command receipt count enough for the next operator slice?
