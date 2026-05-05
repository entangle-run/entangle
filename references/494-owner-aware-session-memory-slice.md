# Owner-Aware Session Memory Slice

## Current Repo Truth

Runner session records already carry enough topology metadata to distinguish
local session ownership from upstream origin and current graph entrypoint:
`ownerNodeId`, optional `originatingNodeId`, optional `entrypointNodeId`, and
optional `lastMessageType`.

Before this slice, the runner-owned session snapshot preserved only part of
that metadata, and the model-guided memory prompt plus deterministic
`working-context.md` page mostly exposed lifecycle counts, approval counts,
and conversation route metadata. A node could therefore resume a delegated
session without a durable reminder of who originated the session, which node
owns the local runtime state, and where the session entered the graph.

## Target Model

Every coding-agent node should maintain bounded memory that distinguishes:

- the runtime node that owns local session state;
- the node that originated the session when known;
- the graph entrypoint node when known;
- the most recent message type driving the session;
- which observed conversation routes are currently active.

This is a narrow owner-aware memory improvement, not a new orchestration
engine. Session mutation authority remains runner-owned, and Host/Studio/CLI
continue to consume projected state rather than editing runner-local memory.

## Impacted Modules/Files

- `services/runner/src/session-state-snapshot.ts`
- `services/runner/src/session-state-snapshot.test.ts`
- `services/runner/src/memory-synthesizer.ts`
- `services/runner/src/memory-synthesizer.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/376-conversation-aware-working-context-memory-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Preserve `originatingNodeId` in the internal `RunnerSessionSummary`.
- Render owner, origin, entrypoint, and last-message metadata in the bounded
  session snapshot prompt used by model-guided memory synthesis.
- Render the same owner-aware topology lines into deterministic
  `memory/wiki/summaries/working-context.md`.
- Mark each bounded conversation route as active or inactive in both prompt
  projection and deterministic working-context memory.
- Extend runner tests so prompt and durable wiki output prove the new topology
  evidence is carried.

## Tests Required

Passed for this slice:

- `pnpm --filter @entangle/runner test -- src/session-state-snapshot.test.ts src/memory-synthesizer.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`

The runner test script currently runs the package's full runner suite for this
invocation; that completed with 13 files and 143 tests passing.

## Migration/Compatibility Notes

No public schema change is required. The additional snapshot field is internal
to `services/runner`, and older session records without `originatingNodeId`,
`entrypointNodeId`, or `lastMessageType` render explicit `unknown` values.
Existing wiki pages will pick up the new deterministic section lines on the
next successful model-guided memory synthesis pass.

## Risks And Mitigations

- Risk: the memory page overstates cross-runtime ownership semantics.
  Mitigation: the rendered fields are direct typed session metadata, not model
  prose or inferred authority.
- Risk: conversation memory becomes noisy.
  Mitigation: conversation rendering remains bounded and adds one boolean
  active flag per existing route line.
- Risk: operators mistake this for complete delegated-session repair.
  Mitigation: docs keep automated repair workflows and deeper cross-runtime
  synthesis as remaining work.

## Open Questions

- Should future session snapshots expose a separate derived relation enum such
  as `locally_originated`, `inbound_delegation`, or `user_requested` once the
  product model decides exactly how those distinctions should appear in user
  and operator surfaces?

## Result

Agent-node memory now carries owner-aware session topology and active-route
flags. That makes delegated-session continuation less dependent on model prose
and gives each node a stronger durable basis for deciding how to resume work
after upstream handoffs, user requests, approvals, or peer results.
