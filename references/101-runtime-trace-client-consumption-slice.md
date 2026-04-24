# Runtime-Trace Client Consumption Slice

## Summary

This slice consumes the already-implemented host-side `engineOutcome` surface
inside the operator clients instead of leaving it trapped in raw host-event
JSON.

The important architectural rule remains unchanged:

> Studio and CLI consume host-owned truth; they do not invent a parallel
> runtime-trace model.

## What changed

### 1. Runtime-trace presentation is now shared in `host-client`

The runtime-trace helper surface now lives in `packages/host-client` and
provides:

- bounded runtime-trace event collection by node id;
- canonical runtime-trace labels;
- bounded detail-line generation for runtime-trace events.

For `runner.turn.updated`, that shared presentation now includes:

- normalized stop reason;
- provider stop reason when available;
- token usage;
- bounded tool-execution summary and recent tool list.

This avoids Studio and CLI diverging on how the same host event should be read.

### 2. Studio now shows richer runtime-trace detail without widening the host API

Studio still reads the same host-owned trace events, but the selected-runtime
trace panel now surfaces bounded detail lines under each event.

For runner-turn events that now means operators can see:

- whether the turn completed or stopped differently;
- provider stop reason where present;
- bounded token usage;
- whether tools ran and whether any of them failed.

No new backend route was required. The improvement is entirely consumption of
already canonical host state.

### 3. CLI now has runtime-trace-oriented filtering and summaries

The CLI host-event surface now supports:

- `--runtime-trace-only` filtering on `host events list`;
- `--runtime-trace-only` filtering on `host events watch`;
- `--summary` output for structured runtime-trace summaries.

This keeps the CLI serious for headless operators without turning it into a
second control plane.

## Why this design is correct

This slice intentionally does **not** widen backend contracts.

Instead it finishes the path that should exist for every new backend truth:

1. canonical machine-readable contract;
2. persistence in the owning backend layer;
3. operator-facing consumption through shared client logic.

That is the right completion pattern for Entangle.

## Acceptance achieved

This slice is complete because:

- the runtime-trace presentation model is shared instead of duplicated;
- Studio surfaces bounded engine/tool-loop detail from existing host events;
- CLI can filter and summarize runtime-trace events through the same host-owned
  event boundary;
- no client-side control logic or backend shadow contracts were introduced;
- tests cover the shared helper behavior plus Studio and CLI consumption.
