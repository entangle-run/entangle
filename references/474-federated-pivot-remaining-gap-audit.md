# Federated Pivot Remaining Gap Audit

## Current Repo Truth

Recent implementation slices closed several items that older pivot summaries
still described as open:

- User Client source-history reconcile is process-smoke covered for the
  policy-permissive graph path.
- Runner-owned wiki page upsert enforces `expectedCurrentSha256` stale-edit
  guards.
- Runner-owned wiki page upsert supports single-page `patch` mode.
- The process-runner smoke proves participant wiki patch requests through the
  running User Client and projected command receipts.

`references/221-federated-runtime-redesign-index.md` still had a stale
"remaining blocking implementation areas" paragraph that included the stale
wiki guard and patch-mode items.

## Target Model

The pivot index should name only current remaining work. Completed items should
stay described as implemented capabilities, while future work should focus on
larger product gaps:

- richer model-guided memory maintenance;
- deeper delegated-session semantics and repair workflows;
- collaborative wiki merge UI and multi-page patch-set semantics;
- repository lifecycle and replicated/fallback artifact behavior;
- infrastructure-backed multi-machine proof execution;
- non-disposable upgrade and repair behavior;
- production identity and authorization beyond bootstrap tokens.

## Impacted Modules/Files

- `references/221-federated-runtime-redesign-index.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Reword the target progress summary for artifact/source/wiki publication so
  source-history reconcile, stale-edit guards, and single-page patch mode are
  no longer listed as open.
- Replace the stale "remaining blocking implementation areas" paragraph with
  the current remaining gap list.

## Tests Required

- `pnpm ops:check-product-naming`
- `git diff --check`

No runtime code changed in this slice.

## Migration/Compatibility Notes

None. This is a documentation audit repair.

## Risks And Mitigations

- Risk: documentation overstates completion.
  Mitigation: the updated text keeps approved source-history reconcile under
  `applyRequiresApproval: true`, collaborative wiki merge UI, multi-page
  patch-set behavior, and infrastructure-backed multi-machine proof outside
  the completed set.

## Open Questions

None for this slice.
