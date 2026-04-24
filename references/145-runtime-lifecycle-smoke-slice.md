# Runtime Lifecycle Smoke Slice

## Purpose

Add a Docker-backed smoke that proves the local profile can materialize,
restart, and stop a real managed runner, not only expose host and service
readiness endpoints.

The earlier active and disposable local smokes proved Compose service
reachability, runner image presence, host APIs, Studio, Gitea HTTP, and relay
WebSocket readiness. They did not mutate host state enough to exercise the
runtime backend lifecycle against an actual node.

## Implemented behavior

- Added `scripts/smoke-local-runtime.mjs`.
- Added package scripts:
  - `pnpm ops:smoke-local:runtime`
  - `pnpm ops:smoke-local:disposable:runtime`
- Added `--include-runtime` to `scripts/smoke-local-profile-disposable.mjs`.
- The runtime smoke:
  - creates a temporary AgentPackage on the operator machine;
  - starts a temporary OpenAI-compatible model stub on the same Docker network;
  - copies the package into the running host container;
  - writes a disposable model credential into the local secret volume;
  - extends the active catalog with a temporary model endpoint;
  - admits the temporary package source through the host API;
  - applies a temporary user-to-worker smoke graph;
  - starts the worker runtime through `POST /v1/runtimes/{nodeId}/start`;
  - waits for Docker-backed `observedState=running`;
  - restarts the runtime through `POST /v1/runtimes/{nodeId}/restart`;
  - verifies restart generation advancement while the runtime returns to
    `observedState=running`;
  - verifies the durable `runtime.restart.requested` host event for that
    restart generation;
  - publishes a real NIP-59 `task.request` through the local relay to the
    worker runtime identity;
  - verifies that the runner reaches provider-backed execution through the
    OpenAI-compatible adapter and the disposable model credential;
  - verifies completed host session and runner-turn state;
  - verifies git-backed report artifact materialization through the host
    artifact read surface;
  - stops the runtime through `POST /v1/runtimes/{nodeId}/stop`;
  - removes the managed runner container defensively on failure;
  - removes the temporary model stub container;
  - removes the temporary copied package from the host container.

## Deployment fixes exposed by this smoke

The first message-path run exposed two real deployment issues that the earlier
lifecycle-only probe could miss:

- the local Compose state and secret volumes now use explicit names
  (`entangle-host-state`, `entangle-secret-state`) so host-managed runner
  containers created through the Docker Engine API mount the same volumes as
  the Compose-managed host container;
- the runner runtime image now installs `git`, `openssh-client`, and
  CA certificates because the git-backed artifact backend requires the git
  toolchain at runtime, not only in development or tests.

## Boundary decisions

The runtime smoke is still outside `pnpm verify` because it requires Docker,
Compose, live host services, the local relay, a runner image, and mutable host
state.

The direct `pnpm ops:smoke-local:runtime` command is intentionally stateful: it
applies a temporary catalog and graph to the active host. Operators should
prefer `pnpm ops:smoke-local:disposable:runtime` for routine verification
because the disposable wrapper tears down the host state volume afterward.

This slice proves lifecycle/restart behavior plus a same-node provider-backed
message turn and local git-backed artifact materialization. Runner-level
integration coverage now separately proves the multi-node git handoff where
one node publishes and another node retrieves the produced artifact. The
remaining deployment-grade gap is proving that same handoff through
Docker-managed runners and a bootstrapped local Gitea service.

## Verification

- `node --check scripts/smoke-local-runtime.mjs`
- `node --check scripts/smoke-local-profile-disposable.mjs`
- `pnpm ops:smoke-local:disposable:runtime`
