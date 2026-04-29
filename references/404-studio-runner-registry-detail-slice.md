# Studio Runner Registry Detail Slice

## Current Repo Truth

Studio's Federation panel can now trust and revoke projected runner rows, and
Host already exposes the full runner registry through `GET /v1/runners`.
Projection rows are intentionally compact and do not include registry liveness,
heartbeat age, or capability details. That left Studio able to mutate runner
trust state but unable to show the richer registry evidence operators need
when deciding whether a runner should receive graph nodes.

## Target Model

Studio should keep projection as the assignment/control summary while joining
full Host runner registry detail for operator decision support:

- projected runner row for current trust/control status;
- runner registry liveness when available;
- heartbeat-derived last-seen evidence;
- runtime kind and engine capability summaries;
- advertised assignment capacity;
- no Studio-owned runner registry model.

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

- Load `client.listRunners()` in Studio overview refresh as an optional Host
  sub-read.
- Keep runner registry errors localized to the Runner Registry block.
- Join full registry entries with projected runner rows by runner id.
- Expand Studio runner row detail to include liveness, heartbeat last-seen,
  runtime kinds, agent engine kinds, and capacity when registry evidence is
  available.
- Add helper tests for the richer runner row presentation.

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

This is an additive Studio read-surface improvement. Host APIs, runner
registry records, projection contracts, CLI behavior, and assignment semantics
do not change.

## Risks And Mitigations

- Risk: a failed runner registry sub-read could hide projection state.
  Mitigation: Studio keeps projection rows visible and reports the registry
  read failure inside the Runner Registry block.
- Risk: duplicated runner truth in Studio.
  Mitigation: Studio joins Host-provided registry entries with projection rows
  at render time and does not persist or mutate local runner models.

## Open Questions

- Should a later dedicated runner detail drawer include complete capability
  labels, stale/offline thresholds, and assignment links?
