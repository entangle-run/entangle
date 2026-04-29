# Source Change Memory Carry Forward Slice

## Current Repo Truth

Runner-owned model-guided memory synthesis now receives bounded source-change
evidence from the completed `RunnerTurnRecord`. Before this slice, that
evidence informed the synthesis prompt but the runner-owned
`working-context.md` page did not preserve a deterministic source-change
section unless the model chose to mention it in prose.

## Target Model

Each coding-agent node's private wiki should carry durable code-change context
forward in a runner-owned, bounded, deterministic section. Future turns should
be able to inspect which source-change candidates were produced, their summary
status and totals, the changed-file set, preview availability, and diff
availability without storing raw diffs or full file-preview content in the
node memory wiki.

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

- Render a deterministic `Source Change Context` section in
  `memory/wiki/summaries/working-context.md`.
- Include only bounded metadata: status, totals, source-change candidate ids,
  changed-file summaries, file-preview metadata, and diff availability.
- Keep raw diff excerpts and full preview contents out of durable memory.
- Cover the rendered section in runner memory-synthesis tests.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/memory-synthesizer.test.ts`
- `pnpm verify`

## Migration/Compatibility Notes

The new section is additive in the generated wiki page. Existing memory pages
remain readable, and the runner will rewrite `working-context.md` with the new
section on the next successful model-guided synthesis pass.

## Risks And Mitigations

- Risk: durable memory becomes too verbose when source changes touch many
  files.
  Mitigation: the section uses the same bounded file and preview limits as the
  synthesis prompt.
- Risk: source contents leak into durable memory.
  Mitigation: the rendered page records only metadata and explicitly omits raw
  diff excerpts and file-preview contents.

## Open Questions

- Live provider-backed synthesis still needs manual validation with real model
  credentials, but this deterministic page section is runner-owned and does
  not depend on provider behavior.
