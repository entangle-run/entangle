# Host CORS For Studio Dev Slice

## Current repo truth

Studio and Host normally run on different browser origins in the development
profile: Studio on port `3000` and Host on port `7071`, or on an ephemeral Host
port during the User Node runtime demo. Before this slice, Host did not expose
configured CORS headers and authenticated browser preflight requests could be
blocked before Studio could call Host APIs.

The process-runner smoke already printed Host, token, CLI, and User Client
URLs in `--keep-running` mode, but it did not print a ready Studio command.

## Target model

Studio remains an operator/admin client that talks to Host over the same public
Host API as CLI. In browser-based development and same-machine deployment,
Host must explicitly allow configured Studio origins while preserving bearer
operator auth for actual Host API calls.

## Impacted modules and files

- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `deploy/federated-dev/compose/docker-compose.federated-dev.yml`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete changes

- Added `ENTANGLE_HOST_CORS_ORIGINS` as a comma-separated Host allow-list.
- Host now adds CORS response headers for matching request origins.
- Host now answers matching `OPTIONS` preflight requests before operator auth.
- The federated dev Compose profile allows `http://localhost:3000` and
  `http://127.0.0.1:3000` by default.
- The process-runner smoke configures the same origins and prints a manual
  Studio command in `--keep-running` mode with the correct ephemeral Host URL
  and operator token.

## Tests required

- Host unit coverage for configured CORS preflight before operator auth.
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- Federated dev profile check.
- Product naming and local-assumption scans.

## Migration and compatibility

CORS remains opt-in unless the deployment profile sets
`ENTANGLE_HOST_CORS_ORIGINS`. Existing non-browser API clients are unaffected.
The same-machine deployment profile now sets the default Studio development
origins, and operators can override the list with their own comma-separated
origins.

## Risks and mitigations

- Risk: permissive CORS weakens Host API isolation.
  Mitigation: Host only emits CORS headers for configured origins, and actual
  API calls still require the configured operator bearer token when auth is
  enabled.
- Risk: custom Studio ports are not automatically allowed.
  Mitigation: the deployment profile exposes `ENTANGLE_HOST_CORS_ORIGINS` so
  operators can include alternate origins explicitly.
- Risk: the browser client appears reachable but lacks a token.
  Mitigation: the process demo prints `VITE_ENTANGLE_HOST_TOKEN` alongside the
  Host URL for manual Studio startup.

## Open questions

- A later packaged Studio runtime should use a runtime configuration endpoint
  or generated config asset instead of depending only on Vite build-time
  environment variables.
