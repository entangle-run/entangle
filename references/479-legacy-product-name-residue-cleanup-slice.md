# Legacy Product Name Residue Cleanup Slice

## Current Repo Truth

Active product naming checks already rejected old product labels on public
surfaces, but several historical slice notes still contained literal old
product-name patterns inside local-assumption audit command examples.

## Target Model

The repository should use Entangle as the product identity everywhere.
Historical audit notes may still describe local adapters and same-machine
profiles, but they should not preserve literal legacy product-name strings.

## Impacted Modules/Files

- `references/388-artifact-source-proposal-operator-surfaces-slice.md`
- `references/389-user-client-artifact-source-proposal-slice.md`
- `references/390-artifact-proposal-correlation-slice.md`
- `references/391-runtime-command-receipt-projection-slice.md`
- `references/392-runner-owned-command-receipt-adoption-slice.md`
- `references/393-lifecycle-session-command-receipts-slice.md`
- `references/450-source-history-reconcile-control-slice.md`
- `references/451-user-client-source-history-reconcile-slice.md`
- `references/452-human-interface-runtime-basic-auth-slice.md`
- `references/453-wiki-page-optimistic-concurrency-slice.md`
- `references/454-wiki-page-patch-mode-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace literal old product-name patterns in historical local-assumption
  audit examples with generic "old product identity markers" wording.
- Keep the audit intent intact: these notes still classify local-only runtime
  path, shared-volume, context-file, and Docker assumptions.

## Tests Required

- repository-wide search for legacy product-name literals
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

Documentation-only cleanup. No runtime behavior changes.

## Risks And Mitigations

- Risk: old audit examples become less copy-paste precise.
  Mitigation: active product naming is enforced by `pnpm
  ops:check-product-naming`; historical examples now point at the category
  rather than preserving the old strings.

## Open Questions

None for this slice.
