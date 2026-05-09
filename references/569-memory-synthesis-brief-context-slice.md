# Memory Synthesis Brief Context Slice

## Current Repo Truth

Normal agent-engine turns already receive a bounded `Memory brief` built from
focused wiki summaries and deterministic ledgers. Model-guided post-turn memory
synthesis already received memory refs, focused register baseline, current-turn
evidence, source-change evidence, handoff evidence, and session snapshots, but
it did not receive the same bounded brief inline in the synthesis prompt.

## Target Model

Post-turn memory synthesis should make decisions from the same compact node
memory baseline used by agentic turns, while keeping full wiki pages available
through `memoryRefs`. This gives the model enough durable context to update
focused registers without re-reading every page on each synthesis pass.

## Impacted Modules And Files

- `services/runner/src/runtime-context.ts`
- `services/runner/src/memory-synthesizer.ts`
- `services/runner/src/memory-synthesizer.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Export the existing bounded memory-brief collector from runtime-context.
- Add the memory brief to model-guided memory synthesis interaction prompt
  parts when focused wiki summaries or deterministic ledgers are present.
- Keep full `memoryRefs` unchanged so complete source pages remain available to
  engines that inspect refs.
- Add regression coverage proving the model-guided synthesis prompt contains
  the bounded brief and a focused summary section.

## Tests Required

- Memory synthesizer focused test for memory brief prompt inclusion.
- Runner typecheck.
- Runner focused lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No data migration is required. The change only reuses existing memory wiki
files during prompt assembly. Empty or missing memory pages keep the previous
behavior because no brief is emitted.

## Risks And Mitigations

- Risk: synthesis prompt becomes too large. Mitigation: the existing collector
  already applies per-file and total character budgets.
- Risk: model overweights stale summary content. Mitigation: the prompt still
  includes current-turn evidence and focused register state after the brief.
- Risk: duplicate context appears through refs and prompt. Mitigation: the
  brief is bounded and tells the model to consult refs for complete source
  pages.

## Open Questions

Future slices can add explicit brief-quality scoring, stale-section pruning,
and model-guided promotion from deterministic ledgers into focused registers.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/memory-synthesizer.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "writes and indexes a bounded working-context summary"`

The final slice audit also runs runner typecheck, focused lint, product naming,
whitespace, changed-diff marker checks, and `git diff` review before commit.
