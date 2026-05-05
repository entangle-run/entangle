# Federated Dev Explicit Service Volumes Slice

## Current Repo Truth

Deployment backup manifests record excluded external service volumes named
`gitea-data`, `strfry-data`, and `entangle-secret-state`. The Compose profile
already gave Host state and secret state explicit volume names, but Gitea and
strfry used implicit Compose project-prefixed names. That made backup inventory
and non-disposable upgrade planning drift from actual Compose behavior.

## Target Model

All non-disposable service-state volumes in the federated dev profile should
have stable, explicit names that match backup manifests, restore warnings,
doctor diagnostics, and operator documentation.

## Impacted Modules And Files

- `deploy/federated-dev/compose/docker-compose.federated-dev.yml`
- `deploy/federated-dev/README.md`
- `scripts/check-federated-dev-profile.mjs`
- `apps/cli/src/deployment-doctor-command.ts`
- `apps/cli/src/deployment-doctor-command.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add explicit Compose volume names for `gitea-data` and `strfry-data`.
- Extend the federated dev preflight to fail when required service volumes lack
  explicit names in the Compose profile.
- Extend `entangle deployment doctor` with read-only checks for the known
  external service volumes.
- Warn when legacy Compose-prefixed Gitea/strfry volumes are present but the
  stable named volume is missing.
- Document the migration implication for non-disposable profiles.

## Tests Required

- CLI deployment doctor helper tests.
- CLI typecheck and lint.
- Preflight script check.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit over deployment, CLI, tooling, and
  updated docs.

## Migration And Compatibility Notes

Fresh profiles create the stable `gitea-data` and `strfry-data` volumes. Older
profiles may still have Compose-prefixed volumes such as `compose_gitea-data`
or `compose_strfry-data`; operators should copy service data into the stable
volume names before treating the profile as non-disposable.

## Risks And Mitigations

- Risk: an existing same-machine profile appears empty after the volume-name
  correction. Mitigation: doctor reports legacy prefixed volumes and tells the
  operator to copy data into the stable names.
- Risk: the preflight becomes too strict for fresh profiles. Mitigation: it
  checks static Compose naming, not whether volumes already exist.

## Open Questions

Future work should add service-level backup/export commands for Gitea and relay
state. This slice only makes the names stable and observable.

## Verification

Completed in this slice:

- `node --check scripts/check-federated-dev-profile.mjs`
- `pnpm ops:check-federated-dev`
- `pnpm ops:check-federated-dev:strict`
- `pnpm --filter @entangle/cli test -- src/deployment-doctor-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over deployment, CLI, tooling, and
  updated docs
