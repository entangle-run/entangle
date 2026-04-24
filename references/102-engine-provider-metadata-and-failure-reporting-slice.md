# Engine Provider Metadata And Failure Reporting Slice

## Summary

This slice closes the first serious operator-facing gap left after the earlier
engine observability and client runtime-trace work:

- successful turns already preserved normalized stop reason, usage, and bounded
  tool execution outcomes;
- Studio and CLI already consumed that `engineOutcome` through shared
  `host-client` helpers;
- but failed engine turns still collapsed into generic runner/session failure,
  and successful turns did not yet preserve bounded provider identity.

This slice fixes that without widening the host surface or inventing a second
runtime-trace model.

## What changed

### 1. Engine outcomes now carry bounded provider metadata and failure payloads

The shared engine contracts now include:

- `providerMetadata`
  - `adapterKind`
  - `profileId`
  - optional `modelId`
- `failure`
  - normalized `classification`
  - bounded human-readable `message`

Those fields now live in the canonical machine-readable contracts owned by
`packages/types`, not in provider-local ad hoc payloads.

The outcome contract is also stricter now:

- `failure` is only valid when `stopReason` is `error`;
- `stopReason: "error"` now requires a bounded `failure` payload.

### 2. The Anthropic engine now reports provider identity on successful turns

The internal Anthropic adapter now returns provider metadata on successful
turns, using:

- the configured adapter kind;
- the selected endpoint profile id;
- the effective model id, preferring the provider response model when present.

This gives operators a stable way to understand which model path actually ran
without leaking provider-native response types into runner state.

### 3. Runner state now preserves engine failure truth instead of only phase failure

`entangle-runner` now persists a canonical `engineOutcome` in two additional
cases:

- when engine execution throws with a normalized engine failure;
- when the engine completed but a later artifact materialization step failed.

That means the turn record can now preserve:

- which provider path was used;
- whether the engine itself failed;
- the normalized failure classification;
- a bounded failure message;
- or, on successful execution, the successful outcome even if a later post-turn
  step fails.

This is the right order of truth:

1. engine execution truth
2. runner phase truth
3. later artifact/memory/emit failures

## Why this design is correct

This slice keeps the existing architecture clean:

- the canonical outcome still originates in the engine/runner boundary;
- the runner still owns durable turn persistence;
- the host still observes runner truth rather than inventing its own error
  model;
- Studio and CLI still consume shared host-client presentation instead of
  branching into separate formatting rules.

It also improves failure rigor significantly:

- engine failures are no longer only implied by `phase: "errored"`;
- successful engine output is no longer lost when a later artifact step fails;
- provider identity is preserved in a bounded, stable form.

## Acceptance achieved

This slice is complete because:

- canonical engine contracts now include bounded provider metadata and failure
  reporting;
- successful Anthropic turns preserve provider identity;
- failed engine turns persist bounded failure classification and message;
- runner turn records keep successful engine outcomes even when artifact
  materialization fails later;
- shared runtime-trace presentation in Studio and CLI now surfaces the richer
  provider/failure view through the existing host-owned event model;
- tests cover contract validation, agent-engine success metadata, runner
  failure persistence, runner post-engine failure persistence, and shared
  operator-facing trace formatting.
