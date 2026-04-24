# Bootstrap Operator Request Audit Slice

## Summary

This slice deepens the bootstrap host operator-token boundary with a typed,
persistent audit event for mutation requests handled while
`ENTANGLE_HOST_OPERATOR_TOKEN` is configured.

It does not introduce production identity, RBAC, ABAC, sessions, workspaces, or
policy engines. Its purpose is to make the current bootstrap security profile
auditable without pretending that a shared local token is a complete
authorization system.

## Implemented Behavior

- `packages/types` now defines `host.operator_request.completed` as a
  canonical host event.
- The event has category `security`.
- The event records:
  - `authMode`;
  - `operatorId`;
  - HTTP mutation method;
  - request path without query string;
  - Fastify request id;
  - response status code.
- `entangle-host` emits this event only when
  `ENTANGLE_HOST_OPERATOR_TOKEN` is configured.
- `ENTANGLE_HOST_OPERATOR_ID` can provide the bootstrap operator identifier
  when it already conforms to Entangle identifier rules.
- Invalid or missing `ENTANGLE_HOST_OPERATOR_ID` values fall back to
  `bootstrap-operator`.
- Unauthorized mutation attempts are audited with their `401` status.
- Successful authenticated mutation attempts are audited with their final
  response status.

## Security Posture

This event intentionally records request metadata only. It does not persist
authorization headers, bearer tokens, request bodies, query strings, or secret
material.

The audit event is a bootstrap control-plane trace, not a compliance-grade
immutable audit ledger. A future production identity slice should preserve this
contract shape while replacing the shared-token actor with authenticated
principals, policy decisions, tenant/workspace scope, and tamper-evident audit
retention.

## Non-Goals

- Full user authentication.
- Multi-operator identity.
- Role-based authorization.
- Attribute-based authorization.
- Token rotation.
- Persistent login sessions.
- Security analytics or anomaly detection.

## Validation

Added test coverage verifies:

- `host.operator_request.completed` parses through the canonical host event
  union.
- token-protected unauthorized mutation requests produce a security audit
  event with status `401`;
- token-protected authorized mutation requests produce a security audit event
  with status `200`.

Focused validation run:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`

## Resulting State

The bootstrap host security profile now has a first durable audit primitive.
The next identity/auth work should deepen this into principal-aware,
policy-aware authorization rather than adding more shared-token semantics.
