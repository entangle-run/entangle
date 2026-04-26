# Studio Runtime Turn Detail Slice

## Purpose

Expose the new host-owned runtime turn inspection surface inside Studio.

Before this slice, persisted runner turns were available through host routes,
the shared host client, and the CLI, while Studio could only see turn activity
indirectly through live trace events. That left visual operators without a
durable turn drilldown even though the host already owned the resource.

## Implemented behavior

- Added Studio runtime-turn helper functions for:
  - deterministic newest-first sorting;
  - turn label formatting;
  - trigger, engine, and memory-synthesis status formatting;
  - consumed and produced artifact summary formatting;
  - bounded turn-detail line formatting.
- Added selected-runtime turn loading through `client.listRuntimeTurns(nodeId)`.
- Added selected-turn drilldown through `client.getRuntimeTurn(nodeId, turnId)`.
- Preserved stale-selection guards so outdated detail responses cannot replace
  the current selected runtime or selected turn.
- Kept turn-list errors and turn-detail errors isolated from the broader
  selected-runtime panel.
- Added unit coverage for the Studio helper behavior.

## Design notes

Studio remains a host client. It does not read runner-Entangle state files, infer
turn truth from event history, or maintain a client-owned turn model.

The live trace panel remains the best surface for streaming activity. The
runtime-turn panel is the durable inspection surface for persisted
`RunnerTurnRecord` state, including phase, trigger, session linkage, artifact
linkage, normalized engine outcome, tool execution summary, and
memory-synthesis outcome.

## Verification

- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
