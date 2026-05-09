# Studio User Node Runner Candidates Slice

## Current Repo Truth

The CLI now exposes health-aware User Node runner candidates and an opt-in
`--require-recommended-runner` preflight for assignment mutation. Studio already
showed User Node runtime summaries, prepared the generic assignment form from a
User Node row, and opened the current assignment timeline.

Before this slice, Studio did not show the same runner candidate reasoning
inside the visual User Node roster. Operators had to leave the row, inspect
generic runner registry data, and infer the safest target runner manually.

## Target Model

Studio should remain the admin/operator surface and should show the same
Host-derived runner candidate signals that the CLI exposes. The visual row
should not mutate assignment state directly; it should prepare the existing
Host assignment form with a selected candidate runner.

## Impacted Modules And Files

- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/506-canonical-user-node-surface-spec-repair.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio helper support for User Node runner candidate summaries from Host
  projection and runner registry entries.
- Include trust state, liveness, operational state, active assignment ids,
  current User Node assignment ids, capacity, capacity after explicit User Node
  revocation, recommended state, and exclusion reasons.
- Add formatter helpers for compact visual labels and details.
- Render the top candidate rows inside each User Node runtime summary.
- Let operators prepare the assignment form with a recommended candidate runner
  without issuing assignment mutation from the row.

## Tests Required

- Studio helper coverage for candidate selection, current-runner detection,
  incompatible runner exclusion, non-recommended runner reasons, and label/detail
  formatting.
- Studio typecheck.
- Studio focused lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No data migration is required. Studio consumes existing Host projection and
runner registry state. Assignment mutation still uses the existing Host
assignment form and Host assignment API.

## Risks And Mitigations

- Risk: Studio appears to schedule User Nodes client-side. Mitigation: row
  buttons only prepare the assignment form; the operator still submits through
  the existing Host mutation path.
- Risk: visual rows become noisy. Mitigation: only the first three candidate
  rows are shown per User Node.
- Risk: current runners look unavailable when they are full only because they
  host the selected User Node. Mitigation: candidate detail shows capacity both
  before and after explicit User Node revocation.

## Open Questions

Advanced reassignment workflows can still add draining, scheduled movement,
participant-visible placement notices, and safer bulk movement controls.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/studio test -- federation-inspection.test.ts`
- `tsc -b apps/studio/tsconfig.json --pretty false`
- `eslint apps/studio/src/App.tsx apps/studio/src/federation-inspection.ts apps/studio/src/federation-inspection.test.ts --max-warnings 0`

The final slice audit also runs product naming, whitespace, changed-diff
marker checks, and `git diff` review before commit.
