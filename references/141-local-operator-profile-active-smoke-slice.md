# Local Operator Profile Active Smoke Slice

## Purpose

Add an active smoke check for the local operator profile after the Compose
topology has been started.

The previous preflight slice proved that required files, tooling, Docker,
Docker Compose, daemon access, and Compose configuration were available. It did
not prove that a running federated dev profile was reachable through the surfaces an
operator actually uses.

## Implemented behavior

- Added `scripts/smoke-federated-dev-profile.mjs`.
- Added package script:
  - `pnpm ops:smoke-federated-dev`
- The smoke validates:
  - the expected Compose services are running;
  - the `entangle-runner:federated-dev` image exists;
  - `GET /v1/host/status` returns the expected host status shape;
  - `GET /v1/events?limit=1` returns an event-list envelope;
  - Studio serves the Vite application shell;
  - Gitea serves its local web surface;
  - the local `strfry` relay accepts a Nostr WebSocket subscription and
    responds with a Nostr frame.

## Operator controls

The smoke supports environment overrides for non-default local ports:

- `ENTANGLE_HOST_URL` or `ENTANGLE_HOST_URL`
- `ENTANGLE_STUDIO_URL` or `ENTANGLE_STUDIO_URL`
- `ENTANGLE_GITEA_URL` or `ENTANGLE_GITEA_URL`
- `ENTANGLE_STRFRY_URL` or `ENTANGLE_RELAY_URL`
- `ENTANGLE_HOST_TOKEN` or `ENTANGLE_HOST_OPERATOR_TOKEN`
- `ENTANGLE_SMOKE_TIMEOUT_MS`

It also supports:

- `--skip-compose`, for endpoint-only validation outside the repository's
  Compose project;
- `--skip-runner-image`, for profiles where runner materialization readiness is
  intentionally out of scope.

## Design notes

This smoke is intentionally not part of repository-wide `pnpm verify` because
it requires a running Docker-backed federated dev profile. Ordinary CI remains portable
through socketless host tests and package-level verification.

The next delivery-hardening step is a disposable Compose smoke mode that can
build, start, validate, and tear down an isolated federated dev profile in CI.

## Verification

- `node --check scripts/smoke-federated-dev-profile.mjs`
