# Bootstrap Operator Security Status Slice

## Summary

This slice makes the current Host operator security mode visible through the
canonical Host status contract.

Before this change, Entangle already had an optional bootstrap bearer-token
boundary through `ENTANGLE_HOST_OPERATOR_TOKEN` and typed
`host.operator_request.completed` audit events for protected requests. The
active security posture, however, was implicit in process environment and not
available to Studio, CLI, or other Host clients through the same status
surface used for authority, transport, reconciliation, and cache diagnostics.

Host status now includes a required `security` object:

- `operatorAuthMode: "none"` when no bootstrap operator token is configured;
- `operatorAuthMode: "bootstrap_operator_token"`, `operatorId`, and
  `operatorRole` when `ENTANGLE_HOST_OPERATOR_TOKEN` is configured.

This is still bootstrap security, not production RBAC.

## Current Repo Truth

- `services/host` enforces `ENTANGLE_HOST_OPERATOR_TOKEN` when configured.
- `services/host` emits typed operator request audit events with
  `authMode: "bootstrap_operator_token"`.
- `ENTANGLE_HOST_OPERATOR_ID` already supplies audit attribution and falls back
  to `bootstrap-operator` when invalid or absent.
- `packages/types` already defines operator roles for future Host Authority
  identity work.
- Host status did not previously expose whether the operator boundary was
  active.

## Target Model

Operator-visible Host status should report the configured bootstrap security
mode without exposing secrets and without claiming final production identity.

The field is intentionally small:

- it says whether Host is token-protected;
- it exposes normalized bootstrap operator attribution;
- it exposes the configured bootstrap role for operator visibility;
- it leaves final multi-principal authorization to later explicit contracts.

## Impacted Modules And Files

- `packages/types/src/host-api/status.ts`
- `services/host/src/state.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/host-status-output.ts`
- `apps/studio/src/App.tsx`
- focused Host, host-client, CLI, and types tests
- `README.md`
- `references/124-bootstrap-host-operator-token-auth-slice.md`
- `references/125-bootstrap-operator-request-audit-slice.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `hostOperatorSecurityStatusSchema`.
- Added required `security` to `hostStatusResponseSchema`.
- Added Host-side normalization for:
  - `ENTANGLE_HOST_OPERATOR_ID`;
  - `ENTANGLE_HOST_OPERATOR_ROLE`;
  - inactive tokenless mode.
- Added shared `formatHostSecuritySummary`.
- Added the security detail line to host-client, CLI, and Studio Host Status
  presentation.
- Added tests for token-protected status and tokenless status.

## Tests Required

Focused checks:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/host test`
- package typechecks for touched packages
- package lints for touched packages

Broader checks:

- root `pnpm typecheck`
- product naming guardrail
- local-assumption audit search for touched lines

## Migration And Compatibility

`security` is required in `HostStatusResponse`. Entangle has not released a
stable external Host API, so the stronger explicit status contract is
acceptable.

Tokenless development remains supported. In that mode, status reports:

```json
{ "operatorAuthMode": "none" }
```

Token-protected deployments report normalized attribution without returning the
bearer token:

```json
{
  "operatorAuthMode": "bootstrap_operator_token",
  "operatorId": "ops-lead",
  "operatorRole": "admin"
}
```

Invalid or absent `ENTANGLE_HOST_OPERATOR_ID` continues to normalize to
`bootstrap-operator`. Invalid or absent `ENTANGLE_HOST_OPERATOR_ROLE` normalizes
to `operator`.

## Risks And Mitigations

- Risk: operators mistake the role field for enforced RBAC.
  Mitigation: docs and naming call this a bootstrap status surface; no endpoint
  authorization behavior changed.
- Risk: clients parsing Host status need the new required field.
  Mitigation: all in-repo clients and fixtures were updated with shared
  formatting helpers.
- Risk: Host status could expose secret material.
  Mitigation: the status reports only mode, normalized operator id, and role;
  it never returns the token.

## Open Questions

- What durable principal model replaces the bootstrap token?
- Should future operator identities be signed Nostr principals, web session
  principals, service tokens, or a combination?
- Which operations should be role-gated first once RBAC/ABAC becomes real?
