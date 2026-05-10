# Service Volume Required Roundtrip Gate Slice

## Current Repo Truth

`pnpm ops:smoke-deployment-service-volume-roundtrip` can now perform a real
non-dry-run disposable Docker volume export/import roundtrip when Docker is
available, and it skips non-destructively when Docker is unavailable.

Before this slice, infrastructure-backed CI had to remember to pass
`--require-docker` manually.

## Target Model

The repository should expose a dedicated root command for physical or
Docker-enabled CI gates where skipping is not acceptable.

## Impacted Modules And Files

- `package.json`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/594-service-volume-disposable-roundtrip-slice.md`
- `references/595-service-volume-previous-migration-command-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `README.md`

## Concrete Changes Required

- Add `pnpm ops:smoke-deployment-service-volume-roundtrip:required`.
- Wire it to `node scripts/smoke-deployment-service-volume-roundtrip.mjs --require-docker`.
- Update docs so optional local smoke and required physical/CI smoke are
  clearly distinct.

## Tests Required

- Red/green root script invocation.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. The existing optional smoke still skips without Docker; the
new alias is for environments that must fail if Docker is unavailable.

## Risks And Mitigations

- Risk: developers run the required gate on machines without Docker and see a
  failure. Mitigation: docs keep the optional smoke as the local default and
  label the required gate for Docker-enabled CI or physical proof machines.

## Open Questions

Broader infrastructure-backed multi-machine proof orchestration remains outside
this slice.

## Verification

Completed in this slice:

- `pnpm ops:smoke-deployment-service-volume-roundtrip:required` failed before
  the alias existed.
- `pnpm ops:smoke-deployment-service-volume-roundtrip:required` passed after
  the alias was added, creating disposable Docker volumes and verifying
  restored content.
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-diff local-assumption marker audit
- `git diff` review before commit
