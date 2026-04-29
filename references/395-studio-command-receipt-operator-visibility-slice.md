# Studio Command Receipt Operator Visibility Slice

## Current Repo Truth

`394-assignment-command-receipt-timeline-slice.md` made assignment-scoped
runtime command receipts available through the Host assignment timeline and CLI
summary. Studio still showed only the global command receipt count through the
projection summary and grouped assignment receipt summaries, so operators could
not scan recent command receipt closure directly in the Federation panel.

## Target Model

Studio should expose the same Host projection truth as CLI/operator APIs:

- global command receipt count in the Federation metrics;
- per-assignment command receipt summaries next to lifecycle receipt summaries;
- recent command receipt rows with command id, runner, command type, result
  status, and correlated artifact/source/wiki ids where available.

This stays projection-backed and does not add direct runner calls.

## Impacted Modules And Files

- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `apps/studio/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/394-assignment-command-receipt-timeline-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio helpers to sort, label, and summarize
  `RuntimeCommandReceiptProjectionRecord` values.
- Add runtime command receipt fixture coverage to Studio federation inspection
  helper tests.
- Render command receipt count in the Federation metric grid.
- Render assignment-scoped command receipt summaries under each assignment row.
- Render recent command receipt rows from Host projection.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/studio test -- --runInBand`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The broader shared-contract gate was not rerun for this Studio-only
presentation slice because the previous slice had just passed full
`pnpm typecheck`, `pnpm test`, and `pnpm lint`, and this slice did not touch
shared contracts or Host/runner code.

## Migration And Compatibility Notes

This is a Studio-only presentation change over an existing projection field.
No Host API or schema migration is required.

## Risks And Mitigations

- Risk: command receipt rows overwhelm the Federation panel.
  Mitigation: Studio shows a compact recent list capped to the same six-row
  pattern already used for assignment receipts and runtime projection.
- Risk: command receipts are mistaken for domain state.
  Mitigation: labels keep command receipt status separate from assignment
  receipt status and domain-specific artifact/source/wiki evidence.

## Open Questions

- Should a later Studio slice add a full assignment timeline drilldown that
  fetches `/v1/assignments/:assignmentId/timeline`, or is projection-level
  operator visibility sufficient for the current release profile?
