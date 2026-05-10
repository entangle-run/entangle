# Service Volume Health Check Slice

## Current Repo Truth

`references/592-service-volume-maintenance-command-slice.md` added safe
planning and explicit `--apply` commands for stopping and starting the Gitea
and strfry services around service-volume export/import.

Before this slice, operators still had to use the broader deployment doctor or
manual checks to verify that the services came back after maintenance.

## Target Model

The service-volume command group should include a focused, read-only
post-maintenance health check for the services whose volumes it operates on.

The check should not require Host state. It should verify:

- Gitea HTTP reachability;
- strfry relay WebSocket reachability.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `apps/cli/src/index.ts`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/592-service-volume-maintenance-command-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `README.md`

## Concrete Changes Required

- Add a service-volume service health helper with injectable HTTP and WebSocket
  probes.
- Add default Gitea and relay URLs matching the deployment profile defaults.
- Add `entangle deployment service-volumes health`.
- Return machine-readable pass/fail check evidence and set a non-zero CLI exit
  code when the aggregate health status is unhealthy.
- Update deployment docs and implementation ledgers.

## Tests Required

- Red/green helper test for successful Gitea and relay health checks.
- Red/green helper test for failed health checks without throwing.
- Existing service-volume helper tests.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing deployment doctor checks remain available. The new
command is a focused service-volume workflow check.

## Risks And Mitigations

- Risk: operators mistake the health command for a full deployment doctor.
  Mitigation: the command only reports Gitea and strfry health and docs keep it
  scoped to service-volume maintenance.
- Risk: private or remote deployments use non-default URLs. Mitigation: the CLI
  exposes `--gitea-url` and `--relay-url`.

## Open Questions

`references/594-service-volume-disposable-roundtrip-slice.md` adds the
Docker-gated disposable non-dry-run service-volume roundtrip. Future work
should add broader non-disposable upgrade/repair workflows.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/cli dev deployment service-volumes health`
  returned machine-readable `unhealthy` evidence and exit code `1` when the
  local Gitea and relay services were not running.
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-diff local-assumption marker audit
- `git diff` review before commit
