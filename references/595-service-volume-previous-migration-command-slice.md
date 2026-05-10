# Service Volume Previous Migration Command Slice

## Current Repo Truth

Doctor and repair already detect previous Compose-prefixed Gitea/strfry volumes
when stable `gitea-data` or `strfry-data` volumes are missing. Repair exposes
those findings as manual actions, and `--apply-safe` deliberately does not
copy service-owned data.

Before this slice, operators had no focused command that turned that manual
finding into an explicit previous-to-stable volume migration plan.

## Target Model

Previous service-volume migration should be a service-volume operation, not a
safe Host-state repair.

The command should:

- default to a non-mutating plan;
- inspect previous and stable volume existence;
- show the exact Docker copy command for each ready migration;
- apply only when the operator passes both `--apply` and
  `--assume-services-stopped`;
- refuse to copy mounted service volumes through the same running-container
  guard used by service-volume export/import.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `apps/cli/src/index.ts`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/543-deployment-repair-previous-service-volume-slice.md`
- `references/586-service-volume-export-import-slice.md`
- `references/594-service-volume-disposable-roundtrip-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `README.md`

## Concrete Changes Required

- Add a previous service-volume migration planner for
  `compose_gitea-data -> gitea-data` and
  `compose_strfry-data -> strfry-data`.
- Add guarded apply behavior using a Docker tar pipe from the previous volume
  into the stable volume.
- Add `entangle deployment service-volumes migrate-previous`.
- Keep `entangle deployment repair --apply-safe` unchanged: it reports manual
  action evidence but does not mutate service data.
- Update deployment docs and implementation ledgers.

## Tests Required

- Red/green helper test for dry-run migration planning.
- Red/green helper test that apply requires stopped-service acknowledgement.
- Red/green helper test for guarded apply command ordering.
- CLI dry-run proof for the new command.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing stable-volume profiles are reported as `not_needed`.
Profiles without either previous or stable volumes are reported as blocked by a
missing source.

The command targets the known previous Compose-prefixed volume names from the
federated dev profile migration. It does not claim to migrate arbitrary
third-party service layouts.

## Risks And Mitigations

- Risk: service data is copied while a service is still running. Mitigation:
  apply requires `--assume-services-stopped` and runs Docker
  running-container checks before each copy.
- Risk: operators mistake this for safe repair. Mitigation: the command lives
  under `deployment service-volumes`; repair continues to report manual action
  evidence without mutating service data.
- Risk: copying into an existing stable volume overwrites or merges unexpected
  data. Mitigation: existing stable volumes are reported as `not_needed` and
  are not copied into by this command.

## Open Questions

Future work should add broader non-disposable profile upgrade rehearsals beyond
the known previous Compose-prefixed service-volume migration.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:smoke-deployment-service-volume-tools`
- `pnpm ops:smoke-deployment-service-volume-roundtrip -- --require-docker`
- `pnpm --filter @entangle/cli dev deployment service-volumes migrate-previous`
  returned a non-mutating plan against the current Docker volume state.
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-diff local-assumption marker audit
- `git diff` review before commit
