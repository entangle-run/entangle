# Operator Token File Configuration Slice

## Current Repo Truth

Host operator authorization supports a bootstrap token from
`ENTANGLE_HOST_OPERATOR_TOKEN` and multiple bootstrap token records from
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON`. Records may carry raw tokens or
`tokenSha256` hashes, roles, scoped permissions, and expiry metadata.

That model still required large JSON configuration to live in an environment
variable. It was functional for local profiles, but awkward for service
managers, secret mounts, and deployments that want durable token records
without baking JSON into process environment.

## Target Model

Host should also accept a JSON token-record file through
`ENTANGLE_HOST_OPERATOR_TOKENS_FILE`. The file uses the same array format as
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON`, and Host merges records from the single
token, JSON env var, and file before duplicate-token checks.

The token file remains bootstrap authorization. It is not final production
RBAC, but it moves operator identity configuration out of large env strings and
toward durable deployment-owned files or secret mounts.

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

- Add `ENTANGLE_HOST_OPERATOR_TOKENS_FILE` support to operator-principal
  resolution.
- Parse the file with the same record schema and normalization path as
  `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`.
- Preserve existing duplicate-token detection across env and file records.
- Keep file parsing synchronous during Host startup so malformed or unreadable
  operator auth configuration fails fast.
- Add focused tests proving file-backed records load with role and scoped
  permissions.

## Tests Required

- Red Host operator-auth test proving file-backed records were ignored.
- Green Host operator-auth test after file loading is implemented.
- Host typecheck.
- Focused ESLint for operator auth files.
- Product naming guard, whitespace check, changed-diff marker audit, and diff
  review before commit.

## Migration And Compatibility Notes

Existing `ENTANGLE_HOST_OPERATOR_TOKEN` and
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON` deployments continue to work. The file
setting is additive and uses the same JSON array shape as the env var.

Operators should prefer `tokenSha256` records in durable files when practical.
Raw tokens remain supported for development parity with the existing bootstrap
contract.

## Risks And Mitigations

- Risk: unreadable files make Host startup fail. Mitigation: this is
  intentional fail-fast behavior for auth configuration, and the error names
  `ENTANGLE_HOST_OPERATOR_TOKENS_FILE`.
- Risk: file-backed records are mistaken for final RBAC. Mitigation: docs keep
  this under bootstrap authorization and keep production identity/RBAC as a
  remaining hardening track.
- Risk: duplicate records across env and file create ambiguous attribution.
  Mitigation: existing duplicate-token detection runs after merging all
  sources.

## Open Questions

Final production identity still needs durable operator principal records,
rotation workflow, policy-backed permission sources, and UI/CLI management.
This slice only moves bootstrap token records into a deployable file format.

## Verification

The red phase failed because
`resolveHostOperatorPrincipalsFromEnv({ ENTANGLE_HOST_OPERATOR_TOKENS_FILE })`
returned no principals. The green phase reads the configured file, parses it
through the existing token-record normalization, and preserves role and scoped
permission projection.

Final verification for this slice includes focused Host tests, Host typecheck,
focused lint, product naming guard, whitespace check, changed-diff
local-assumption marker audit, and full diff review before commit.
