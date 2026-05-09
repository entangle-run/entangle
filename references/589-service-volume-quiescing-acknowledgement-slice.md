# Service Volume Quiescing Acknowledgement Slice

## Current Repo Truth

`references/586-service-volume-export-import-slice.md` added real
service-volume export/import helpers and CLI commands. The docs warned
operators to stop or otherwise quiesce Gitea and relay services before
non-dry-run operations, but the command itself did not enforce any explicit
acknowledgement.

## Target Model

Service-volume export/import should stay dry-run-first. Any non-dry-run
operation must require an explicit operator acknowledgement that the affected
services are stopped or quiesced.

This is not a full service-aware health check, but it prevents accidental live
volume capture or restore through an omitted flag.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `apps/cli/src/index.ts`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/586-service-volume-export-import-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `assumeServicesStopped` to service-volume export/import helper options.
- Reject non-dry-run export without acknowledgement before invoking Docker.
- Reject non-dry-run import without acknowledgement before invoking Docker.
- Add `--assume-services-stopped` to both CLI commands.
- Include acknowledgement status in command summaries.
- Update operator docs and slice references.

## Tests Required

- Red/green CLI helper tests for export/import rejection without
  acknowledgement.
- Existing service-volume helper tests.
- CLI typecheck and lint.
- Service-volume dry-run smoke.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is a deliberate safety change for the newly added service-volume commands.
Dry-run behavior is unchanged. Non-dry-run export/import now requires
`--assume-services-stopped`.

## Risks And Mitigations

- Risk: operators see the new flag as proof that services are actually stopped.
  Mitigation: the flag is named as an acknowledgement and docs keep future
  service-aware health checks explicit.
- Risk: automation created during the previous slice breaks. Mitigation: the
  commands are new and not released; requiring an explicit flag is the safer
  baseline before public use.

## Open Questions

Future work should replace acknowledgement-only safety with service-aware
quiescing checks, post-import health checks, and disposable volume fixtures for
live export/import smoke coverage.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:smoke-deployment-service-volume-tools`

The final slice audit also runs product naming, whitespace, changed-diff marker
checks, and `git diff` review before commit.
