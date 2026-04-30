# Studio Assignment Operational Detail Slice

## Current Repo Truth

Studio can list projected runtime assignments and open an assignment timeline
with lifecycle entries, assignment receipts, and runtime command receipts. It
also now joins projected runner rows with Host runner registry liveness and
capability detail. The assignment timeline did not yet summarize the selected
assignment as an operational unit: runtime desired/observed state, runner
liveness, heartbeat, source-history evidence, replay evidence, and command
receipt count were spread across separate panels or unavailable in the
assignment drilldown.

## Target Model

The Studio assignment timeline drilldown should be useful as an operator
detail view for one assignment without becoming a separate source of truth. It
should join existing Host projection and registry evidence to show:

- runtime observed/desired state for the assignment;
- runner liveness and last heartbeat when the runner registry is available;
- source-history projection count for the assigned node/runner;
- source-history replay count for the assigned node/runner;
- command receipt count for the assignment.

## Impacted Modules And Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a shared Studio helper that builds assignment operational detail lines
  from `HostProjectionSnapshot` plus optional runner registry detail.
- Render those detail lines above the selected assignment timeline entries.
- Keep the drilldown read-only and Host-boundary-only.
- Add helper tests for the joined assignment detail.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist: no
  relevant hits

## Migration And Compatibility Notes

This is an additive Studio read-surface improvement. It does not change Host
APIs, projection contracts, assignment lifecycle, runner registry records, or
CLI behavior.

## Risks And Mitigations

- Risk: the drilldown could imply Studio owns assignment state.
  Mitigation: it only joins Host projection and registry read models at render
  time.
- Risk: source-history counts could be mistaken for complete code review.
  Mitigation: the detail is a compact operator signal; source-history detail
  remains in the dedicated runtime source-history panel.

## Open Questions

Closed by
[`438-studio-assignment-related-navigation-slice.md`](438-studio-assignment-related-navigation-slice.md):
assignment detail now links to the related runtime, runner, source-history, and
command receipt panels.
