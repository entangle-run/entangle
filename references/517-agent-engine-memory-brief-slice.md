# Agent Engine Memory Brief Slice

## Current Repo Truth

Agent-engine turn requests already include memory refs for the node wiki,
including focused summary pages such as `next-actions.md`, `open-questions.md`,
`decisions.md`, `stable-facts.md`, and `working-context.md`. OpenCode and other
engine adapters receive those refs, but the prompt did not include a bounded
inline memory brief. An engine therefore had to decide to inspect memory files
before seeing the most important current node context.

## Target Model

Each node's coding engine should enter a turn with immediate, bounded memory
context while still treating the wiki pages as the complete source of truth.
Entangle should provide the brief, enforce bounds, and keep side-effect
authority outside the model.

## Impacted Modules/Files

- `services/runner/src/runtime-context.ts`
- `services/runner/src/index.test.ts`
- `packages/types/src/runtime/session-state.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/runtime-turn.ts`
- `packages/host-client/src/runtime-turn.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Read a bounded subset of focused node-memory summary pages when building an
  engine turn request.
- Add a `Memory brief:` prompt part when those pages exist.
- Keep `memoryRefs` intact so engines can inspect complete source pages.
- Add `memoryBriefContextIncluded` to engine request summaries for runner,
  host-client, and trace presentation.
- Test prompt inclusion and summary projection.

## Tests Required

- Targeted runner runtime-context test.
- Targeted host-client runtime-turn presentation test.
- Targeted types schema test.
- Runner, host-client, and types typechecks.
- Product naming check.
- Diff whitespace check.

## Migration/Compatibility Notes

Existing turn records remain readable because `memoryBriefContextIncluded`
defaults to `false` in the summary schema. Nodes without focused memory pages
emit no memory brief and keep the previous prompt shape.

## Risks And Mitigations

- Risk: the inline brief duplicates memory refs.
  Mitigation: the prompt states that memory refs remain the complete source
  pages, while the brief is only the current baseline.
- Risk: memory pages grow too large for prompt context.
  Mitigation: the runner bounds both per-page and total brief size.
- Risk: the brief accidentally replaces policy or routing authority.
  Mitigation: the action contract and policy prompt remain separate prompt
  parts owned by Entangle.

## Verification

Completed for this slice:

- `pnpm exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 src/index.test.ts` from `services/runner`
- `pnpm exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 src/runtime-turn.test.ts` from `packages/host-client`
- `pnpm exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 src/index.test.ts` from `packages/types`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers: no hits.

## Open Questions

No product question blocks this node-agent prompt hardening.
