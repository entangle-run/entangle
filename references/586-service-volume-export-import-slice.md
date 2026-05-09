# Service Volume Export Import Slice

## Current Repo Truth

`entangle deployment backup` already creates a versioned `.entangle/host`
bundle and records excluded external service volumes for Gitea, strfry, and
Host secret state. `entangle deployment doctor` and `entangle deployment
repair` also expose stable service-volume names and older Compose-prefixed
volume migration obligations.

Before this slice, operators still had no concrete Entangle command surface for
exporting or importing the Gitea and relay service volumes. The docs correctly
warned that external service state remained outside the normal Host-state
backup, but the follow-up action was still manual.

## Target Model

Entangle should provide a conservative service-volume bundle path for
non-disposable same-machine deployments:

- export Gitea and strfry volumes into tar archives with Docker;
- write an explicit service-volume manifest;
- support dry-run planning without executing Docker;
- import the same archives back into the named volumes;
- keep Host secret state excluded by default.

This is not a live-service quiescing workflow. Operators must stop or otherwise
quiesce the affected services before using the non-dry-run path.
`references/589-service-volume-quiescing-acknowledgement-slice.md` adds the
first enforcement step by requiring `--assume-services-stopped` before
non-dry-run export/import can invoke Docker.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `apps/cli/src/index.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/535-deployment-backup-external-volume-inventory-slice.md`
- `references/536-deployment-backup-external-volume-summary-slice.md`
- `references/539-federated-dev-explicit-service-volumes-slice.md`
- `references/543-deployment-repair-previous-service-volume-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add service-volume export/import helpers to the deployment backup module.
- Use a typed `entangle-service-volume-backup` manifest with Gitea and strfry
  archive records.
- Add dry-run support that returns Docker command plans without mutating state.
- Execute export/import through an injectable command runner, defaulting to
  Docker.
- Add `entangle deployment service-volumes export`.
- Add `entangle deployment service-volumes import`.
- Keep `entangle-secret-state` outside the service-volume bundle.
- Update backup/restore docs and remaining-gap references.

## Tests Required

- Red/green CLI helper tests for dry-run export, real export command/manifest
  generation, and dry-run import from a validated manifest.
- CLI typecheck.
- CLI lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing Host-state backups remain compatible and still do
not contain service volumes. New service-volume bundles have their own manifest
product marker and should be moved or retained separately from normal
`.entangle/host` backups.

The command exports Gitea and strfry volumes only. Host secret volume handling
stays outside this path so secret backup and rotation can remain an explicit
operator policy.

## Risks And Mitigations

- Risk: exporting a live service captures inconsistent state. Mitigation: docs
  frame the command as a conservative bundle path and tell operators to quiesce
  services before non-dry-run export/import.
- Risk: secret material is accidentally bundled. Mitigation: the manifest
  records `secretsIncluded: false`, and only Gitea/strfry volumes are selected.
- Risk: Docker command generation becomes hard to test. Mitigation: helpers use
  an injected command runner and tests assert deterministic command arguments.

## Open Questions

Future work should replace acknowledgement-only safety with service-aware
quiescing, health checks before/after import, and guided upgrade workflows for
older non-disposable profiles.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`

The final slice audit also runs CLI lint, product naming, whitespace,
changed-diff marker checks, and `git diff` review before commit.
