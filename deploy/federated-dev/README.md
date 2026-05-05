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
It also builds and bundles `apps/user-client` at `/app/user-client` and sets
`ENTANGLE_USER_CLIENT_STATIC_DIR=/app/user-client`, so Docker-backed
Human Interface Runtimes serve the dedicated User Client app by default.

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

This smoke starts a Host HTTP server, launches separate `entangle-runner join`
OS processes for an agent runner and two User Node `human_interface` runners,
assigns all three nodes through signed control events, and verifies
runner-owned materialized contexts, User Client health/state, Host projection,
signed User Node message publication from two distinct User Node identities,
runner-owned session/conversation intake, Host projection of both User Node
conversations from runner-signed observations, visible source diff/file review,
and visible artifact history/diff reads through the running User Client.

For manual OpenCode/provider testing without rebuilding the setup by hand, run:

```sh
pnpm ops:demo-user-node-runtime
```

The demo builds the dedicated User Client app, starts the development relay,
then runs the process-runner smoke in `--keep-running` mode. The smoke leaves
Host and all joined runners alive, keeps the temporary state root, prints both
User Client URLs, and prints CLI commands for publishing a signed
`task.request` to the assigned builder node, inspecting the User Node inbox
projection, and listing runner turn events. Pass `--skip-build` when
`apps/user-client/dist` is already current, or `--user-client-static-dir <path>`
to use another built app directory. Stop it with `Ctrl-C` when the manual test
is done.

To validate provider plumbing without live API credentials, run the
deterministic OpenAI-compatible development provider in another terminal:

```sh
pnpm ops:fake-openai-provider -- --port 18080 --api-key entangle-test-key
```

Use `http://127.0.0.1:18080/v1` as an `openai_compatible` model endpoint base
URL and store `entangle-test-key` under that endpoint's `secretRef`. The server
responds deterministically and supports streaming chat-completions and
Responses API shapes, so it is useful for catalog/auth/adapter wiring tests,
not for validating real model quality.

To check that harness itself:

```sh
pnpm ops:smoke-fake-openai-provider
```

To rediscover running User Client endpoints through Host projection, run:

```sh
pnpm --filter @entangle/cli dev user-nodes clients --summary
```

To prepare a three-runner proof kit for separate machines, start a reachable
Host, relay, and git backend, then run:

```sh
ENTANGLE_HOST_TOKEN=dev-token pnpm ops:distributed-proof-kit \
  --host-url http://host.example:7071 \
  --relay-url ws://relay.example:7777 \
  --output .entangle/distributed-proof-kit
```

The generated kit contains Host-derived `runner-join.json` files, runner-local
env/start scripts, and operator commands for trust, assignment, User Client
discovery, signed User Node task publication, projection inspection, and
distributed proof verification. Custom runner ids, graph node ids, and
`--agent-engine-kind <kind>` are carried into
`operator/proof-profile.json`, which the generated verifier command reads. The
kit validates that profile before writing it, and the verifier rejects
malformed or internally inconsistent profiles before inspecting Host state.
Pass `--check-relay-health` with at least one `--relay-url` when the generated
operator command should probe relay WebSocket reachability from the operator
machine.
Copy each runner directory to its intended machine and set
`ENTANGLE_REPO_ROOT` there; no generated runner command should require Host
filesystem access.

After those runners are started and the operator commands have run, verify the
proof through Host and User Client HTTP surfaces:

```sh
ENTANGLE_HOST_TOKEN=dev-token pnpm ops:distributed-proof-verify \
  --host-url http://host.example:7071 \
  --profile .entangle/distributed-proof-kit/operator/proof-profile.json \
  --check-user-client-health \
  --require-conversation
```

After the agent has produced projected work evidence, rerun the same verifier
with `--require-artifact-evidence --require-published-git-artifact` to require
at least one projected work ref plus published git artifact/source-history
evidence from the agent node.
Generated proof kits also include `operator/verify-topology.sh` for repeatable
topology verification and `operator/verify-artifacts.sh` for that stricter
post-work check through `operator/proof-profile-post-work.json`.
For real multi-machine network checks, add `--check-relay-health`; relay URLs
come from `--relay-url` or the generated proof profile.
Add `--check-git-backend-health` to require the Host catalog's selected or
default git service to be present, non-file-backed, and reachable at its public
`baseUrl`; pass `--git-service-ref <id>` when the proof should check a
specific git service.
Generate the kit with `--check-published-git-ref` when the operator machine
should also run `git ls-remote` against projected post-work git artifact refs.

