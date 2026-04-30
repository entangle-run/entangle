# Hashed Bootstrap Operator Token Slice

## Current Repo Truth

`442-bootstrap-multi-operator-auth-slice.md` added
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON` so protected Hosts can distinguish
multiple bootstrap operators. The first implementation accepted raw `token`
values in each record and compared incoming bearer/access tokens directly.

## Target Model

Bootstrap auth is still not final production identity, but multi-operator
configuration should not require storing raw bearer tokens in the JSON record.
Operators should be able to configure a SHA-256 token hash, keep the raw token
only in the client/runner environment that needs to authenticate, and still get
the same status, viewer enforcement, and audit attribution behavior.

## Impacted Modules And Files

- `services/host/src/operator-auth.ts`
- `services/host/src/index.test.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/442-bootstrap-multi-operator-auth-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Multi-operator records now accept either:
  - `token`;
  - `tokenSha256`, a 64-character SHA-256 hex digest;
  - both, if they match.
- Host stores and compares normalized token hashes internally for bootstrap
  operator principals.
- The legacy single-token env var remains compatible; Host hashes
  `ENTANGLE_HOST_OPERATOR_TOKEN` internally before matching requests.
- Duplicate detection now uses token hashes, so duplicate raw/hash records are
  rejected as ambiguous.
- Mismatched `token` plus `tokenSha256` records fail closed during Host startup
  or status resolution.
- Malformed `tokenSha256` values fail closed even when a raw token is also
  present, so configuration mistakes cannot silently downgrade to raw-token
  matching.
- Host tests prove a hash-only operator record authorizes the correct bearer
  token, rejects an incorrect bearer token, rejects malformed hashes, and
  rejects mismatched raw/hash pairs.

## Tests Required

Implemented and passed for this slice:

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- direct targeted `services/host/src/index.test.ts`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit for the standard Entangle pivot terms

Still required before declaring the whole project complete:

- broader production identity/RBAC work;
- token rotation and revocation beyond process configuration changes;
- tamper-evident audit export/retention.

## Migration And Compatibility Notes

Existing `ENTANGLE_HOST_OPERATOR_TOKEN` deployments and raw-token
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON` records continue to work. New hash-only
records are opt-in and do not change Host status or audit event response
shapes.

## Risks And Mitigations

- Risk: SHA-256 hashes of weak tokens are brute-forceable.
  Mitigation: docs keep this as bootstrap hardening, not password storage; use
  high-entropy bearer tokens.
- Risk: operators assume this means Host no longer sees raw bearer tokens.
  Mitigation: HTTP authentication necessarily receives the bearer token for the
  request; this slice avoids storing raw tokens in the Host process
  configuration after startup normalization.
- Risk: mixed raw/hash records create ambiguous attribution.
  Mitigation: duplicate hashes and mismatched raw/hash pairs fail closed.

## Open Questions

- Should final operator auth use signed operator sessions, OIDC, mTLS, Nostr
  signatures, or a combination?
- Should bootstrap token hashes support stronger KDF/salt metadata, or should
  the next hardening step skip directly to durable operator principals?
