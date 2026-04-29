# Studio Assignment Timeline Drilldown Slice

## Current Repo Truth

Host exposes `GET /v1/assignments/{assignmentId}/timeline`, the host client and
CLI already consume it, and Studio already shows assignment rows, recent
assignment receipts, and recent runtime command receipts from Host projection.
Studio did not yet offer an assignment-scoped timeline drilldown, so operators
had to switch to CLI or raw API output for the joined lifecycle view.

## Target Model

Studio should remain the admin/operator control room and should be able to
inspect the same assignment timeline read model as CLI:

- fetch timeline data through `packages/host-client`;
- never call runners directly;
- render assignment lifecycle, assignment receipts, and runtime command
  receipts as one assignment-scoped timeline;
- keep timeline selection read-only and projection/Host-boundary aligned.

## Impacted Modules And Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio timeline formatting and sorting helpers.
- Add test coverage for assignment timeline summary, labels, detail lines, and
  ordering.
- Add selected-assignment timeline state to Studio.
- Add a `Timeline` action per projected assignment row.
- Fetch `client.getAssignmentTimeline(assignmentId)` with stale-response
  guards.
- Render bounded assignment timeline entries in the Federation panel.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/studio test -- --runInBand`
- `pnpm --filter @entangle/studio exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @entangle/studio lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is an additive Studio read surface. Host API, host-client contracts, CLI,
and projection schemas are unchanged.

## Risks And Mitigations

- Risk: stale timeline responses could show the wrong selected assignment.
  Mitigation: Studio tracks the selected assignment id in a ref and drops stale
  responses.
- Risk: Studio and CLI timeline presentations drift.
  Mitigation: Studio uses the same Host client endpoint and mirrors the same
  timeline entry fields while keeping presentation helpers covered by unit
  tests.

## Open Questions

None for this slice.
