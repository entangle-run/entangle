# Execution-Insight Carry-Forward Slice

## Summary

This slice deepens the bounded working-context synthesis path by making the
durable summary preserve execution insights explicitly.

The previous slice made the synthesis prompt aware of the current turn's
normalized engine outcome. That was the right input-side move, but the durable
`working-context.md` page still had no dedicated place to carry forward
execution signals in structured form.

## What changed

### 1. The strict synthesis tool contract now requires `executionInsights`

The bounded `write_memory_summary` tool input now includes:

- `executionInsights`

Like the other list-shaped fields, this is bounded and schema-checked. It is
intended for durable execution signals that future turns should retain, not for
raw log restatement.

### 2. The runner still owns the durable page shape

The model does not decide page layout. The runner still owns:

- the fixed `working-context.md` target;
- section ordering;
- all deterministic carry-forward fields already present.

The model contributes only the bounded `executionInsights` content.

### 3. `working-context.md` now carries a dedicated execution-signals section

The page now includes:

- `## Execution Signals`

This gives durable memory a first-class place to keep the execution patterns
that mattered in the current turn, such as:

- which inspection paths were actually needed;
- whether the provider ended normally;
- whether a bounded execution pattern is worth repeating or avoiding later.

## Why this matters

Without a dedicated execution-signals channel, the model could see the current
turn outcome in the prompt but had no structured obligation to preserve that
knowledge durably.

This slice closes that gap while keeping the same disciplined ownership model:

- runner owns the file;
- schema constrains the model;
- synthesis remains additive, not authoritative over the whole wiki.

## Explicit non-goals

This slice does **not**:

- add a new memory page;
- widen builtin tools;
- expose raw provider payloads;
- change host or Studio surfaces;
- replace deterministic task-page, recent-work, or working-context baselines.

## Validation and quality gates

This slice was only closed after:

- widening the strict synthesis tool schema cleanly;
- extending runner tests to verify execution insights land in
  `working-context.md`;
- re-running targeted runner test, lint, and typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remains clean.

## Resulting state

The model-guided working-context path is now:

- session-aware;
- artifact-aware;
- artifact-carrying at durable-memory output time;
- engine-outcome-aware at prompt time; and
- execution-insight-carrying at durable-memory output time.

The next best move is to keep deepening broader model-guided memory maintenance
instead of expanding the builtin tool catalog casually.
