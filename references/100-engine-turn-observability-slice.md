# Engine-Turn Observability Slice

## Summary

This slice closes an important visibility gap in the internal engine path.

Before this change, Entangle could execute a bounded internal Anthropic tool
loop, but most of the useful execution outcome disappeared after the turn:

- raw tool requests were not preserved across the internal loop;
- tool execution success or failure was not summarized durably;
- provider stop-reason detail was lost;
- runner turn state and host `runner.turn.updated` events exposed only phase and
  artifact linkage.

The system therefore worked, but it remained too opaque for serious operator
inspection.

## What changed

### 1. Shared engine contracts now distinguish turn outcome from turn content

The shared engine-turn contracts now include:

- canonical `agentEngineStopReason`;
- canonical token-usage shape;
- bounded tool-execution observations;
- reusable `engineTurnOutcome` structure for downstream persistence.

This keeps the observability model shared and machine-readable instead of
creating ad hoc host- or runner-local shapes.

### 2. The internal Anthropic tool loop now records requests and outcomes

The Anthropic adapter now accumulates:

- `toolRequests` across the whole internal tool loop;
- `toolExecutions` with deterministic sequence numbers and bounded error codes;
- `providerStopReason` alongside the normalized Entangle stop reason.

The important constraint is that this remains bounded:

- no raw tool-result payloads are persisted as observability records;
- no large prompt or message transcripts are duplicated into runner activity;
- only the diagnostic minimum is carried forward.

### 3. Tool execution failures are now observable without collapsing the turn

The tool-loop path now distinguishes between:

- undeclared tool requests;
- invalid tool input shape;
- tool-result errors reported by the executor;
- internal tool execution failures.

These cases are summarized through bounded error codes in
`toolExecutions`, and executor failures are converted into bounded tool-result
errors instead of blindly crashing the entire engine path.

That preserves the architecture:

- the model still sees a tool result;
- the runner still receives a normalized turn result;
- operators still get diagnostic visibility later through runner/host state.

### 4. Runner turn state now preserves engine outcome

`RunnerTurnRecord` now persists an optional `engineOutcome` block containing:

- normalized stop reason;
- optional provider stop reason;
- token usage;
- bounded tool-execution observations.

This is the right boundary:

- the runner keeps durable truth about what happened during the turn;
- it does not persist oversized or provider-shaped transcripts;
- host and clients can reuse the same canonical structure.

### 5. Host runner-turn observations and events now carry the same truth

The host now propagates `engineOutcome` through:

- observed runner-turn activity records;
- durable `runner.turn.updated` events.

This means the diagnostic truth is no longer trapped inside the runner-local
turn file. It becomes part of the host-owned inspection surface and the live
event stream.

## Why this design is correct

The key design choice is:

> preserve only bounded, operator-useful turn diagnostics at the stable shared
> contract layer.

This avoids two bad extremes:

- no tool-loop visibility at all;
- indiscriminate persistence of provider-native transcripts or raw tool
  payloads.

The resulting model is strong because it is:

- normalized;
- bounded;
- shared across engine, runner, and host;
- useful both for offline inspection and live event-driven UX later.

## Acceptance achieved

This slice is complete because:

- the internal tool loop now records bounded request and execution metadata;
- provider stop-reason detail is preserved alongside normalized stop reason;
- runner turn records now persist canonical engine outcome;
- host runner-turn observations and `runner.turn.updated` events expose the same
  canonical outcome;
- tests cover successful tool execution plus bounded execution-failure
  containment;
- tests confirm the new shared event/state contracts parse correctly.
