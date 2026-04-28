# Docker User Client Packaging Slice

## Current Repo Truth

The Human Interface Runtime can serve static User Client assets from
`ENTANGLE_USER_CLIENT_STATIC_DIR`, and `apps/user-client` builds a dedicated
Vite/React app that talks to the runtime-local JSON API.

Before this slice, the federated dev runner image did not include the built
User Client app. User Node runtime contexts started through the Docker launcher
also had a reachability gap: the Human Interface Runtime could start inside a
runner container, but the Docker launcher did not publish a host port or inject
a public User Client URL.

That meant process-runner smokes could expose User Client URLs, but Docker
runner containers could still produce endpoints that were only meaningful
inside the container.

## Target Model

When a User Node runtime context is started through the federated dev Docker
launcher adapter, the human participant should get a real, browser-openable
User Client URL without knowing that the runner is containerized.

The launcher remains an adapter:

- Entangle still treats the User Client as part of the running User Node.
- Studio and CLI observe the User Client URL through Host projection.
- Docker-specific port publication is confined to the Docker launcher layer.
- Remote/federated runners can still provide their own public URL through
  runner environment/configuration.

## Impacted Modules And Files

- `deploy/federated-dev/docker/runner.Dockerfile`
- `services/host/src/docker-engine-client.ts`
- `services/host/src/runtime-backend.ts`
- `services/host/src/runtime-backend.test.ts`
- `apps/cli/src/deployment-doctor-command.ts`
- `apps/cli/src/deployment-doctor-command.test.ts`
- `scripts/federated-dev-profile-paths.mjs`
- `deploy/federated-dev/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/293-runtime-served-user-client-assets-slice.md`

## Concrete Changes

- The federated dev runner image now copies `apps/user-client`, builds it, and
  copies the built app into `/app/user-client`.
- The runner image sets `ENTANGLE_USER_CLIENT_STATIC_DIR=/app/user-client`, so
  Human Interface Runtimes serve the bundled app by default in that image.
- The Docker launcher detects User Node runtime contexts and injects:
  - `ENTANGLE_HUMAN_INTERFACE_HOST=0.0.0.0`;
  - a deterministic `ENTANGLE_HUMAN_INTERFACE_PORT`;
  - `ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL`.
- The Docker Engine client now supports TCP port bindings on managed runtime
  containers.
- Docker User Node runtimes publish the chosen host port to the workstation and
  label the container with the User Client port and public URL.
- `entangle deployment doctor` now checks that the runner image contains the
  bundled User Client assets.
- Federated dev profile preflight now treats the User Client app package and
  primary app file as required profile inputs.

## Tests Required

- Host typecheck.
- CLI typecheck.
- Host runtime-backend tests for Docker User Node port publication.
- CLI deployment-doctor tests for runner User Client asset checks.
- Federated dev profile preflight syntax/config checks.
- Docker Compose config check.
- Runner image build when Docker is available and a full profile validation is
  desired.

## Migration And Compatibility Notes

Existing non-Docker runners are unchanged. They can still serve the built-in
fallback shell when `ENTANGLE_USER_CLIENT_STATIC_DIR` is absent, or serve a
dedicated app from any configured static directory.

Docker-managed User Node runtimes now reserve one host port per User Node. The
default port range starts at `41000` and spans `1000` ports. Operators can
adjust it with:

- `ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_BASE`;
- `ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_RANGE`;
- `ENTANGLE_DOCKER_HUMAN_INTERFACE_PUBLIC_HOST`;
- `ENTANGLE_DOCKER_HUMAN_INTERFACE_BIND_HOST`.

Because this is a development launcher adapter, deterministic ports are
acceptable for now. A future remote runner registration model can report
externally reachable endpoints without Docker-specific assumptions.

This slice does not change the broader runner assignment model. The strongest
current Human Interface proof remains the joined runner/process smoke, where
User Nodes are assigned through signed control events. This slice closes the
Docker adapter reachability gap for User Node contexts without making Docker
the canonical user-node runtime model.

## Risks And Mitigations

- Risk: deterministic host port collision between User Node ids or with another
  local service.
  Mitigation: the port base/range are configurable, and failed container start
  is visible through Docker runtime reconciliation.
- Risk: Docker-specific public URL behavior leaks into the product model.
  Mitigation: the logic is confined to `DockerRuntimeBackend`; the runtime still
  receives normal Human Interface Runtime environment variables.
- Risk: runner image build time increases because it also builds the User
  Client.
  Mitigation: this only affects the runtime image that must actually serve the
  human-node client; the built assets are static and small.

## Open Questions

- Should Docker User Client host-port allocation move from deterministic hashing
  to a Host-reserved port registry before multi-operator or long-lived shared
  machines are supported?
- Should Host projection explicitly state whether a User Client URL came from a
  runner-provided public URL, a Docker launcher adapter, or a remote gateway?
