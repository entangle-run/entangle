# Entangle Federated Dev Deployment Profile

This directory contains the same-machine development topology for Entangle.
It is a deployment convenience, not a separate product and not a special
runtime profile. Host, relay, git service, Studio, and runner image happen to
run on one workstation, but they should keep using the same boundaries expected
from a federated deployment.

The profile is intended for a single operator workstation. It is not the final
multi-tenant production control plane.

## Components

- `studio`: static Nginx-served Studio build.
- `host`: `entangle-host` with the Docker launcher adapter enabled.
- `runner-image`: build-only profile that produces `entangle-runner:federated-dev`.
- `strfry`: development Nostr relay.
- `gitea`: development git service.
- `entangle-host-state`: Host state volume.
- `entangle-secret-state`: Host-managed secret state volume.

## Preflight

Run the federated dev profile preflight before starting the Compose topology:

```sh
pnpm ops:check-federated-dev
```

The default mode reports Docker availability and daemon access as warnings so
repository checks can still run on machines that are not currently running
Docker.

Use strict mode when validating an operator workstation that should be able to
start the full federated dev profile:

```sh
pnpm ops:check-federated-dev:strict
```

Strict mode fails if Docker, Docker Compose, the Docker daemon, or the Compose
configuration are unavailable.

## Conservative Repair

Preview conservative repair actions without changing Entangle state:

```sh
pnpm --filter @entangle/cli dev deployment repair --skip-live
```

Apply only actions marked safe:

```sh
pnpm --filter @entangle/cli dev deployment repair --skip-live --apply-safe
```

The repair foundation can initialize the `.entangle/host` directory skeleton or
stamp a missing current `state-layout.json` marker. It does not delete observed
runtime state, workspaces, artifacts, source repositories, wiki memory, secrets,
or external service state.

## Bootstrap

Build the runner image first. `entangle-host` uses this image when the Docker
launcher adapter starts development runners.

```sh
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml --profile runner-build build runner-image
```

The host and runner image builds clean TypeScript incremental state before
compilation, exclude `*.tsbuildinfo` files from the Docker context, and assert
that the production payload includes the service `dist/` output plus the
required workspace package build outputs.

The runner runtime image also includes the operational git toolchain required
by the first artifact backend: `git`, `openssh-client`, and CA certificates.

Then start the stable deployment services:

```sh
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml up --build studio host strfry gitea
```

Default development URLs:

- Studio: `http://localhost:3000`
- Host API: `http://localhost:7071`
- Gitea HTTP: `http://localhost:3001`
- Strfry relay: `ws://localhost:7777`

## Backup And Restore

Create a versioned backup bundle for Entangle host state with:

```sh
pnpm --filter @entangle/cli dev deployment backup --output entangle-backup
```

The bundle contains `.entangle/host`, including runtime state, workspaces, git
artifact repositories, and node wiki repositories, plus a snapshot of selected
federated dev profile config files. It explicitly excludes `.entangle-secrets`
and external service state such as Docker volumes, Gitea internals, and relay
data.

Validate a restore without changing Entangle state:

```sh
pnpm --filter @entangle/cli dev deployment restore entangle-backup --dry-run
```

Restore into a clean profile, or replace the current `.entangle/host` only when
that destructive replacement is intentional:

```sh
pnpm --filter @entangle/cli dev deployment restore entangle-backup --force
```

## Smoke Test

After the runner image has been built and the stable services are running, run
the active federated dev smoke:

```sh
pnpm ops:smoke-federated-dev
```

The smoke checks:

- the required Compose services are running;
- the `entangle-runner:federated-dev` image exists;
- host status and host event list endpoints respond with expected JSON shapes;
- Studio serves the application shell;
- Gitea serves its web surface;
- the development `strfry` relay accepts a Nostr WebSocket subscription.

To verify the federated control/observe path against the running development
relay, run:

```sh
pnpm ops:smoke-federated-live-relay
```

This smoke uses real Nostr relay transport for runner hello, Host assignment
control, assignment acceptance, runtime status, and a git-backed artifact ref
projection while keeping Host and runner state in separate temporary roots.

To verify a real joined runner process over the same relay, run:

```sh
pnpm ops:smoke-federated-process-runner
```

This smoke starts a Host HTTP server, launches `entangle-runner join` as a
separate OS process, assigns a node through signed control events, and verifies
the runner-owned materialized context, Host projection, signed User Node
message publication, runner-owned session/conversation intake, and Host
projection of the User Node conversation from runner-signed observations.

For manual OpenCode/provider testing without rebuilding the setup by hand, run:

