# Engine-Outcome-Aware Working-Context Slice

## Summary

This slice deepens model-guided working-context synthesis by making the
synthesis prompt explicitly aware of the just-completed turn's structured
engine outcome.

Before this change, the synthesis prompt carried:

- assistant messages;
- session snapshot context;
- retrieved and produced artifact context.

But it did not carry a dedicated structured summary of the current turn's
engine outcome beyond the coarse stop reason line.

## What changed

### 1. Working-context synthesis now receives a bounded current-turn engine summary

The synthesis prompt now includes a dedicated `Current turn engine outcome`
block with:

- normalized stop reason;
- provider stop reason when present;
- bounded token usage when present;
- bounded failure payload when present;
- a bounded list of tool executions from the just-completed turn.

### 2. This widening is prompt-only, not contract sprawl

This slice does **not** widen host surfaces, artifact contracts, or memory-page
ownership.

It reuses the already canonical `AgentEngineTurnResult` shape and exposes a
bounded summary of that result only to the internal memory-synthesis path.

### 3. Working-context synthesis is now grounded in all three local realities

The synthesis pass now reasons over:

- durable memory state;
- current session state; and
- the exact engine/tool outcome of the current turn.

That is a stronger basis for durable memory maintenance than relying on
assistant text alone.

## Why this matters

Assistant messages alone are not always enough to understand what materially
happened in a turn.

Sometimes the important durable fact is:

- which builtin tools actually ran;
- whether the provider stopped naturally or for a tool protocol reason;
- whether the turn failed in a bounded, classifiable way;
- whether the token budget profile suggests the turn was shallow or heavy.

This slice makes that information available to memory synthesis without
spilling provider-native detail into stable memory-page ownership.

## Explicit non-goals

This slice does **not**:

- add new memory pages;
- widen builtin tools;
- persist raw provider payloads;
- change host/runtime event surfaces;
- replace durable task pages or recent-work summaries.

## Validation and quality gates

This slice was only closed after:

- widening the synthesis prompt assembly cleanly;
- extending runner tests to verify the current-turn engine outcome block is
  present and correctly bounded;
- re-running targeted runner test, lint, and typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remains clean.

## Resulting state

The model-guided working-context path is now:

- session-aware;
- artifact-aware;
- artifact-carrying at durable-memory output time; and
- engine-outcome-aware for the current turn.

The next best move is to keep deepening broader model-guided memory maintenance
on top of this stronger grounding rather than adding new builtin tools casually.
