# Docker Runner Join Default Slice

## Current Repo Truth

The federated dev Compose profile explicitly selected Docker runner join mode
with inline JSON join config delivery, but the Docker runtime backend still
defaulted to direct runtime-context bootstrap when
`ENTANGLE_DOCKER_RUNNER_BOOTSTRAP` was unset. The Compose profile also still
declared runner shared-state/secret mount environment variables even though
join-mode JSON delivery does not mount those volumes into managed runner
containers.

## Target Model

Docker is a same-machine launcher adapter over the federated runtime model.
Its default managed-runner bootstrap should be generic `join`, not direct
runtime-context startup. Direct runtime-context bootstrap should remain only as
an explicit compatibility/debug mode.

## Impacted Modules/Files

- `services/host/src/runtime-backend.ts`
- `services/host/src/runtime-backend.test.ts`
- `deploy/federated-dev/compose/docker-compose.federated-dev.yml`
- `deploy/federated-dev/README.md`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/230-migration-from-local-assumptions-plan.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Change the Docker runtime backend default bootstrap mode to `join`.
- Keep `ENTANGLE_DOCKER_RUNNER_BOOTSTRAP=runtime-context` as explicit
  compatibility behavior.
- Remove unused shared runner state/secret mount environment defaults from the
  federated dev Compose host service.
- Update tests so runtime-context behavior is explicitly opted into and join
  mode is proven as the default.
- Update docs to classify direct runtime-context startup as compatibility/debug
  only.

## Tests Required

- `pnpm --filter @entangle/host test -- src/runtime-backend.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:check-federated-dev`
- `pnpm ops:check-product-naming`
- search for old local product identity markers across the repository
- `git diff --check`

## Migration/Compatibility Notes

Operators who intentionally need direct runtime-context Docker startup must set
`ENTANGLE_DOCKER_RUNNER_BOOTSTRAP=runtime-context`. The active federated dev
profile already uses join mode, so normal Compose behavior remains aligned.

## Risks And Mitigations

- Risk: hidden users relied on the previous Docker default.
  Mitigation: the project is pre-release, and the compatibility mode remains
  explicit through an environment variable.
- Risk: direct debug mode loses access to Host state paths.
  Mitigation: only the federated dev profile stops advertising shared mount
  env defaults; explicit debug deployments can still configure their own mount
  targets if they opt into runtime-context bootstrap.
- Risk: Docker same-machine behavior drifts from the process smoke.
  Mitigation: the default now matches generic runner join semantics, and
  targeted Host backend tests cover both default join and explicit
  compatibility modes.

## Open Questions

None for this slice.
