# Deployment Backup External Volume Summary Slice

## Current Repo Truth

Backup manifests now record the known excluded external service volumes for
Gitea, strfry, and Host secret state. The top-level backup command summary did
not expose that inventory count, so operators had to open the manifest to see
that external state was explicitly recorded.

## Target Model

`entangle deployment backup` should surface a compact external-volume count in
its machine-readable summary while keeping the manifest as the detailed source
of truth.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `externalVolumeCount` to `DeploymentBackupSummary`.
- Populate it from the manifest external-volume inventory.
- Assert the summary count in backup command tests.

## Tests Required

- CLI backup command helper tests.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is an additive summary field. Existing backup manifests and restore paths
remain compatible.

## Risks And Mitigations

- Risk: the count is mistaken for backup coverage. Mitigation: the field is
  named as external volume inventory count and existing warnings continue to
  state that those volumes are not restored.

## Open Questions

`references/586-service-volume-export-import-slice.md` adds the first
service-specific external volume export/import procedure. Future work should
add service-aware quiescing and post-import validation instead of treating the
tar bundle as a full upgrade workflow.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over CLI and updated docs
