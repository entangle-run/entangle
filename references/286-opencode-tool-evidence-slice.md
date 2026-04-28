# OpenCode Tool Evidence Slice

## Current Repo Truth

Entangle already runs node turns through a safe OpenCode CLI/process adapter
when a node uses the default `opencode_server` engine profile. The adapter
isolates OpenCode state under the node engine-state workspace, probes
`opencode --version`, invokes `opencode run --format=json`, captures assistant
text, engine session ids, provider errors, permission auto-rejects, and
generic tool execution outcomes.

The checked-out OpenCode reference at
`/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode`
shows that `opencode run --format=json` emits raw JSON events from the CLI
`run` command. For completed or errored tool parts, the CLI emits `tool_use`
events that contain the OpenCode `ToolPart`. The current OpenCode `ToolPart`
state carries structured `input`, `title`, `output`, `metadata`, and timing
fields for completed tools, and `input`, `error`, `metadata`, and timing fields
for errored tools.

Before this slice, Entangle reduced those events to only `toolId`,
`toolCallId`, sequence, outcome, and error message. Studio, CLI, memory
synthesis, and Host trace projection therefore lost useful bounded evidence
about what the node-local coding engine actually did.

## Target Model

Engine-specific events stay behind the generic Entangle engine contract. The
contract may carry bounded, provider-neutral tool evidence:

- human-readable tool title;
- bounded, redacted input summary;
- bounded output summary;
- duration in milliseconds;
- existing outcome and error information.

This improves observability without letting OpenCode own graph coordination,
policy, assignment, A2A messaging, source-change review, artifact publication,
or User Node signing.

## Impacted Modules

- `packages/types/src/engine/turn-contract.ts`
- `packages/types/src/index.test.ts`
- `services/runner/src/opencode-engine.ts`
- `services/runner/src/opencode-engine.test.ts`
- `services/runner/src/memory-synthesizer.ts`
- `packages/host-client/src/runtime-turn.ts`
- `packages/host-client/src/runtime-turn.test.ts`
- `packages/host-client/src/runtime-trace.ts`
- `packages/host-client/src/runtime-trace.test.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `resources/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`

## Concrete Changes

- Extended `EngineToolExecutionObservation` with optional `title`,
  `inputSummary`, `outputSummary`, and `durationMs`.
- Updated the OpenCode adapter to prefer OpenCode `part.callID` when present,
  while preserving the older `part.id` fallback.
- Added bounded summary extraction for OpenCode tool `state.input`,
  `state.output`, and `state.title`.
- Redacted common sensitive object keys such as tokens, passwords, credentials,
  private keys, secrets, authorization values, and API keys before recording
  input summaries.
- Added duration extraction from OpenCode tool `state.time.start/end`.
- Updated shared runtime turn and runtime trace formatting to show richer tool
  evidence only when the engine recorded it.
- Included tool title and duration in memory synthesis context so a node's wiki
  can preserve better facts about recent tool use without embedding raw
  provider event payloads.

## Tests Required

- Type contract test for enriched tool execution observations.
- OpenCode adapter test proving title/input/output/duration extraction,
  `callID` preference, and redaction.
- Host-client runtime turn formatting test for bounded tool evidence.
- Host-client runtime trace formatting test for tool title and duration.
- Runner and host-client typechecks.

## Migration And Compatibility Notes

The new fields are optional and backward compatible. Existing persisted turn
records without tool evidence remain valid. Existing consumers that only read
`toolId`, `toolCallId`, `outcome`, or `message` continue to work.

The summaries are bounded strings, not raw OpenCode events. This keeps the Host
projection generic and avoids baking OpenCode's internal event schema into the
public Entangle API.

## Risks And Mitigations

- Risk: tool input summaries may contain sensitive values.
  Mitigation: summary extraction redacts common sensitive object keys before
  persistence and truncates all summaries.
- Risk: OpenCode event shape changes.
  Mitigation: extraction is defensive and treats all new fields as optional.
  The adapter still records basic tool outcome if only `tool`, `id`, and
  `state.status` are available.
- Risk: Entangle becomes tied to OpenCode.
  Mitigation: the contract is provider-neutral and can be populated by Codex,
  Claude Code, Aider, or another engine adapter.

## Open Questions

- Whether a future engine adapter should stream intermediate tool progress to
  Host observation events before the turn completes.
- Whether a future permission bridge should attach to the OpenCode server API
  instead of relying on one-shot CLI permission auto-reject observations.
