# Inbound Message Working Context Memory Slice

## Current Repo Truth

Runner-owned memory synthesis already receives and persists bounded session,
approval, conversation-route, source-change, handoff, artifact, and execution
context in the model-guided synthesis prompt and durable
`memory/wiki/summaries/working-context.md` page. The inbound A2A message itself
was still represented mostly through high-level prompt fields such as intent
and summary, so durable memory did not explicitly preserve event id, signer,
message type, from/to node ids, parent message id, response policy, or attached
artifact count.

## Target Model

Each agent node should retain a bounded, deterministic record of the inbound
message that caused the completed turn. This gives future turns explicit
coordination provenance without copying peer transcripts, raw logs, or large
payloads into long-lived memory.

## Impacted Modules/Files

- `services/runner/src/memory-synthesizer.ts`
- `services/runner/src/memory-synthesizer.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Render a bounded inbound-message context block from `RunnerInboundEnvelope`.
- Include the block in the model-guided memory synthesis prompt.
- Include the same deterministic block in `working-context.md`.
- Preserve event id, received time, message type, from/to node ids,
  conversation id, optional parent message id, turn id, signer pubkey,
  from pubkey, response policy, approval-before-action flag, and attached
  artifact-ref count.
- Mark signer/from-pubkey mismatch in the durable context when available.

## Tests Required

- Runner memory-synthesizer tests proving the prompt includes inbound-message
  context.
- Runner memory-synthesizer tests proving `working-context.md` includes the
  deterministic inbound-message context.
- Runner typecheck.
- Runner lint.
- Product naming check.
- Diff whitespace check.

## Migration/Compatibility Notes

No migration is required. Existing working-context pages remain readable and
will gain the new section after the next successful model-guided memory
synthesis pass.

## Risks And Mitigations

- Risk: durable memory stores too much peer conversation detail.
  Mitigation: the section stores bounded envelope metadata only, not transcript
  bodies, raw logs, or artifact payloads.
- Risk: signer fields are misunderstood as final trust policy.
  Mitigation: the section records signer provenance that has already passed
  runner transport/service validation; broader production identity policy
  remains separate.

## Verification

Completed for this slice:

- `pnpm exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 src/memory-synthesizer.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers: no hits.

## Open Questions

No product question blocks this bounded memory refinement. Future richer
cross-runtime relation modeling can build on this metadata without widening
the memory payload shape in this slice.
