# Distributed Proof External Git URL Slice

## Current Repo Truth

The distributed proof tooling could already check Host catalog git backend
health with `--check-git-backend-health`. That path rejects missing services
and file-backed remotes, and it can probe each selected service `baseUrl` from
the operator machine.

Before this slice, physical proof operators could still run topology checks
that accepted loopback or wildcard git service URLs unless the health check
happened to fail from the operator machine. The script proof profile normalizer
also had no matching TypeScript contract field for an external-git-URL proof
requirement.

## Target Model

Physical distributed proofs should be able to require git service coordinates
that are valid from other machines without conflating URL-shape validation with
live health probing. A verifier profile generated for a multi-machine proof can
therefore require external git URLs even when the operator wants a fast
topology-shape check before probing service health.

## Impacted Modules And Files

- `packages/types/src/ops/distributed-proof-profile.ts`
- `packages/types/src/index.test.ts`
- `scripts/distributed-proof-profile.mjs`
- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `requireExternalGitUrls` to the TypeScript distributed proof profile
  contract.
- Preserve `requireExternalGitUrls` in the script proof profile normalizer.
- Add `--require-external-git-urls` to the proof kit and verifier CLIs.
- Propagate the flag into generated verifier commands and proof profiles.
- Verify selected Host catalog git services have non-loopback, non-wildcard,
  non-file external `baseUrl` and `remoteBase` coordinates.
- Keep live git base URL health probing behind `--check-git-backend-health`.
- Extend the deterministic proof tooling smoke with passing external git URL
  and failing loopback git URL self-tests.

## Tests Required

- Red `node scripts/smoke-distributed-proof-tools.mjs` proving the new
  loopback-git self-test failed before verifier support existed.
- Red `@entangle/types` focused test proving the package contract dropped the
  new field.
- Green `node scripts/smoke-distributed-proof-tools.mjs`.
- Green focused `@entangle/types` test and full `@entangle/types` test.
- Syntax checks for changed proof scripts.
- Focused ESLint for changed scripts and TypeScript package files.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

The new check is opt-in. Existing proof profiles continue to validate without
`requireExternalGitUrls`, and existing generated kits only add the stricter
check when the operator asks for it.

`--check-git-backend-health` keeps its existing behavior. Operators can combine
it with `--require-external-git-urls` when they want both proof-topology shape
validation and live reachability probing.

## Risks And Mitigations

- Risk: same-machine rehearsals using loopback or file-backed git services fail
  unexpectedly. Mitigation: the external git URL check is opt-in and documented
  as physical multi-machine proof hardening.
- Risk: URL-shape validation is mistaken for end-to-end git reachability.
  Mitigation: docs distinguish `--require-external-git-urls` from
  `--check-git-backend-health` and `--check-published-git-ref`.
- Risk: profile contracts drift between scripts and `packages/types`.
  Mitigation: the TypeScript contract test now covers the new field, and the
  smoke covers generated profile JSON plus verifier behavior.

## Open Questions

Future infrastructure-backed proof orchestration can combine this guard with
automated git server provisioning and `git ls-remote` checks across multiple
network namespaces or machines.

## Verification

Completed in this slice:

- Red `node scripts/smoke-distributed-proof-tools.mjs` failed because the new
  loopback-git-url self-test unexpectedly passed.
- Red focused `@entangle/types` test failed because
  `requireExternalGitUrls` was parsed as `undefined`.
- Green focused `@entangle/types` test passed after adding the contract field.
- Green `node scripts/smoke-distributed-proof-tools.mjs` passed after adding
  proof-kit, verifier, profile, and smoke support.

The final slice audit also runs script syntax checks, focused lint, package
type tests, product naming, whitespace, changed-diff marker checks, and
`git diff` review before commit.
