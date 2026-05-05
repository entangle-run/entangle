# Source-Change Task Memory Slice

## Current Repo Truth

Runner memory maintenance already writes deterministic task pages and a derived
recent-work summary after each handled turn. Model-guided synthesis receives
bounded source-change evidence, and the working-context page can preserve
source-change context when synthesis succeeds. The deterministic task page,
however, did not retain structured source-change candidate ids, totals, diff
availability, or changed-file summaries, so a node could lose this code-change
evidence whenever model-guided synthesis was skipped, disabled, or failed.

## Target Model

Every coding-agent node should retain compact source-change evidence in its
runner-owned wiki baseline. The task page should record the current turn's
source-change candidate ids and bounded source-change summary from the real
`RunnerTurnRecord`. The recent-work summary should surface the same compact
source-change memory so future turns can see recent code-change shape without
needing runner-local turn files.

## Impacted Modules And Files

- `services/runner/src/memory-maintenance.ts`
- `services/runner/src/memory-maintenance.test.ts`
- `services/runner/src/service.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend deterministic post-turn memory maintenance input with the optional
  `RunnerTurnRecord`.
- Render a `Source Changes` section into each task memory page.
- Include source-change candidate ids, status, totals, diff excerpt
  availability, failure reason when present, and bounded changed-file rows.
- Pass the live `turnRecord` from runner service into deterministic memory
  maintenance.
- Extract compact source-change lines into the derived recent-work summary.

## Tests Required

- Runner memory-maintenance test coverage for task page source-change memory.
- Runner memory-maintenance test coverage for recent-work source-change lines.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

Existing task pages remain valid. New source-change sections appear on future
turns and in the regenerated recent-work summary. The change is additive and
does not alter model-guided synthesis contracts.

## Risks And Mitigations

- Risk: task pages become too large.
  Mitigation: the section uses the already-bounded source-change summary from
  the runner turn record rather than raw diffs or full file previews.
- Risk: memory is mistaken for source-of-truth state.
  Mitigation: source-change memory is explicitly a compact wiki baseline for
  future reasoning; Host projection and runner turn records remain the
  authoritative operational read models.

## Open Questions

Future model-guided memory work can use this deterministic section to maintain
a dedicated source-change ledger or ownership map without widening the
immediate turn protocol.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner test -- src/memory-maintenance.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit; no new relevant hits
