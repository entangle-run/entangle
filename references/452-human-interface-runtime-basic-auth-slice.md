# Human Interface Runtime Basic Auth Slice

Date: 2026-04-29.

## Current Repo Truth

Human Interface Runtimes serve the User Client for running User Nodes. Process
runners bind to loopback by default, while Docker-managed User Node runtimes
can bind inside the container and publish a browser-openable host port through
the Docker launcher adapter.

Before this slice, the Human Interface Runtime had no runtime-local HTTP access
gate. That was acceptable for loopback-only development, but it was too weak
for deployments that intentionally publish a User Client endpoint beyond the
local process boundary.

## Target Model

The User Client remains a per-User-Node runtime surface, not a Host admin
surface. When an operator or runner deployment exposes that surface, it can now
enable browser-native Basic Auth at the Human Interface Runtime boundary.

Authentication is optional and runtime-local:

- `/health` remains unauthenticated for runner/Host/operator liveness checks;
- all other fallback HTML, static User Client, and `/api/*` routes require
  Basic Auth when configured;
- the Host API bearer token used by the Human Interface Runtime remains
  server-side and is not exposed to the browser;
- no Host contract or projection shape changes are required.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added optional `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=username:password`.
- Rejected malformed non-empty Basic Auth configuration at runtime startup
  instead of silently disabling the access gate.
- Added HTTP Basic challenge responses with realm `entangle-user-client`.
- Kept `/health` public so Host/operator health checks still work without
  carrying participant credentials.
- Protected all non-health Human Interface Runtime routes when the variable is
  configured.
- Compared configured and supplied credentials with fixed-length
  timing-safe comparisons.
- Added runner integration tests covering unauthenticated, invalid, and
  authorized requests plus malformed configuration.

## Tests Required

- Runner typecheck.
- Runner Human Interface Runtime test covering optional Basic Auth.
- Runner lint.
- Product naming and local-only assumption checks for the touched slice.

## Verification

Targeted checks:

```bash
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 --testTimeout=30000 src/index.test.ts
pnpm --filter @entangle/runner lint
git diff --check
pnpm ops:check-product-naming
```

Added-line local-assumption audit:

```bash
git diff -U0 | rg "^\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

No added lines matched that local-only assumption scan.

## Migration And Compatibility Notes

This is additive and opt-in. Existing demos, process smokes, Docker profiles,
and User Client URLs continue to work without authentication unless
`ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH` is set in the runner environment.

Operators that publish User Client ports outside a trusted loopback or private
network should set `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH`.

## Risks And Mitigations

- Risk: Basic Auth credentials could be exposed if configured through a public
  URL.
  Mitigation: the runtime uses standard `Authorization` headers and does not
  add credentials to `clientUrl` projection.
- Risk: health probes could fail after enabling auth.
  Mitigation: `/health` remains unauthenticated.
- Risk: Basic Auth is not final production identity.
  Mitigation: this is a runtime-local access gate. Graph identity, User Node
  signing, and Host authority remain separate.

## Open Questions

- The final production model still needs stronger Human Interface Runtime user
  authentication, session management, and key-custody policy. Basic Auth is a
  pragmatic protection for exposed development and early self-hosted surfaces.
