# Service Volume Disposable Roundtrip Slice

## Current Repo Truth

`entangle deployment service-volumes export/import` already supports dry-run
planning, explicit stopped-service acknowledgement, running-container guards,
service maintenance helpers, and a focused post-maintenance Gitea/relay health
check.

Before this slice, the only service-volume smoke was dry-run-only. A real
non-dry-run export/import test would have had to target the stable
`gitea-data` and `strfry-data` volumes, which is not acceptable for routine
development verification.

## Target Model

The deployment tooling should support disposable, operator-provided service
volume names for test fixtures and custom profile recovery while keeping the
default profile volumes unchanged.

The smoke should exercise the real Docker archive path when Docker is
available, but it must never mutate the stable profile volumes.

## Impacted Modules And Files

- `apps/cli/src/deployment-backup-command.ts`
- `apps/cli/src/deployment-backup-command.test.ts`
- `apps/cli/src/index.ts`
- `scripts/smoke-deployment-service-volume-roundtrip.mjs`
- `package.json`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/593-service-volume-health-check-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `README.md`

## Concrete Changes Required

- Add validated service-volume binding resolution for Gitea and relay volume
  names.
- Let service-volume `status` and `export` accept explicit Gitea/relay volume
  names.
- Keep `import` manifest-driven so a bundle restores into the volume names it
  recorded at export time.
- Add a root smoke that creates disposable Docker volumes, seeds fixture data,
  exports, recreates the volumes, imports, and verifies restored content.
- Keep the smoke non-destructive when Docker is unavailable by skipping unless
  `--require-docker` is passed.

## Tests Required

- Red/green helper tests for explicit service-volume bindings in export.
- Red/green helper tests for custom service-volume status inspection.
- Red/green validation test for unsafe Docker volume names.
- CLI dry-run proof for custom volume flags.
- Docker-gated disposable non-dry-run roundtrip smoke.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The default profile behavior remains unchanged. Operators who do not pass
custom volume names continue to target `gitea-data` and `strfry-data`.

The custom volume flags are additive and intended for disposable verification,
custom profile recovery, and explicit operator-directed migrations.

## Risks And Mitigations

- Risk: custom volume flags could be used against the wrong service data.
  Mitigation: the flags are explicit, validated as Docker volume names, and
  non-dry-run mutation still requires `--assume-services-stopped` plus running
  container checks.
- Risk: the smoke is mistaken for proof that the stable profile is backed up.
  Mitigation: docs describe it as a disposable fixture smoke; stable profile
  operations remain separate operator actions.
- Risk: CI machines without Docker cannot run the full roundtrip. Mitigation:
  the smoke skips by default without Docker and supports `--require-docker` for
  infrastructure-backed gates.

## Open Questions

`references/595-service-volume-previous-migration-command-slice.md` adds the
guided migration command for the known previous Compose-prefixed service
volumes. Future work should add broader non-disposable upgrade and repair
workflows. `references/596-service-volume-required-roundtrip-gate-slice.md`
adds the dedicated no-skip Docker-required root command for physical proof
environments.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-backup-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/cli dev deployment service-volumes export --dry-run --output /tmp/entangle-custom-volume-green --gitea-volume entangle-fixture-gitea-data --relay-volume entangle-fixture-strfry-data`
- `pnpm ops:smoke-deployment-service-volume-tools`
- `pnpm ops:smoke-deployment-service-volume-roundtrip -- --require-docker`
  initially exposed a PATH issue when Docker became available; the smoke now
  falls back to `npm exec pnpm@10.18.3` and passed with disposable Docker
  volumes.

The final slice audit also runs product naming, whitespace, changed-diff marker
checks, and `git diff` review before commit.
