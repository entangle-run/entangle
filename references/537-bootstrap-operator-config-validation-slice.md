# Bootstrap Operator Config Validation Slice

## Current Repo Truth

The Host bootstrap operator boundary supports a single
`ENTANGLE_HOST_OPERATOR_TOKEN` and multi-token
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON` records. Token records already fail fast
for malformed token hashes, permissions, expiry timestamps, duplicate tokens,
and invalid JSON structure.

Before this slice, explicitly configured operator ids and roles could silently
collapse back to bootstrap defaults when they were malformed. That preserved
startup, but weakened audit attribution and role semantics.

## Target Model

Configured operator identity and role metadata should be deterministic. Missing
operator ids and roles keep the compatibility defaults, while present but
invalid ids or roles fail Host startup with a specific configuration error.

## Impacted Modules And Files

- `services/host/src/operator-auth.ts`
- `services/host/src/operator-auth.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Validate explicit `ENTANGLE_HOST_OPERATOR_ID` values with the shared
  identifier schema.
- Validate explicit `ENTANGLE_HOST_OPERATOR_ROLE` values with the shared
  operator-role schema.
- Apply the same fail-fast validation to each
  `ENTANGLE_HOST_OPERATOR_TOKENS_JSON` record.
- Preserve the existing `bootstrap-operator` and `operator` defaults when the
  fields are omitted.
- Add targeted Host tests for default compatibility and invalid explicit
  operator metadata.

## Tests Required

- Targeted Host operator-auth tests.
- Host typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This intentionally breaks only configurations that explicitly set malformed
operator ids or roles. Deployments that omit those fields keep the existing
bootstrap defaults. Operators should fix invalid configuration instead of
allowing Host to silently degrade attribution or role behavior.

## Risks And Mitigations

- Risk: existing local environments with informal operator labels stop
  starting. Mitigation: the error names the exact environment field or JSON
  record path, and the identifier/role schemas remain shared product contracts.
- Risk: the bootstrap boundary is mistaken for final production identity.
  Mitigation: this slice hardens bootstrap configuration only; production RBAC
  and external identity remain tracked separately.

## Open Questions

No product-level ambiguity remains for this hardening slice. Future production
identity work should replace bootstrap tokens with durable operator principals
instead of extending the bootstrap path indefinitely.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/host test -- src/operator-auth.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over Host and updated docs
