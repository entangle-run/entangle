# Agent Engine Inbound Routing Context Slice

## Current Repo Truth

Agent engine turn requests already include bounded runtime context: graph,
node, model/git bindings, agent runtime profile, workspace boundaries, policy,
Entangle action contract, peer routes, inbound intent, inbound summary, inbound
sender, response policy, approval-before-action flag, and inbound artifact-ref
count. The `Inbound controls` prompt block did not explicitly include the
conversation id, turn id, parent message id, or from/to node ids.

## Target Model

Every coding-agent engine adapter should receive enough bounded message-routing
context to reason about the conversation it is serving without knowing Host
internals or reading Host state. Entangle still owns routing, policy, signing,
and side-effect execution; the engine only receives bounded context.

## Impacted Modules/Files

- `services/runner/src/runtime-context.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend `Inbound controls` in `AgentEngineTurnRequest` interaction prompts.
- Include conversation id, turn id, parent message id, from node, and to node.
- Keep the existing response-policy, approval, and artifact-count fields.
- Add runner tests proving the prompt carries the new routing fields.

## Tests Required

- Runner index test for inbound control prompt content.
- Runner typecheck.
- Runner lint.
- Product naming check.
- Diff whitespace check.

## Migration/Compatibility Notes

No migration is required. Engine adapters receive additional prompt context but
the `AgentEngineTurnRequest` schema does not change.

## Risks And Mitigations

- Risk: engine output relies on routing metadata to bypass Entangle.
  Mitigation: the same prompt still states that Entangle validates and executes
  side effects through action directives; routing metadata is context, not
  authority.
- Risk: prompts become too verbose.
  Mitigation: only bounded identifiers and booleans are added.

## Verification

Completed for this slice:

- `pnpm exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 src/index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers: no hits.

## Open Questions

No product question blocks this prompt-context widening. Future cross-runtime
relation modeling may add more structured edge semantics, but this slice keeps
the change bounded to the existing prompt.