To prepare an extra generic runner against an already-running Host without
using the smoke script, write a Host-derived join config and start the runner:

```sh
export ENTANGLE_RUNNER_NOSTR_SECRET_KEY="$(openssl rand -hex 32)"
pnpm --filter @entangle/cli dev runners join-config \
  --runner runner-extra \
  --output runner-join.json \
  --heartbeat-interval-ms 30000 \
  --summary
pnpm --filter @entangle/runner start join --config runner-join.json
```

If the Host is protected by `ENTANGLE_HOST_OPERATOR_TOKEN` or a record from
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON`, also make the selected Host token
available to the runner and pass `--host-token-env-var ENTANGLE_HOST_TOKEN`
when generating the join config.

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
- `ENTANGLE_HOST_TOKEN`, `ENTANGLE_HOST_OPERATOR_TOKEN`, or a token from
  `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`
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

This variant performs the disposable profile smoke and then runs the current
agentic process-runner proof against the development relay. It assigns joined
agent and User Node runners, defaults to a deterministic fake OpenCode
attached-server profile, bridges signed User Node approvals into engine
permissions, verifies source/wiki/artifact projection, exercises User Client
routes, and tears the profile down with volumes.

For an already-running federated dev profile, the runtime lifecycle smoke can be
run directly:

```sh
pnpm ops:smoke-federated-dev:runtime
```

The direct runtime smoke starts an isolated Host and joined runners while using
the configured relay. Prefer the disposable runtime variant when validating the
same-machine deployment profile end to end.

## User Client Ports

When the Docker launcher starts a User Node runtime, it publishes the Human
Interface Runtime on a deterministic host port and injects
`ENTANGLE_HUMAN_INTERFACE_PUBLIC_URL` into the runner container. Studio and CLI
show that projected User Client URL through Host runtime projection; the focused
CLI view is `entangle user-nodes clients`.

Defaults:

- host port base: `41000`
- host port range: `1000`
- public host: `localhost`
- bind host: `0.0.0.0`

Override these with `ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_BASE`,
`ENTANGLE_DOCKER_HUMAN_INTERFACE_PORT_RANGE`,
`ENTANGLE_DOCKER_HUMAN_INTERFACE_PUBLIC_HOST`, and
`ENTANGLE_DOCKER_HUMAN_INTERFACE_BIND_HOST`.

If a User Client port is exposed beyond a trusted loopback or private network,
set `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=username:password` in the runner
environment. The Human Interface Runtime will keep `/health` unauthenticated
for liveness checks and require Basic Auth for all other User Client routes.

## Operator Token

The federated dev profile defaults to a tokenless host for development
ergonomics. Set `ENTANGLE_HOST_OPERATOR_TOKEN` on the `host` service when a
federated dev profile must reject unauthenticated host access, or set
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON` when the profile should distinguish
multiple bootstrap operators. Multi-token records may use raw `token` values
or `tokenSha256` hashes, and may include explicit `permissions`/`scopes` when
the operator token should be narrowed by Host route category. Clients still
need the corresponding raw bearer token through `VITE_ENTANGLE_HOST_TOKEN`,
`ENTANGLE_HOST_TOKEN`, or `--host-token`.

Studio can propagate the token through `VITE_ENTANGLE_HOST_TOKEN`. The CLI can
use `--host-token`, `ENTANGLE_HOST_TOKEN`, or
`ENTANGLE_HOST_OPERATOR_TOKEN` fallback. For multi-token deployments, set
`ENTANGLE_HOST_TOKEN` or pass `--host-token` with the specific operator token
you want that client to use.

## Runtime State

The Compose profile keeps host state and secret state in Docker volumes:

- `entangle-host-state`
- `entangle-secret-state`

Those volumes have explicit Compose names so Host state survives profile
restarts. Managed runner containers created by `entangle-host` in join mode
receive inline `ENTANGLE_RUNNER_JOIN_CONFIG_JSON` and retrieve their assignment
bundle through Host API; they do not mount Host state or secret volumes just to
read `runner-join.json`. Join mode is also the Docker launcher default. Direct
runtime-context compatibility remains available only when explicitly requested
with `ENTANGLE_DOCKER_RUNNER_BOOTSTRAP=runtime-context`, and should be treated
as a local launcher/debug path rather than the target federated execution
model. The runner binary follows the same rule: a process without `join`,
join-config environment, or an explicit runtime-context path fails fast instead
of guessing an injected context file.

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
