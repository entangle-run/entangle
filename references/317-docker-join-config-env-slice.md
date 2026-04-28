# Docker Join Config Env Slice

## Current Repo Truth

The Docker launcher adapter already had a join bootstrap mode, but it still
delivered `runner-join.json` through a Host-visible path mounted into the
managed runner container. That preserved the old shared-volume assumption even
when the runner joined through the federated control path.

Joined runners could only auto-detect join mode from
`ENTANGLE_RUNNER_JOIN_CONFIG_PATH`, not from inline config.

## Target Model

Managed Docker runners should start like remote runners: with explicit config
and environment, not with privileged access to Host state volumes. Same-machine
Docker remains a launcher adapter, but the runner container should not need to
mount Host state or secret volumes just to join.

## Impacted Modules/Files

- `services/runner/src/join-config.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `services/host/src/runtime-backend.ts`
- `services/host/src/runtime-backend.test.ts`
- `services/host/src/state.ts`
- `deploy/federated-dev/compose/docker-compose.federated-dev.yml`
- `references/221-federated-runtime-redesign-index.md`
- `references/222-current-state-codebase-audit.md`
- `references/230-migration-from-local-assumptions-plan.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `ENTANGLE_RUNNER_JOIN_CONFIG_JSON` support to the runner.
- Make runner startup auto-select join mode when inline join config JSON is
  present.
- Make the Docker launcher default join config delivery to inline JSON env in
  join mode, while keeping path delivery available through
  `ENTANGLE_DOCKER_RUNNER_JOIN_CONFIG_DELIVERY=path`.
- Avoid mounting Host state and secret volumes into managed runner containers
  when Docker join mode uses inline JSON delivery.
- Add `ENTANGLE_DOCKER_RUNNER_HOST_API_URL` support so Host-produced runtime
  join configs can carry a Host API bundle/identity-secret retrieval surface.
- Configure the federated dev Compose Host to launch managed runners in join
  mode with inline JSON config and Host API URL.

## Tests Required

- Runner typecheck and join startup tests.
- Host typecheck and Docker runtime backend tests.
- Host and runner lint/build.
- Federated process-runner smoke remains the no-shared-filesystem proof for
  process runners; Docker profile still needs a dedicated live Docker smoke
  after this adapter change.

## Migration/Compatibility Notes

Direct runtime-context bootstrap still exists for compatibility tests and
manual debugging. Docker join mode still supports path delivery when explicitly
configured, but the federated dev Compose profile now selects inline JSON
delivery.

The Host container still owns Host state volumes. The change removes those
volumes from managed runner containers in join JSON mode.

## Risks And Mitigations

- Risk: deployments relying on path-mounted join configs may need time to move.
  Mitigation: `ENTANGLE_DOCKER_RUNNER_JOIN_CONFIG_DELIVERY=path` preserves the
  old delivery behavior.
- Risk: Docker-managed runners need Host API reachability for portable
  bootstrap bundles.
  Mitigation: the Compose profile now sets
  `ENTANGLE_DOCKER_RUNNER_HOST_API_URL=http://host:7071`.

## Open Questions

- Should Docker-managed runner state use named per-runner volumes for
  persistence, or stay disposable until a non-disposable upgrade/repair profile
  is specified?
- Should runner bootstrap use a narrower Host API token instead of the
  bootstrap operator token when Host auth is enabled?
