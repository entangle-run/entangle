# Deployment Backup External Volume Inventory Slice

## Current Repo Truth

`entangle deployment backup` creates a versioned bundle for `.entangle/host`,
selected profile config, and restore metadata. It intentionally excludes
secrets and external service state such as Docker volumes, Gitea internals, and
relay data. Before this slice, those exclusions were text-only and did not
record the known federated-dev external volume names.

## Target Model

Backup manifests should make non-disposable external state explicit enough for
operators and future upgrade tooling to see which volumes still need a
separate service-level backup or migration plan.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add an `externalVolumes` inventory to the backup manifest exclusions.
- Record the known excluded federated-dev volumes for Gitea, strfry, and Host
  secret state.
- Include that volume inventory in restore warnings.
- Extend backup/restore tests to assert the manifest and warning evidence.

## Tests Required

- CLI backup command helper tests.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The manifest remains schema version `1` and the new field is additive inside
`exclusions`. Older backup manifests without `externalVolumes` still restore
with a fallback warning.

## Risks And Mitigations

- Risk: operators treat the inventory as a complete service backup. Mitigation:
  warnings still state that external service volumes are not restored by the
  command.
- Risk: future deployment profiles use different volume names. Mitigation:
  this slice records the current federated-dev profile truth and keeps the
  field additive for later profile-specific inventories.

## Open Questions

A future non-disposable upgrade path should add service-specific backup and
restore procedures for Gitea and relay data instead of only recording excluded
volume names.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over CLI, deploy docs, and updated docs
