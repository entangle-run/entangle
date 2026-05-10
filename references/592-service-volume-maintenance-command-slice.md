# Service Volume Maintenance Command Slice

## Current Repo Truth

Service-volume workflows now have read-only status and guarded export/import,
but the remaining docs still asked for guided service stop/start behavior before
and after non-disposable service-volume operations.

Before this slice, operators had to remember the exact Docker Compose commands
for stopping and restarting the Gitea and strfry services.

## Target Model

Entangle should provide conservative helper commands that plan the service
maintenance commands by default and execute them only when the operator passes
`--apply`.

The commands are local adapter tooling. They do not change the federated runtime
architecture and do not become a Host-runner protocol shortcut.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `apps/cli/src/index.ts`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/591-service-volume-status-surface-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `README.md`

## Concrete Changes Required

- Add a service-volume maintenance planner for `start` and `stop`.
- Keep planning non-mutating by default.
- Execute `docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml stop gitea strfry`
  only through `stop-services --apply`.
- Execute `docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up -d gitea strfry`
  only through `start-services --apply`.
- Add CLI commands under `entangle deployment service-volumes`.
- Update operator docs and implementation ledgers.

## Tests Required

- Red/green CLI helper test proving stop planning does not execute Docker
  Compose.
- Red/green CLI helper test proving start with `apply` executes the expected
  Docker Compose command.
- Existing service-volume helper tests.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing Docker Compose commands remain valid. The new CLI
commands provide a safer discoverable wrapper with non-mutating default
behavior.

## Risks And Mitigations

- Risk: operators assume planning stopped services. Mitigation: summaries carry
  `applied: false` and `status: "planned"` unless `--apply` is present.
- Risk: local adapter commands are confused with the federated runtime control
  plane. Mitigation: docs explicitly scope these helpers to service-volume
  maintenance for the deployment profile.

## Open Questions

`references/593-service-volume-health-check-slice.md` adds the focused
post-maintenance Gitea/relay health check.
`references/594-service-volume-disposable-roundtrip-slice.md` adds the
Docker-gated disposable non-dry-run volume fixture.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`

The final slice audit also runs CLI typecheck, CLI lint, planning command
execution, product naming, whitespace, changed-diff marker checks, and
`git diff` review before commit.
