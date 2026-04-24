# Explicit Stale Item Replacement Slice

## Summary

This slice closes the next focused-memory quality gap after carry counts,
stale-review hints, explicit closure references, and the no-silent-drop rule
for stale baseline items.

The previous state already had:

- explicit focused-register baseline continuity;
- runner-owned carry-count and stale-review signals for repeatedly carried
  active items;
- exact closure precedence through `resolutions.md`;
- explicit closure references for wording-preserving retirement; and
- a runner-owned rule that stale baseline items could not disappear
  silently.

But one real weakness remained:

- stale items still had only two clean exit paths: stay active or become
  resolved.

That was too rigid. Long-running memory also needs a deterministic way to say:

- “this stale question is no longer the right active question; replace it with
  these narrower ones instead”.

## What changed

### 1. The bounded synthesis tool now accepts explicit stale-item replacement refs

The strict `write_memory_summary` tool input now also includes:

- `replacedOpenQuestions`
- `replacedNextActions`

Each replacement entry is a bounded object:

- `from`
- `to`

Where:

- `from` is the exact stale baseline text being retired by replacement;
- `to` is the exact resulting active item text or texts that now carry the
  work forward.

### 2. Replacement is runner-validated, not inferred

The runner now validates explicit replacement refs before any wiki write.

For a replacement ref to be valid:

- `from` must match a current stale baseline entry of the correct register;
- the old stale item must not remain active in the resulting register;
- the old stale item must not also be retired through explicit closure refs;
- the old stale item must not also be copied verbatim into `resolutions.md`;
- every `to` target must appear in the resulting active register;
- replacement targets must not be ambiguous across multiple stale sources.

Invalid replacements are rejected as structured tool-input errors.

### 3. No-silent-drop discipline now has a third precise path

The stale-item no-silent-drop rule is now stronger and more realistic.

A stale active baseline item may now:

- remain active;
- be closed/completed explicitly;
- be carried verbatim into `resolutions.md`; or
- be retired by explicit replacement into narrower active successor items.

That makes the lifecycle model better aligned with real long-horizon memory
maintenance.

## Why this matters

This slice upgrades the focused memory layer from:

- “stale items may survive or close”

to:

- “stale items may survive, close, or be replaced deterministically”.

That matters because the memory system can now narrow stale active work
without:

- silently dropping it;
- pretending it is resolved;
- or relying on fuzzy semantic matching.

## Explicit non-goals

This slice does **not**:

- add fuzzy semantic matching;
- widen host, CLI, or Studio contracts;
- add noisy lifecycle metadata to wiki pages;
- allow arbitrary replacement of fresh active items;
- replace the existing carry-count, stale-review, explicit-closure, or
  no-silent-drop rules.

## Validation and quality gates

This slice was only closed after:

- widening the strict tool-input parser and schema;
- adding runner-owned validation for explicit stale-item replacement refs;
- proving a stale open question can be replaced by a narrower active question;
- proving invalid replacement refs are rejected when their targets do not
  appear in the resulting active register;
- re-running targeted runner lint/typecheck/test loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a stronger focused-memory lifecycle model:

- exact baseline continuity;
- carry counts and stale-review hints;
- explicit closure references;
- no-silent-drop discipline for stale items; and
- explicit replacement for stale active items that need narrower successors.

The next best move is deeper long-horizon consolidation quality on top of this
baseline, not more random register widening.
