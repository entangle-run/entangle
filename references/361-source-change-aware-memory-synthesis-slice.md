# Source Change Aware Memory Synthesis Slice

## Current Repo Truth

Runner-owned deterministic memory maintenance already writes task pages,
recent-work summaries, and wiki repository snapshots after completed turns.
Optional model-guided memory synthesis already consumes bounded session,
artifact, approval, and engine-outcome evidence. The runner turn record also
contains bounded source-change evidence, but that record was not passed into
the model-guided synthesis prompt.

## Target Model

Each agent node's private memory/wiki should retain durable code-change context
when a turn modifies source, without copying raw diffs or full file previews
into long-lived memory. The synthesis prompt should expose bounded
source-change metadata such as candidate ids, totals, changed-file summaries,
preview availability, and diff availability.

## Impacted Modules/Files

- `services/runner/src/memory-synthesizer.ts`
- `services/runner/src/service.ts`
- `services/runner/src/memory-synthesizer.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend `RunnerMemorySynthesisInput` with the completed `RunnerTurnRecord`.
- Pass the completed turn record from `RunnerService` into optional
  model-guided memory synthesis.
- Render a bounded "Current source-change evidence" prompt section with source
  summary status, totals, candidate ids, changed files, preview metadata, and
  diff availability.
- Explicitly instruct the synthesizer to use bounded source-change evidence
  without copying raw diffs or file previews into memory.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/memory-synthesizer.test.ts`
- `pnpm verify`

## Migration/Compatibility Notes

The new `turnRecord` input is optional for custom synthesizers and tests, so
existing integrations that construct `RunnerMemorySynthesisInput` directly do
not need an immediate update.

## Risks And Mitigations

- Risk: model-guided synthesis stores too much source detail.
  Mitigation: the prompt exposes bounded metadata and explicitly forbids
  copying raw diffs or full file previews into memory.
- Risk: memory synthesis becomes dependent on source-change harvesting.
  Mitigation: the prompt renders a deterministic "none recorded" section when
  the turn lacks source-change evidence.

## Open Questions

- Live provider-backed memory synthesis still needs manual validation against
  real model-provider credentials.
