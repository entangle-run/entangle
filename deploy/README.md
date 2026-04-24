# Local Operator Profile

This directory contains the first complete local deployment profile for
Entangle.

The profile is intended for a single operator workstation. It is not the final
multi-tenant production control plane.

## Components

- `studio`: static Nginx-served Studio build.
- `host`: `entangle-host` with Docker-backed runtime management.
- `runner-image`: build-only profile that produces `entangle-runner:local`.
- `strfry`: local Nostr relay.
- `gitea`: local git service.
- `entangle-host-state`: shared host and runner state volume.
- `entangle-secret-state`: host-managed secret state volume.

## Preflight

Run the local profile preflight before starting the full Compose topology:

```sh
pnpm ops:check-local
```

The default mode reports Docker availability and daemon access as warnings so
repository checks can still run on machines that are not currently running
Docker.

Use strict mode when validating an operator workstation that should be able to
start the full local profile:

```sh
pnpm ops:check-local:strict
```

Strict mode fails if Docker, Docker Compose, the Docker daemon, or the local
Compose configuration are unavailable.

## Bootstrap

Build the runner image first. `entangle-host` uses this image when it
materializes active node runtimes through the Docker backend.

```sh
docker compose -f deploy/compose/docker-compose.local.yml --profile runner-build build runner-image
```

Then start the stable local services:

```sh
docker compose -f deploy/compose/docker-compose.local.yml up --build studio host strfry gitea
```

Default local URLs:

- Studio: `http://localhost:3000`
- Host API: `http://localhost:7071`
- Gitea HTTP: `http://localhost:3001`
- Strfry relay: `ws://localhost:7777`

## Smoke Test

After the runner image has been built and the stable services are running, run
the active local smoke:

```sh
pnpm ops:smoke-local
```

The smoke checks:

- the required Compose services are running;
- the `entangle-runner:local` image exists;
- host status and host event list endpoints respond with expected JSON shapes;
- Studio serves the application shell;
- Gitea exposes its version endpoint;
- the local `strfry` relay accepts a Nostr WebSocket subscription.

Environment overrides:

- `ENTANGLE_HOST_URL` or `ENTANGLE_LOCAL_HOST_URL`
- `ENTANGLE_STUDIO_URL` or `ENTANGLE_LOCAL_STUDIO_URL`
- `ENTANGLE_GITEA_URL` or `ENTANGLE_LOCAL_GITEA_URL`
- `ENTANGLE_STRFRY_URL` or `ENTANGLE_LOCAL_RELAY_URL`
- `ENTANGLE_HOST_TOKEN` or `ENTANGLE_HOST_OPERATOR_TOKEN`
- `ENTANGLE_LOCAL_SMOKE_TIMEOUT_MS`

Use `--skip-compose` only when validating endpoint reachability outside the
repository's Compose project. Use `--skip-runner-image` only when the smoke is
not intended to prove runtime materialization readiness.

## Operator Token

The local profile defaults to a tokenless host for development ergonomics.
Set `ENTANGLE_HOST_OPERATOR_TOKEN` on the `host` service when a local profile
must reject unauthenticated host access.

Studio can propagate the token through `VITE_ENTANGLE_HOST_TOKEN`.
The CLI can use `--host-token`, `ENTANGLE_HOST_TOKEN`, or local
`ENTANGLE_HOST_OPERATOR_TOKEN` fallback.

## Runtime State

The Compose profile keeps host state and secret state in Docker volumes:

- `entangle-host-state`
- `entangle-secret-state`

Do not delete these volumes unless you intentionally want to reset local host
state, runtime identities, imported packages, and local secret material.

## Reset

To stop the local profile without deleting state:

```sh
docker compose -f deploy/compose/docker-compose.local.yml down
```

To remove local state volumes as well:

```sh
docker compose -f deploy/compose/docker-compose.local.yml down --volumes
```
