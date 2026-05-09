# Service Volume Status Surface Slice

## Current Repo Truth

Service-volume export/import now has three safety layers:

- dry-run planning through `references/586-service-volume-export-import-slice.md`;
- explicit stopped-service acknowledgement through
  `references/589-service-volume-quiescing-acknowledgement-slice.md`;
- running-container rejection through
  `references/590-service-volume-running-container-check-slice.md`.

Before this slice, an operator could see quiescence evidence only by attempting
a real export/import after passing the acknowledgement flag.

## Target Model

Operators should have a read-only service-volume status surface that answers:

- whether each stable service volume exists;
- whether a running container is currently using it;
- whether export/import is currently safe to attempt.

The status surface must not mutate Docker state or require Host state.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `apps/cli/src/index.ts`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/590-service-volume-running-container-check-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `README.md`

## Concrete Changes Required

- Add an `inspectDeploymentServiceVolumes` helper.
- Inspect `gitea-data` and `strfry-data` with `docker volume inspect`.
- Run the existing volume-based running-container check only when the volume
  exists.
- Return a machine-readable status summary with `ready`, `in_use`, `missing`,
  and `unavailable` entries.
- Add `entangle deployment service-volumes status`.
- Update deployment docs.

## Tests Required

- Red/green CLI helper test for one ready volume and one in-use volume.
- Red/green CLI helper test proving missing volumes do not trigger running
  container inspection.
- Existing service-volume helper tests.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing backup, restore, export, import, and dry-run command
behavior is unchanged.

## Risks And Mitigations

- Risk: operators treat `missing` as safe. Mitigation: the aggregate
  `readyForExportImport` remains false unless all target volumes exist and are
  not mounted by running containers.
- Risk: the command requires Docker even though it is read-only. Mitigation:
  service-volume status is explicitly about Docker-managed service volumes.

## Open Questions

Future work should add guided service stop/start orchestration and post-import
service health validation after restored services are restarted.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`

The final slice audit also runs CLI typecheck, CLI lint, product naming,
whitespace, changed-diff marker checks, and `git diff` review before commit.
