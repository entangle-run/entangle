# Bootstrap Multi-Operator Auth Slice

## Current Repo Truth

Host already supported an optional single bootstrap bearer token through
`ENTANGLE_HOST_OPERATOR_TOKEN`, reported that posture in Host status, enforced
the coarse `viewer` read-only role, and recorded protected mutation attempts as
`host.operator_request.completed` audit events. That left every protected
deployment with one effective operator identity unless the operator rotated the
whole Host process environment.

## Target Model

This is still bootstrap authorization, not final production identity/RBAC.
However, a protected Host should be able to distinguish multiple bootstrap
operators during early federated operation. Admin/operator/viewer tokens should
resolve to distinct audit identities, Host status should expose the active
posture without token material, and the existing single-token environment
contract should remain compatible.

## Impacted Modules And Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `services/host/src/operator-auth.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/state.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `services/host/src/operator-auth.ts` as the shared Host bootstrap
  operator-auth helper.
- Preserved the existing single principal from:
  - `ENTANGLE_HOST_OPERATOR_TOKEN`;
  - `ENTANGLE_HOST_OPERATOR_ID`;
  - `ENTANGLE_HOST_OPERATOR_ROLE`.
- Added `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`, a JSON array of token records:

  ```json
  [
    {
      "operatorId": "ops-admin",
      "operatorRole": "admin",
      "token": "admin-secret"
    },
    {
      "operatorId": "audit-viewer",
      "role": "viewer",
      "token": "viewer-secret"
    }
  ]
  ```

- Host rejects malformed multi-token configuration at startup/status
  resolution rather than silently weakening the protected boundary.
- Duplicate token values are rejected because they would make audit
  attribution ambiguous.
- HTTP bearer tokens and WebSocket `access_token` parameters now resolve
  against the configured principal list.
- Viewer tokens remain read-only; admin/operator/owner tokens keep existing
  mutation behavior.
- Protected mutation audit events now attribute successful and denied requests
  to the matched bootstrap principal. Unauthenticated mutation attempts in a
  multi-principal deployment are attributed to `unauthorized-operator`.
- Host status now supports a new
  `operatorAuthMode: "bootstrap_operator_tokens"` shape with a tokenless list
  of operator ids and roles.
- host-client status presentation now summarizes plural bootstrap auth as
  `bootstrap operator tokens · N operators`.

## Tests Required

Implemented and passed for this slice:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- direct targeted `packages/types/src/index.test.ts`
- direct targeted `packages/host-client/src/host-status.test.ts`
- direct targeted `services/host/src/index.test.ts`

The Host test covers distinct admin/viewer token attribution and duplicate
token rejection.

Still required before declaring the whole project complete:

- package lint gates;
- product naming guardrail;
- broader root/service verification as feasible in this environment;
- a later production identity/RBAC slice that moves beyond bootstrap tokens.

## Migration And Compatibility Notes

Existing single-token deployments keep their current `bootstrap_operator_token`
Host status shape and behavior. Multi-token deployments opt in by setting
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON`. If both the single-token env vars and the
JSON array are set, all principals are accepted as long as token values are
unique.

The new Host status plural shape is a shared contract change. In-repo
presentation and contract tests now cover it. Since Entangle has not shipped a
stable external API, this additive status shape is acceptable.

## Risks And Mitigations

- Risk: bootstrap multi-token support is mistaken for final production
  authorization.
  Mitigation: docs explicitly keep durable principals, sessions, policy-backed
  permissions, key rotation, and retention as remaining production hardening.
- Risk: duplicated token values create ambiguous audit attribution.
  Mitigation: Host rejects duplicate token configuration.
- Risk: status leaks credential material.
  Mitigation: Host status exposes only operator ids and roles, never tokens.

## Open Questions

- Should production operator identity be Nostr-signed like graph node
  identities, or should operator auth use a separate OIDC/session-token layer
  with Host Authority binding?
- Which permission model should land first after bootstrap: coarse resource
  domains such as graph/runner/runtime/authority, or policy operations scoped
  by graph node and resource id?
