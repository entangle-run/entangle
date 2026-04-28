# Assignment Receipt Operator Surfaces Slice

## Current Repo Truth

Host projection snapshots now include bounded `assignmentReceipts` records
derived from signed runner `assignment.receipt` observations. The compact read
model existed in Host projection, but Studio and CLI did not yet summarize or
render it directly.

Without this surface, operators could only inspect assignment receipt timelines
through the general Host event stream or raw projection JSON.

## Target Model

Operator surfaces should treat assignment receipts as first-class projected
runtime evidence. CLI summaries should expose the receipt count, and Studio
should show recent receipt rows near assignment and runtime placement state.

This keeps Studio as the graph admin/control room and leaves User Node
interaction to User Client/Human Interface Runtime surfaces.

## Impacted Modules/Files

- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `apps/studio/src/runtime-assignment-control.test.ts`
- `apps/studio/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `assignmentReceiptCount` to CLI projection summaries;
- updated CLI projection fixtures for the required `assignmentReceipts` field;
- added Studio assignment receipt sorting and formatting helpers;
- added assignment receipt count to the Studio federation summary;
- rendered recent assignment receipt rows in the Studio federation panel;
- updated Studio projection fixtures and helper tests.

## Tests Required

Verification run:

- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/cli test -- src/projection-output.test.ts src/user-node-output.test.ts`
- `pnpm --filter @entangle/studio test -- src/federation-inspection.test.ts src/runtime-assignment-control.test.ts`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/cli build`
- `pnpm --filter @entangle/studio build`

The package test commands currently run all package unit tests through the
package script glob; all CLI and Studio unit tests passed.

## Migration/Compatibility Notes

The change is additive for operator presentation. It assumes projection
snapshots include `assignmentReceipts`; the projection schema defaults this to
an empty array for older or partial snapshots.

## Risks And Mitigations

- Risk: receipt rows become noisy on high-churn assignments. Mitigation: Studio
  currently renders only the six newest receipts in the compact operator panel.
- Risk: a compact list does not provide per-assignment drilldown. Mitigation:
  this slice deliberately exposes the evidence first; a later assignment detail
  panel can group receipts by assignment id.

## Open Questions

- Should assignment receipt timelines move into a dedicated assignment detail
  drawer once Studio has richer runner and assignment inspection?
