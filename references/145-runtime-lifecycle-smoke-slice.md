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
  - stops the runtime through `POST /v1/runtimes/{nodeId}/stop`;
  - removes the temporary copied package from the host container.

## Boundary decisions

The runtime smoke is still outside `pnpm verify` because it requires Docker,
Compose, live host services, the local relay, a runner image, and mutable host
state.

The direct `pnpm ops:smoke-local:runtime` command is intentionally stateful: it
applies a temporary catalog and graph to the active host. Operators should
prefer `pnpm ops:smoke-local:disposable:runtime` for routine verification
because the disposable wrapper tears down the host state volume afterward.

This slice proves lifecycle/restart behavior. It does not yet prove a
multi-node artifact handoff or provider-backed model turn.

## Verification

- `node --check scripts/smoke-local-runtime.mjs`
- `node --check scripts/smoke-local-profile-disposable.mjs`
- `pnpm ops:smoke-local:disposable:runtime --skip-build`
