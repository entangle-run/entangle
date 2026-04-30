# Bootstrap Operator Permissions Slice

## Current Repo Truth

Bootstrap Host authorization had tokenless mode, one or more bootstrap bearer
tokens, token hashing, normalized operator ids/roles, read-only `viewer`
enforcement, and server-filterable operator request audit events. Any
non-viewer bootstrap role still had broad mutation access unless the deployment
wrapped Host externally.

## Target Model

Bootstrap auth remains a pre-production boundary, but protected deployments
need a narrower operational control before durable operator principals land.
Each bootstrap token may now declare explicit Host permissions. When a token is
scoped, Host enforces those permissions in addition to role checks; when a
token is unscoped, existing role-compatible behavior remains compatible.

## Impacted Modules And Files

- `packages/types/src/federation/authority.ts`
- `packages/types/src/host-api/status.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/operator-auth.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added typed operator permissions:
  - `host.read`
  - `host.authority.write`
  - `host.catalog.write`
  - `host.graph.write`
  - `host.runners.write`
  - `host.assignments.write`
  - `host.runtimes.write`
  - `host.user_nodes.write`
  - `host.maintenance.write`
  - `host.admin`
- `ENTANGLE_HOST_OPERATOR_TOKENS_JSON` records accept optional
  `permissions` or `scopes` arrays.
- Single-token deployments can use
  `ENTANGLE_HOST_OPERATOR_PERMISSIONS` as a comma/space-separated permission
  list.
- If permissions are omitted, the existing role-based compatibility behavior
  remains.
- If permissions are present, Host requires `host.admin` or the route-specific
  permission after the existing role check.
- Host status and security audit events expose configured permission names
  without exposing bearer-token material.
- Shared host-client status formatting shows scoped single-token operators and
  scoped multi-token counts.

## Tests Required

Implemented for this slice:

- schema tests for operator permissions, operator identity records, Host status,
  and operator audit events;
- Host tests proving scoped tokens can read and reach allowed mutation routes
  while forbidden mutations fail before payload handling;
- host-client status presentation tests for scoped single-token and multi-token
  summaries.

Passed for this slice:

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client lint`
- direct targeted `packages/host-client/src/host-status.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- direct targeted `services/host/src/index.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit for the standard Entangle pivot terms

Required before project completion:

- durable operator principal storage/import/export;
- cryptographic operator request signing or session issuance;
- policy-backed permission binding beyond process configuration;
- tamper-evident audit retention/export.

## Migration And Compatibility Notes

Existing `ENTANGLE_HOST_OPERATOR_TOKEN`,
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON`, raw-token records, hash-only records, and
role behavior remain compatible when no explicit permission list is provided.
Scoped tokens are opt-in and should include `host.read` when the client must
use GET or WebSocket Host routes.

## Risks And Mitigations

- Risk: route classification can become stale as Host routes evolve.
  Mitigation: centralize permission resolution in Host pre-handler logic and
  add tests for scoped allow/deny behavior.
- Risk: operators mistake scoped bootstrap tokens for final production RBAC.
  Mitigation: docs label this as bootstrap hardening and keep durable
  principals/signing as open work.
- Risk: too-narrow scopes break runner bootstrap flows.
  Mitigation: compatibility mode remains unscoped, and scoped runner/operator
  clients must include `host.read` plus the required mutation permission.

## Open Questions

- Should v1 production operators sign requests with Nostr identities, use
  short-lived Host-issued sessions, integrate OIDC/mTLS, or combine them?
- Should route permissions eventually move from static Host code into graph or
  deployment policy records?
