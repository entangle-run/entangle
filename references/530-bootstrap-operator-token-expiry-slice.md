# Bootstrap Operator Token Expiry Slice

## Current Repo Truth

Host already supports a bootstrap operator-token boundary through
`ENTANGLE_HOST_OPERATOR_TOKEN` and `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`.
Configured operators can carry normalized ids, roles, optional route
permissions, and raw or SHA-256-hashed token material. Host status exposes the
bootstrap security posture without exposing token material, and protected
requests are audited with operator id, role, permissions, method, path, status,
and auth mode.

Before this slice, bootstrap tokens had no configured expiration metadata.

## Target Model

Bootstrap operator tokens remain a development/early-operations boundary, not
final production identity. They should still support practical hardening:
operators can attach expiration timestamps to token records, Host reports that
non-secret expiry metadata, and expired tokens no longer authorize Host API or
WebSocket operator requests.

## Impacted Modules And Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/operator-auth.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional operator token expiry metadata to Host status contracts.
- Parse `expiresAt` on `ENTANGLE_HOST_OPERATOR_TOKENS_JSON` records.
- Parse `ENTANGLE_HOST_OPERATOR_TOKEN_EXPIRES_AT` for the single-token env
  path.
- Reject invalid expiry timestamps at Host startup.
- Treat expired matching bearer/WebSocket access tokens as unauthorized.
- Show active/expired expiry metadata in Host status summaries without exposing
  token material.

## Tests Required

- Host API test for expired token rejection and status expiry metadata.
- Host API test for invalid expiry configuration.
- Type contract test for expiry metadata.
- Host-client status formatting test.
- Host package typecheck/lint and targeted tests.
- Types and host-client targeted tests/typechecks where touched.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The new fields are optional. Existing bootstrap token configurations continue to
work without `expiresAt` or `ENTANGLE_HOST_OPERATOR_TOKEN_EXPIRES_AT`.
Expiration is a startup/runtime authorization hardening feature, not a durable
operator identity store.

## Risks And Mitigations

- Risk: all configured tokens can expire and lock operators out. Mitigation:
  this remains environment-configured bootstrap auth; operators can restart Host
  with a rotated token or updated expiry.
- Risk: status exposes too much token metadata. Mitigation: status exposes only
  operator ids, roles, permissions, expiry timestamps, and active/expired state,
  never token material or token hashes.
- Risk: callers mistake bootstrap expiry for production RBAC. Mitigation:
  docs keep production identity and authorization as explicit future hardening.

## Open Questions

Production Operator Identity still needs durable principal records, signing, and
policy-backed authorization. Token expiry is a bounded bootstrap hardening step.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client test -- src/host-status.test.ts`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over changed code and docs
