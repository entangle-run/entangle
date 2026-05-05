# Studio User Node Workload Summary Slice

## Current Repo Truth

Studio's Federation panel already shows User Node identity state, projected
Human Interface Runtime placement, client URLs, conversation counts, active
conversation counts, unread counts, and pending approval counts.

Before this slice, Studio did not summarize participant-requested runtime
command receipts per User Node in that roster. CLI gained those counts in
`references/504-user-node-client-workload-summary-slice.md`, so the operator UI
needed the same projection-level signal.

## Target Model

Studio and CLI should agree on the compact operational workload shown for each
User Node. Operators can spot not only whether a User Node is running and has
unread work, but also whether participant-requested runtime commands have
failed.

## Impacted Modules And Files

- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `commandReceiptCount` and `failedCommandReceiptCount` to Studio
  `UserNodeRuntimeSummary`.
- Derive counts from Host projection runtime command receipts where
  `requestedBy === userNodeId`.
- Render the counts through the existing compact detail formatter.

## Tests Required

- Studio federation-inspection tests for User Node runtime summaries.
- Studio typecheck and lint.

## Migration And Compatibility Notes

This is an additive Studio projection summary. Host API and host-client
contracts do not change.

The counts summarize Host projection; detailed participant-scoped receipt
inspection remains available through the User Client, CLI User Node route, and
operator command receipt surfaces.

## Risks And Mitigations

- Risk: Studio and CLI drift.
  Mitigation: both summaries use the same `requestedBy` attribution rule and
  expose compact counts rather than duplicating receipt details.

## Open Questions

None for this slice.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/studio test -- src/federation-inspection.test.ts`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
