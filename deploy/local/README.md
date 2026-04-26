# Entangle Local Deployment Profile

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
docker compose -f deploy/local/compose/docker-compose.local.yml --profile runner-build build runner-image
```

The host and runner image builds clean TypeScript incremental state before
compilation, exclude local `*.tsbuildinfo` files from the Docker context, and
assert that the production payload includes the service `dist/` output plus the
required workspace package build outputs.

The runner runtime image also includes the operational git toolchain required
by the first artifact backend (`git`, `openssh-client`, and CA certificates).

Then start the stable local services:

```sh
docker compose -f deploy/local/compose/docker-compose.local.yml up --build studio host strfry gitea
```

Default local URLs:

- Studio: `http://localhost:3000`
- Host API: `http://localhost:7071`
- Gitea HTTP: `http://localhost:3001`
- Strfry relay: `ws://localhost:7777`

## Backup and Restore

Create a versioned backup bundle for Local host state with:

```sh
pnpm --filter @entangle/cli dev local backup --output entangle-local-backup
```

The bundle contains `.entangle/host`, including runtime state, workspaces, git
artifact repositories, and node wiki repositories, plus a snapshot of selected
Local profile config files. It explicitly excludes `.entangle-secrets` and
external service state such as Docker volumes, Gitea internals, and relay data.

Validate a restore without changing local state:

```sh
pnpm --filter @entangle/cli dev local restore entangle-local-backup --dry-run
```

Restore into a clean profile, or replace the current `.entangle/host` only when
that destructive replacement is intentional:

```sh
pnpm --filter @entangle/cli dev local restore entangle-local-backup --force
```

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
- Gitea serves its local web surface;
- the local `strfry` relay accepts a Nostr WebSocket subscription.

To verify the support-bundle path against an already-running Local profile,
run:

```sh
pnpm ops:smoke-local:diagnostics
```

The diagnostics smoke writes a temporary redacted `entangle local diagnostics`
JSON bundle, validates its stable top-level shape, and removes the temporary
file after the check.

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

## Disposable Smoke

For CI-like local validation, run the disposable smoke:

```sh
pnpm ops:smoke-local:disposable
```

The disposable smoke runs strict preflight, builds the local runner image,
starts the stable services, waits until `pnpm ops:smoke-local` passes, and then
tears the Compose profile down with volumes.

Options:

- `--timeout-ms <milliseconds>` controls the total readiness window.
- `--probe-timeout-ms <milliseconds>` controls each smoke probe timeout.
- `--skip-build` reuses an existing `entangle-runner:local` image.
- `--include-runtime` also runs the Docker-backed runtime lifecycle smoke.
- `--keep-running` leaves services running after the smoke.
- `--preserve-volumes` keeps local profile volumes during teardown.

For the full disposable runtime lifecycle path, use:

```sh
pnpm ops:smoke-local:disposable:runtime
```

This variant performs the disposable profile smoke and then admits a temporary
package into the host container, applies a temporary graph with a local
model-secret binding, bootstraps local Gitea with a disposable user and HTTPS
token, starts two managed runner containers, verifies restart generation
recreation and the durable restart host event, publishes real NIP-59
`task.request` messages through the local relay, proves provider-backed
OpenAI-compatible execution against a credential-checking model stub, verifies
completed host session and runner-turn state, verifies published git-backed
artifact materialization, verifies downstream retrieval of the upstream
artifact by `ArtifactRef`, stops both runtimes, and tears the profile down
with volumes.

For an already-running local profile, the runtime lifecycle smoke can be run
directly:

```sh
pnpm ops:smoke-local:runtime
```

The direct runtime smoke mutates the active host catalog and graph for the
smoke run. Prefer the disposable runtime variant unless the current local
profile is dedicated to operational testing.

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

Those volumes have explicit Compose names because managed runner containers are
created directly by `entangle-host` through the Docker Engine API and must mount
the same volumes that the Compose-managed host container uses.

Do not delete these volumes unless you intentionally want to reset local host
state, runtime identities, imported packages, and local secret material.

## Reset

To stop the local profile without deleting state:

```sh
docker compose -f deploy/local/compose/docker-compose.local.yml down
```

To remove local state volumes as well:

```sh
docker compose -f deploy/local/compose/docker-compose.local.yml down --volumes
```