```sh
pnpm ops:smoke-federated-process-runner -- --keep-running
```

The smoke leaves Host and the joined runner alive, keeps the temporary state
root, and prints CLI commands for publishing a signed `task.request` to the
assigned builder node and inspecting the User Node inbox projection. Stop it
with `Ctrl-C` when the manual test is done.

To verify the support-bundle path against an already-running federated dev
profile, run:

```sh
pnpm ops:smoke-federated-dev:diagnostics
```

The diagnostics smoke writes a temporary redacted `entangle deployment
diagnostics` JSON bundle, validates its stable top-level shape, and removes the
temporary file after the check. The diagnostics bundle includes bounded runtime
turn/approval/artifact evidence when the host is reachable.

To verify the non-destructive reliability support path against an initialized
federated dev profile, run:

```sh
pnpm ops:smoke-federated-dev:reliability
```

The reliability smoke creates a temporary `entangle deployment backup` bundle,
validates `entangle deployment restore --dry-run`, runs
`entangle deployment repair --skip-live --json`, and removes the temporary
backup bundle after the check.

Environment overrides:

- `ENTANGLE_HOST_URL`
- `ENTANGLE_STUDIO_URL`
- `ENTANGLE_GITEA_URL`
- `ENTANGLE_RELAY_URL` or `ENTANGLE_STRFRY_URL`
- `ENTANGLE_HOST_TOKEN` or `ENTANGLE_HOST_OPERATOR_TOKEN`
- `ENTANGLE_SMOKE_TIMEOUT_MS`

Use `--skip-compose` only when validating endpoint reachability outside the
repository's Compose project. Use `--skip-runner-image` only when the smoke is
not intended to prove runtime materialization readiness.

## Disposable Smoke

For CI-like same-machine validation, run the disposable smoke:

```sh
pnpm ops:smoke-federated-dev:disposable
```

The disposable smoke runs strict preflight, builds the runner image, starts the
stable services, waits until `pnpm ops:smoke-federated-dev` passes, and then
tears the Compose profile down with volumes.

Options:

- `--timeout-ms <milliseconds>` controls the total readiness window.
- `--probe-timeout-ms <milliseconds>` controls each smoke probe timeout.
- `--skip-build` reuses an existing `entangle-runner:federated-dev` image.
- `--include-runtime` also runs the Docker-backed runtime lifecycle smoke.
- `--keep-running` leaves services running after the smoke.
- `--preserve-volumes` keeps federated dev profile volumes during teardown.

For the full disposable runtime lifecycle path, use:

```sh
pnpm ops:smoke-federated-dev:disposable:runtime
```

This variant performs the disposable profile smoke and then admits a temporary
package into the host container, applies a temporary graph with a development
model-secret binding, bootstraps development Gitea with a disposable user and
HTTPS token, starts two managed runner containers, verifies restart generation
recreation and the durable restart host event, publishes real NIP-59
`task.request` messages through the development relay, proves provider-backed
OpenAI-compatible execution against a credential-checking model stub, verifies
completed host session and runner-turn state, verifies published git-backed
artifact materialization, verifies downstream retrieval of the upstream
artifact by `ArtifactRef`, stops both runtimes, and tears the profile down with
volumes.

For an already-running federated dev profile, the runtime lifecycle smoke can be
run directly:

```sh
pnpm ops:smoke-federated-dev:runtime
```

The direct runtime smoke mutates the active host catalog and graph for the
smoke run. Prefer the disposable runtime variant unless the current profile is
dedicated to operational testing.

## Operator Token

The federated dev profile defaults to a tokenless host for development
ergonomics. Set `ENTANGLE_HOST_OPERATOR_TOKEN` on the `host` service when a
federated dev profile must reject unauthenticated host access.

Studio can propagate the token through `VITE_ENTANGLE_HOST_TOKEN`. The CLI can
use `--host-token`, `ENTANGLE_HOST_TOKEN`, or
`ENTANGLE_HOST_OPERATOR_TOKEN` fallback.

## Runtime State

The Compose profile keeps host state and secret state in Docker volumes:

- `entangle-host-state`
- `entangle-secret-state`

Those volumes have explicit Compose names because managed runner containers are
created directly by `entangle-host` through the Docker Engine API and must mount
the same volumes that the Compose-managed host container uses. This is a
development launcher adapter constraint, not the target federated execution
model.

Do not delete these volumes unless you intentionally want to reset host state,
runtime identities, imported packages, and secret material.

## Reset

To stop the federated dev profile without deleting state:

```sh
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down
```

To remove Entangle state volumes as well:

```sh
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down --volumes
```
