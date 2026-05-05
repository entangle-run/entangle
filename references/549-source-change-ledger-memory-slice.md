# Source Change Ledger Memory Slice

## Current Repo Truth

Runner-owned task pages now record bounded source-change candidate ids,
status, totals, diff availability, failure reasons, and changed-file rows from
the completed `RunnerTurnRecord`. The derived recent-work summary also carries
that compact code-change evidence. Future turn assembly reads focused memory
summaries and recent task pages through `memoryRefs` plus a bounded memory
brief.

Before this slice there was no dedicated source-change ledger page. A future
turn could inspect the latest task pages or recent-work summary, but code
change history was mixed with general task outcomes.

## Target Model

Each coding-agent node should maintain a runner-owned source-change ledger in
its private wiki. The ledger should be deterministic, compact, and grounded in
task-page evidence. It should help the node remember recent code-change
shape across turns without storing raw diffs or full file-preview content in
durable memory.

## Impacted Modules And Files

- `services/runner/src/memory-maintenance.ts`
- `services/runner/src/runtime-context.ts`
- `services/runner/src/memory-maintenance.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `memory/wiki/summaries/source-change-ledger.md` as a deterministic
  runner-owned summary page.
- Rebuild the ledger after each post-turn memory maintenance pass by scanning
  task pages and keeping the latest source-change-bearing entries.
- Link the ledger from `memory/wiki/index.md`.
- Add the ledger to future turn `memoryRefs`.
- Add the ledger to the bounded memory brief candidate set so coding engines
  receive recent code-change context when the page exists.

## Tests Required

- Runner memory-maintenance coverage for ledger page creation, index linking,
  and memory-ref inclusion.
- Runner targeted test suite.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

Existing task pages remain valid. The ledger is generated from task pages on
future post-turn memory maintenance passes and is additive to the wiki. It
does not change Host projection, runner command protocols, artifact
contracts, or model-provider behavior.

## Risks And Mitigations

- Risk: durable memory stores too much implementation detail. Mitigation: the
  ledger uses the already-bounded source-change summary from task pages and
  excludes raw diffs and full file previews.
- Risk: the ledger is mistaken for source of truth. Mitigation: the ledger is
  private reasoning memory; runner turn records, source-change candidates, git
  refs, and Host projection remain operational truth.
- Risk: no-change turns add noise. Mitigation: the ledger only includes task
  pages with durable source-change signals.

## Open Questions

Future memory work can use the ledger as input for a richer ownership map,
per-file responsibility summary, or repository-area risk register.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner test -- src/memory-maintenance.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over changed code and docs
