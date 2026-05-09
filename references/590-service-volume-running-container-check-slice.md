# Service Volume Running Container Check Slice

## Current Repo Truth

`references/586-service-volume-export-import-slice.md` added service-volume
export/import bundles for Gitea and strfry state.
`references/589-service-volume-quiescing-acknowledgement-slice.md` then made
non-dry-run operations require `--assume-services-stopped`.

Before this slice, that flag was an operator acknowledgement only. The command
did not inspect whether a running container still had one of the target volumes
mounted.

## Target Model

Non-dry-run service-volume export/import must remain explicit and dry-run-first.
After the operator acknowledgement is present, the command should also fail
before archive mutation if Docker reports any running container using one of the
target service volumes.

The check is intentionally volume-based rather than Compose-project-based so it
can catch any running container that has mounted `gitea-data` or `strfry-data`.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/586-service-volume-export-import-slice.md`
- `references/589-service-volume-quiescing-acknowledgement-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `README.md`

## Concrete Changes Required

- Run `docker ps --filter volume=<volume> --format {{.Names}}` before
  non-dry-run service-volume export/import archive commands.
- Reject export/import when a target volume is still mounted by one or more
  running containers.
- Keep dry-run output non-mutating and free of Docker daemon inspection.
- Include quiescence-check evidence in operation summaries.
- Update operator docs so `--assume-services-stopped` is an acknowledgement and
  the command also performs a running-container guard.

## Tests Required

- Red/green CLI helper tests proving export rejects a running mounted target
  volume before archive commands execute.
- Red/green CLI helper tests proving import rejects a running mounted target
  volume before restore commands execute.
- Existing service-volume helper tests.
- CLI typecheck and lint.
- Service-volume dry-run smoke.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is a safety hardening change for newly added service-volume commands.
Dry-run behavior is unchanged. Non-dry-run operations already require
`--assume-services-stopped`; they now also require Docker's running-container
view to show no active container using the target service volumes.

## Risks And Mitigations

- Risk: Docker daemon access failure blocks real export/import even when the
  operator knows services are stopped. Mitigation: real archive operations
  already require Docker daemon access, and failing before mutation is safer.
- Risk: non-Compose containers using the same volume names cause unexpected
  rejection. Mitigation: this is intentional because the data volume is still in
  active use.
- Risk: the check is mistaken for a full post-restore health check. Mitigation:
  docs keep post-import service health validation as a separate remaining gap.

## Open Questions

Future work should add post-import service health checks, guided service
stop/start orchestration, and disposable volume fixtures that can exercise the
non-dry-run path in CI without touching operator data.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`

The final slice audit also runs CLI typecheck, CLI lint, service-volume dry-run
smoke, product naming, whitespace, changed-diff marker checks, and `git diff`
review before commit.
