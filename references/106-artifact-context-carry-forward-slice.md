# Artifact-Context Carry-Forward Slice

## Summary

This slice deepens the existing artifact-aware working-context synthesis path by
making the synthesized page preserve bounded artifact context explicitly.

Before this change, the model-guided synthesis pass could see retrieved and
produced artifacts during request assembly, but the durable
`working-context.md` page only carried produced artifact ids and did not retain
structured artifact-backed observations.

## What changed

### 1. The synthesis tool contract now requires `artifactInsights`

The strict `write_memory_summary` tool input now includes:

- `artifactInsights`

This field is bounded exactly like the other list-shaped sections of the
working-context summary. It exists to preserve only durable artifact-backed
observations that future turns should remember.

### 2. The runner still owns the durable artifact section shape

The model does not decide where artifact context lives in the wiki. The runner
still owns:

- the fixed output page;
- the exact headings and section order;
- the deterministic carry-forward of consumed and produced artifact ids.

The model contributes only the structured `artifactInsights` content.

### 3. `working-context.md` now preserves both deterministic and synthesized artifact context

The Artifact Context section now contains:

- a deterministic consumed-artifact list;
- a deterministic produced-artifact list;
- a bounded synthesized `Durable Artifact Insights` list.

This is the correct split:

- deterministic facts stay runner-owned;
- compact carry-forward meaning stays model-guided but schema-bounded.

## Why this matters

The previous slice made memory synthesis artifact-aware at input time. This
slice completes that path by making artifact-aware synthesis materially useful
at output time.

Future turns can now inherit a working-context page that preserves:

- what artifact inputs mattered;
- what work products were produced; and
- why those artifacts matter beyond the raw ids alone.

That is a better durable-memory result than simply giving the synthesizer more
context without letting it survive in the canonical summary page.

## Explicit non-goals

This slice does **not**:

- add arbitrary artifact browsing to memory synthesis;
- introduce a new memory page;
- widen builtin tools;
- let the model choose filesystem layout;
- replace deterministic artifact tracking with model output.

## Validation and quality gates

This slice was only closed after:

- widening the strict synthesis tool schema cleanly;
- extending runner tests to verify consumed artifacts, produced artifacts, and
  durable artifact insights all land in `working-context.md`;
- re-running targeted runner test, lint, and typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remains clean.

## Resulting state

The working-context synthesis path is now:

- session-aware;
- artifact-aware at request time; and
- artifact-carrying at durable-memory output time.

The next best move is to keep deepening broader model-guided memory maintenance
on top of this stronger base rather than adding new builtin tools casually.
