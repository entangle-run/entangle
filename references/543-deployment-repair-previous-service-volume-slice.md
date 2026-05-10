# Deployment Repair Previous Service Volume Slice

## Current Repo Truth

`entangle deployment doctor` already detects the two known previous
Compose-prefixed service volume names for Gitea and strfry when the stable
`gitea-data` or `strfry-data` volumes are missing. `entangle deployment
repair` ran the same doctor report, but it did not turn that evidence into a
repair action. Operators therefore had to infer the migration work from doctor
warnings instead of seeing it in the repair plan.

## Target Model

The repair command should present every conservative operational repair action
that can be derived from the doctor report. Service-owned data migration is not
safe to apply automatically, so previous service volumes must become explicit
manual actions rather than `--apply-safe` mutations.

## Impacted Modules And Files

- `apps/cli/src/deployment-repair-command.ts`
- `apps/cli/src/deployment-repair-command.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/543-deployment-repair-previous-service-volume-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Derive manual repair actions from doctor evidence when a previous
  Compose-prefixed Gitea or strfry service volume exists and the stable volume
  is missing.
- Keep those actions at `risk: "manual"` and `status: "manual"` so
  `--apply-safe` cannot copy or mutate service-owned data.
- Keep host-state safe repairs unchanged.
- Render the manual actions in the existing human-readable repair output.
- Cover dry-run and `--apply-safe` behavior in CLI helper tests.

## Tests Required

- CLI deployment repair helper tests.
- CLI typecheck.
- CLI lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit over the touched CLI and docs.

## Migration And Compatibility Notes

No state is modified by this slice. Existing profiles with previous
Compose-prefixed service volumes now get an explicit manual repair plan telling
operators to back up the service, copy data into the stable volume name, and
rerun doctor before treating the profile as non-disposable.

## Risks And Mitigations

- Risk: automatic migration could corrupt service data.
  Mitigation: the actions are manual and are never applied by `--apply-safe`.
- Risk: repair and doctor drift.
  Mitigation: repair derives the action from the doctor report rather than
  running a second independent volume-inspection policy.
- Risk: operators miss the manual action when safe repairs also exist.
  Mitigation: manual actions are included alongside safe state actions and make
  the overall repair status `manual` until resolved.

## Open Questions

`references/586-service-volume-export-import-slice.md` adds first service-level
export/import tooling for Gitea and relay state.
`references/595-service-volume-previous-migration-command-slice.md` adds the
focused previous-to-stable service-volume migration command while keeping this
repair slice manual-only: `--apply-safe` still does not copy service-owned data.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-repair-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over the touched CLI and docs
