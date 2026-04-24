# Focused Register Lifecycle Discipline Slice

## Summary

This slice strengthens the lifecycle discipline of the bounded memory layer
without widening model authority.

Before this change, the runner already maintained focused registers for:

- `open-questions.md`
- `next-actions.md`
- `resolutions.md`

But two quality gaps remained:

- synthesis continuity still depended too much on the model implicitly
  recovering current register state from broader memory context; and
- exact overlap between active registers and `resolutions.md` could survive as
  silent duplication.

This slice fixes both gaps with a runner-owned design.

## What changed

### 1. Focused register baseline is now explicit in the synthesis prompt

Before executing the strict `write_memory_summary` tool call, the runner now
reads the current focused register pages and extracts the canonical entries
from:

- `## Open Questions`
- `## Next Actions`
- `## Resolutions`

That baseline is rendered directly into the synthesis prompt so the model sees
the active lifecycle state explicitly.

### 2. Exact closure reconciliation is now deterministic and runner-owned

After parsing the model output, the runner now performs bounded reconciliation
across the lifecycle registers:

- if a normalized item appears in `resolutions`,
- the same normalized item is removed from `openQuestions`;
- and it is removed from `nextActions`.

This keeps resolved items from surviving inside active registers purely by
accidental duplication.

### 3. Working context inherits the reconciled lifecycle view

The reconciled lifecycle registers now feed:

- `working-context.md`
- `open-questions.md`
- `next-actions.md`
- `resolutions.md`

So the omnibus summary and the focused pages all reflect the same lifecycle
state instead of diverging.

## Why this matters

Focused registers are only useful if they behave like durable state surfaces,
not like loosely related prose fragments.

This slice improves that by making two things explicit:

- continuity across turns; and
- exact closure precedence.

Resolved items now have a deterministic home, and active registers are less
likely to drift into contradictory overlap.

## Explicit non-goals

This slice does **not**:

- attempt semantic deduplication beyond exact normalized string matching;
- introduce timestamps or aging policy for individual register entries;
- widen the builtin tool surface;
- make memory synthesis mandatory for successful turns;
- replace deterministic task-page or recent-work baselines.

## Validation and quality gates

This slice was only closed after:

- widening runner tests to prove prompt-time baseline continuity;
- proving exact resolved overlap is removed from open-question and next-action
  pages while preserved in `resolutions.md`;
- re-running runner lint, typecheck, and tests;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a stronger lifecycle discipline for focused memory registers:

- current active register state is explicit at synthesis time; and
- exact closure conflicts are resolved by the runner, not left to prompt luck.

The next best move is stronger aging and stale-item discipline for these same
registers, not another random summary widening.
