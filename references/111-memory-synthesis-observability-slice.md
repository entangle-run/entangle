# Memory-Synthesis Observability Slice

## Summary

This slice makes the optional model-guided memory phase observable through the
same canonical runtime-trace path already used for main turn execution.

Before this change, memory synthesis could succeed or fail and the result would
be visible only in:

- runner-local wiki content; and
- best-effort wiki log entries.

That was not enough once memory synthesis had become a meaningful phase of the
runner rather than a trivial add-on.

## What changed

### 1. Runner turn state now records canonical memory-synthesis outcome

`RunnerTurnRecord` now supports an optional structured memory-synthesis
outcome with two bounded states:

- `succeeded`
- `failed`

Success records keep:

- the update timestamp; and
- the canonical `working-context.md` path written by the runner.

Failure records keep:

- the update timestamp; and
- a bounded failure message.

### 2. Service-level memory synthesis now persists outcome without changing success semantics

`RunnerService` now records memory-synthesis outcome after the optional phase
completes, regardless of whether the phase succeeded or failed.

This preserves the intended semantics:

- the main turn can still complete successfully even if memory synthesis fails;
- the failure is no longer hidden inside wiki-only logging;
- the canonical turn record still tells the truth about what happened.

### 3. Host activity observation and runtime trace now surface the same outcome

The host-owned observed runner-turn activity model and `runner.turn.updated`
events now include the canonical memory-synthesis outcome.

That means the same bounded information can flow into:

- host persistence;
- CLI runtime-trace inspection; and
- Studio runtime-trace inspection.

## Why this matters

This slice closes an observability mismatch:

- engine execution already had a canonical structured outcome;
- memory synthesis, despite affecting durable memory, did not.

The result was an avoidable blind spot for operators and for future debugging.

With this slice:

- memory synthesis becomes part of the auditable turn history;
- operator trace surfaces can distinguish execution success from memory
  enrichment success; and
- later runtime or Studio work does not need to scrape wiki logs to understand
  what happened.

## Explicit non-goals

This slice does **not**:

- make memory synthesis turn-fatal;
- add a new host API resource;
- expose raw model payloads from the synthesis pass;
- widen the memory-synthesis algorithm itself;
- replace wiki-log or durable memory pages.

## Validation and quality gates

This slice was only closed after:

- widening machine-readable runner-turn, observed-activity, and host-event
  contracts;
- persisting bounded memory-synthesis outcome in runner turn state;
- widening runner tests for both successful and failed memory-synthesis
  persistence;
- widening host/runtime-trace tests so CLI and Studio surfaces now show the
  new bounded outcome;
- re-running targeted package tests;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remains clean.

## Resulting state

Entangle now treats optional memory synthesis as an observable phase of the
runner rather than a wiki-only side effect.

The next best move is to continue broadening memory maintenance and runtime
reasoning carefully, now that the phase is both functionally stronger and
operationally visible.
