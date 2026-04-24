# Model-Guided Working-Context Memory Slice

## Summary

This slice adds the first bounded model-guided memory-synthesis path on top of
the existing deterministic wiki baseline.

The runner already owned:

- task-page creation;
- wiki log and index maintenance;
- a derived recent-work summary page.

This slice widens that baseline without giving the model arbitrary filesystem
authority.

## What changed

### 1. Engine contracts widened cleanly

The shared engine turn contract now supports:

- per-tool `strict` mode as an explicit opt-in;
- explicit `toolChoice` on a turn request.

The Anthropic adapter now maps both correctly:

- strict tool definitions become Anthropic `strict: true` tools;
- forced tool choice becomes an explicit `tool_choice` request.

This matters because the memory-synthesis path now depends on a guaranteed
structured tool call rather than on brittle prose parsing.

### 2. Memory synthesis is a separate runner boundary

The runner now has a dedicated `RunnerMemorySynthesizer` boundary instead of
silently overloading the main turn path.

That boundary:

- runs after deterministic post-turn memory maintenance;
- builds a bounded follow-on engine request over the current wiki memory refs;
- forces one strict tool call for structured memory synthesis;
- keeps the actual wiki write path runner-owned.

This preserves separation of concerns:

- the main task turn still owns task execution and artifact production;
- deterministic memory maintenance still owns the canonical baseline;
- model-guided synthesis is additive and isolated.

### 3. The first model-guided page is `working-context.md`

The new derived page is:

- `memory/wiki/summaries/working-context.md`

It is intended to hold:

- current focus;
- compact summary of the node's present state;
- stable facts worth carrying forward;
- open questions;
- next actions.

The runner still writes the file itself. The model only supplies the structured
content for that fixed page.

### 4. Failure semantics are intentionally bounded

If model-guided memory synthesis fails:

- the completed turn remains valid;
- the deterministic memory baseline remains intact;
- the failure is recorded in the wiki log.

Memory synthesis is therefore best-effort enrichment, not a hidden condition
for successful task completion.

## Why this design is correct

The important design choice is not just “add memory synthesis”.

It is:

> add model guidance without surrendering memory ownership to arbitrary model
> output.

That is why this slice uses:

- strict tool use for schema-constrained synthesis input;
- a forced tool choice for the bounded summary-write path;
- a runner-owned write target;
- explicit success/failure logging;
- continued deterministic memory maintenance before synthesis runs.

This avoids the two bad extremes:

- pure deterministic memory with no higher-level synthesis;
- arbitrary LLM-authored filesystem mutation.

## Acceptance achieved

This slice is complete when:

- the engine can force a strict structured tool call for synthesis;
- the runner can build a bounded synthesis request over current memory refs;
- the runner writes `working-context.md` through a structured tool path;
- future turn assembly includes that page when present;
- synthesis failure does not invalidate a completed main turn;
- tests cover both success and failure behavior.
