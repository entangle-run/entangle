# Active Product Naming Guardrail Slice

## Current Repo Truth

The active product is Entangle. Historical references may still discuss earlier
same-machine delivery plans, but active code, deployment, example, script, and
README surfaces should not reintroduce old product names or runtime-profile
labels.

Before this slice, the repository relied on manual review to keep active
surfaces free of those legacy strings.

## Target Model

The product-identity constraint should be mechanically checkable. Active
operator-facing surfaces must say Entangle and must not revive old local
product/profile names.

## Impacted Modules/Files

- `scripts/check-active-product-naming.mjs`
- `package.json`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `pnpm ops:check-product-naming`.
- Scan active product paths: `README.md`, `apps`, `deploy`, `examples`,
  `package.json`, `packages`, `scripts`, and `services`.
- Fail on old product slug, old product name, old runtime profile, and old
  release milestone strings.
- Leave historical reference/release material out of the active-surface gate.

## Tests Required

- `pnpm ops:check-product-naming`
- `pnpm lint`
- `pnpm typecheck`

## Migration/Compatibility Notes

No runtime contracts change. This is a repository-quality guardrail for active
product surfaces. Historical docs can be cleaned later through intentional
archival or rewrite work instead of silently rewritten by this check.

## Risks And Mitigations

- Risk: the check blocks legitimate historical discussion in active docs.
  Mitigation: the check intentionally targets active product surfaces and
  excludes the historical reference corpus.
- Risk: new legacy wording appears in canonical references.
  Mitigation: the federated documentation pack still carries manual audit
  discipline for canonical references; this script guards the most visible
  active surfaces.

## Open Questions

- Should a later cleanup archive or rewrite older release packets so the entire
  repository, not only active surfaces, is free of obsolete product framing?
