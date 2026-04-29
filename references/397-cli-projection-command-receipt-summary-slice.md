# CLI Projection Command Receipt Summary Slice

## Current Repo Truth

Studio now lists recent runtime command receipts, and assignment timelines show
assignment-scoped command receipts. The CLI projection summary still exposed
only `runtimeCommandReceiptCount`, so headless operators had to request the
full projection JSON or inspect assignment timelines one by one to see recent
command closure.

## Target Model

`entangle host projection --summary` should remain compact while surfacing the
same recent command receipt evidence Studio exposes:

- total command receipt count;
- up to six recent command receipts;
- command id, command type, status, node id, runner id, observed time, and
  assignment id when present.

## Impacted Modules And Files

- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add CLI sorting and projection helpers for
  `RuntimeCommandReceiptProjectionRecord`.
- Add `runtimeCommandReceipts` to the compact Host projection CLI summary.
- Extend CLI projection output tests with command receipt fixtures.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/cli test -- --runInBand`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/cli exec tsc -p tsconfig.json --noEmit`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is an additive CLI summary field. Full projection JSON is unchanged.

## Risks And Mitigations

- Risk: compact projection output grows too large.
  Mitigation: recent command receipt rows are capped at six, matching the
  bounded Studio presentation pattern.

## Open Questions

- Should CLI add a dedicated `host command-receipts list` command with filters
  by assignment id, command type, and receipt status?
