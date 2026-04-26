# Runtime Lifecycle Smoke Slice

## Purpose

Add a Docker-backed smoke that proves the federated dev profile can materialize,
restart, and stop a real managed runner, not only expose host and service
readiness endpoints.

The earlier active and disposable local smokes proved Compose service
reachability, runner image presence, host APIs, Studio, Gitea HTTP, and relay
WebSocket readiness. They did not mutate host state enough to exercise the
runtime backend lifecycle against an actual node.

## Implemented behavior

- Added `scripts/smoke-federated-dev-runtime.mjs`.
- Added package scripts:
  - `pnpm ops:smoke-federated-dev:runtime`
  - `pnpm ops:smoke-federated-dev:disposable:runtime`
- Added `--include-runtime` to `scripts/smoke-federated-dev-profile-disposable.mjs`.
- The runtime smoke:
  - creates a temporary AgentPackage on the operator machine;
  - starts a temporary OpenAI-compatible model stub on the same Docker network;
  - verifies the local Gitea API is ready, creates a disposable Gitea user,
    and generates a disposable HTTPS token for provisioning and git transport;
  - copies the package into the running host container;
  - writes disposable model, Gitea provisioning, and git principal credentials
    into the local secret volume;
  - extends the active catalog with a temporary model endpoint and a
    `gitea_api` HTTPS-token git service binding;
  - upserts a disposable git external principal through the host API;
  - admits the temporary package source through the host API;
  - applies a temporary user-to-worker and user-to-downstream-worker smoke
    graph;
  - starts both worker runtimes through `POST /v1/runtimes/{nodeId}/start`;
  - waits for Docker-backed `observedState=running` on both runtimes;
  - restarts the first runtime through `POST /v1/runtimes/{nodeId}/restart`;
  - verifies restart generation advancement while the runtime returns to
    `observedState=running`;
  - verifies the durable `runtime.restart.requested` host event for that
    restart generation;
  - publishes real NIP-59 `task.request` messages through the local relay to
    the worker runtime identities;
  - verifies that both runners reach provider-backed execution through the
    OpenAI-compatible adapter and the disposable model credential;
  - verifies completed host session and runner-turn state for both runtimes;
  - verifies published git-backed report artifact materialization through the
    host artifact read surface;
  - verifies that the downstream runtime retrieves the upstream published
    artifact by `ArtifactRef` and produces its own published report;
  - stops both runtimes through `POST /v1/runtimes/{nodeId}/stop`;
  - removes managed runner containers defensively on failure;
  - removes the temporary model stub container;
  - removes the temporary copied package from the host container.

## Deployment fixes exposed by this smoke

The first message-path run exposed two real deployment issues that the earlier
lifecycle-only probe could miss:

- the federated dev Compose state and secret volumes now use explicit names
  (`entangle-host-state`, `entangle-secret-state`) so host-managed runner
  containers created through the Docker Engine API mount the same volumes as
  the Compose-managed host container;
- the local Gitea profile now starts in non-interactive installed mode for
  disposable smoke runs, so the runtime smoke can create a disposable user and
  token rather than treating Gitea as only an HTML readiness surface;
- the runner runtime image now installs `git`, `openssh-client`, and
  CA certificates because the git-backed artifact backend requires the git
  toolchain at runtime, not only in development or tests.

## Boundary decisions

The runtime smoke is still outside `pnpm verify` because it requires Docker,
Compose, live host services, the local relay, a runner image, and mutable host
state.

The direct `pnpm ops:smoke-federated-dev:runtime` command is intentionally stateful: it
applies a temporary catalog and graph to the active host. Operators should
prefer `pnpm ops:smoke-federated-dev:disposable:runtime` for routine verification
because the disposable wrapper tears down the host state volume afterward.

This slice now proves lifecycle/restart behavior plus a Docker/Gitea-backed
multi-node provider-backed message flow: one managed runtime publishes a
git-backed artifact to local Gitea and a second managed runtime retrieves that
published `ArtifactRef` before producing its own report.

## Verification

- `node --check scripts/smoke-federated-dev-runtime.mjs`
- `node --check scripts/smoke-federated-dev-profile-disposable.mjs`
- `pnpm ops:smoke-federated-dev:disposable:runtime`
