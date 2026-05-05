# Source History Git Attribution Slice

## Current Repo Truth

Runtime contexts already carry resolved git principal bindings. Wiki repository
commits use the primary git principal attribution when one is available, falling
back to node display name and a deterministic node email when no principal is
resolved. Source-history publication repositories also configure git
`user.name` and `user.email` from the primary git principal.

Before this slice, the actual source-history `commit-tree` calls still used
`<nodeId>@entangle.invalid` for author and committer metadata. That weakened
the per-node git profile model because source-history commits did not carry the
same principal attribution as wiki and publication repository configuration.

## Target Model

Every git commit produced by a coding-agent node should use the node's resolved
primary git principal attribution when available. Entangle still owns graph
identity through Nostr and Host projection, but git-facing artifacts should
carry the configured git identity for the node.

## Impacted Modules And Files

- `services/runner/src/source-history.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Reuse primary git principal attribution for source-history commits.
- Reuse the same attribution for published source-history artifact commits.
- Keep the existing node-id fallback when no primary git principal attribution
  is available.
- Add service coverage that inspects git author email for both the internal
  source-history commit and the published git artifact commit.

## Tests Required

- Runner service test coverage for git attribution.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

New source-history commits will carry configured git principal attribution.
Existing commits are immutable and are not rewritten. Runtime contexts without a
primary git principal continue to use the deterministic node fallback.

## Risks And Mitigations

- Risk: git-facing attribution is confused with Nostr graph identity.
  Mitigation: this changes only git commit metadata; Nostr public keys,
  runner observations, Host projection, and artifact records remain the
  authoritative graph identity trail.
- Risk: missing principal attribution breaks commits. Mitigation: the existing
  fallback remains in `resolvePrimaryGitAttribution`.
- Risk: tests only cover one principal path. Mitigation: the fixture already
  exercises a resolved primary git principal, while fallback behavior is kept
  inside the existing helper.

## Open Questions

Future git-account work should expose clearer operator UX for per-node git
principal assignment, repository namespace policy, and contribution publishing
rules across multiple git services.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/service.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 --reporter verbose`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit

The narrower Vitest `-t` invocation for the source-change review test was
interrupted after it remained open without worker output; the full
`service.test.ts` file run above covered the changed behavior and passed.
