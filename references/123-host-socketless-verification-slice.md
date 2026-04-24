# Host Socketless Verification Slice

## Summary

This slice closes a verification-environment gap in the host test suite.

The host runtime behavior was already correct, but part of the test harness
still depended on real host socket binding:

- the Docker Engine client test opened a local Unix socket;
- the Gitea provisioning tests opened a local TCP listener;
- the host event-stream test used a live listener-style WebSocket path.

That made `pnpm verify` vulnerable in sandboxed or constrained CI profiles
where filesystem and loopback socket binding can be blocked even though the
product code being tested does not require a real external service.

## What changed

### 1. Docker Engine client coverage is now request-mocked

`services/host/src/docker-engine-client.test.ts` now mocks `node:http.request`
directly.

The test still verifies the important Docker client contract:

- Unix-socket transport is selected through `socketPath`;
- the container-create path includes the requested container name;
- start, inspect, stop, and delete requests use the expected Docker API paths;
- request bodies are serialized as expected.

The test no longer needs to bind a temporary Unix socket only to inspect the
client's outgoing request shape.

### 2. Gitea API tests now use in-process Fastify injection

The fake Gitea server in `services/host/src/index.test.ts` now uses
`server.inject` behind a typed `fetch` stub instead of calling
`server.listen`.

That preserves the provisioning behavior under test:

- the host still calls a Gitea-like HTTP API boundary;
- request paths, methods, authorization headers, and bodies are still captured;
- conflict and creation responses still exercise the same host logic.

The difference is only transport mechanics inside the test harness.

### 3. Event-stream tests now avoid listener races

The host WebSocket event-stream test now uses Fastify's `injectWS` path and
installs the message listener before the mutation that should emit the event.

This keeps the test deterministic in the in-process WebSocket adapter, where
events can arrive in the same tick as the host mutation response.

### 4. Global test stubs are cleaned up explicitly

The host test teardown now clears globally stubbed fetch behavior through
Vitest's global unstub facility before resetting modules.

That keeps later tests isolated and avoids hidden cross-test coupling.

## Why this matters

This is not a product shortcut.

The host still exposes real HTTP and WebSocket surfaces in production. The
Docker backend still uses the Docker Engine API client. Gitea provisioning
still goes through an HTTP API boundary.

The change is that unit and service tests no longer require the operating
system to allow socket binding just to prove request-shape, route, and
control-plane semantics. That makes the repository's core quality gate more
portable and better suited to constrained CI and Codex sandbox execution.

## Explicit non-goals

This slice does **not**:

- weaken Docker client request assertions;
- remove Gitea provisioning coverage;
- replace production HTTP or WebSocket behavior;
- hide runtime integration gaps that still require real Compose-level smoke
  tests;
- make in-process tests a substitute for future relay, git-service, and
  Docker-backed integration coverage.

## Validation and quality gates

This slice was closed after:

- re-running host lint, typecheck, and test gates;
- re-running the focused-register targeted gates already touched in the same
  worktree state;
- re-running the full repository `pnpm verify` gate;
- re-running `git diff --check`.

## Resulting state

The repository now has a stronger local and CI verification baseline:

- service-level host tests are deterministic in sandboxed environments;
- `pnpm verify` can pass without privileged socket binding;
- future real-service integration tests can be added deliberately at the
  Compose/smoke layer instead of leaking infrastructure requirements into
  ordinary unit and service tests.
