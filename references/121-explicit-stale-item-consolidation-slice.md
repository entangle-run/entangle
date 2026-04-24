# Explicit Stale Item Consolidation Slice

## Summary

This slice closes the next focused-memory quality gap after carry counts,
stale-review hints, explicit closure references, stale-item no-silent-drop,
and explicit stale-item replacement.

The previous state already had:

- explicit focused-register baseline continuity;
- carry-count and stale-review signals for repeatedly carried active items;
- runner-owned exact closure precedence through `resolutions.md`;
- explicit closure references for wording-safe retirement;
- a no-silent-drop rule for stale baseline items; and
- explicit one-to-many or one-to-one stale-item replacement through
  validated `from -> to` mappings.

But one real weakness remained:

- multiple overlapping stale active items still had no deterministic many-to-one
  path into one cleaner successor item.

That meant long-running memory could still accumulate parallel stale items that
really wanted to collapse into one narrower active question or one narrower
active next action.

## What changed

### 1. The bounded synthesis tool now accepts explicit stale-item consolidation refs

The strict `write_memory_summary` tool input now also includes:

- `consolidatedOpenQuestions`
- `consolidatedNextActions`

Each consolidation entry is a bounded object:

- `from`
- `to`

Where:

- `from` is a bounded list of exact stale baseline entries being retired by
  consolidation;
- `to` is the exact resulting active item text that should replace them.

### 2. Consolidation is runner-validated, not inferred

The runner now validates explicit consolidation refs before any wiki write.

For a consolidation ref to be valid:

- every `from` entry must match a current stale baseline item of the correct
  register;
- the stale source entries must not remain active in the resulting register;
- the stale source entries must not also be closed explicitly;
- the stale source entries must not also be copied verbatim into
  `resolutions.md`;
- the stale source entries must not also appear in explicit replacement refs;
- the resulting `to` entry must appear in the resulting active register;
- the same active target must not be assigned ambiguously across stale
  transition refs.

Invalid consolidations are rejected as structured tool-input errors.

### 3. Stale-item lifecycle now supports many-to-one cleanup explicitly

The focused-memory lifecycle can now handle a stale item in four explicit ways:

- keep it active;
- close or complete it explicitly;
- replace it with narrower successor items; or
- consolidate multiple stale items into one narrower successor item.

That gives the memory layer a cleaner long-horizon discipline than simple
carry-forward plus closure.

## Why this matters

This slice upgrades the focused memory layer from:

- “stale items can survive, close, or be replaced”

to:

- “stale items can also be consolidated deterministically when overlap has
  become the real problem”.

That matters because durable memory quality is not only about closure. It is
also about reducing redundant active items without losing traceability.

## Explicit non-goals

This slice does **not**:

- add fuzzy semantic matching;
- widen host, CLI, or Studio contracts;
- add noisy lifecycle metadata to wiki pages;
- allow arbitrary consolidation of fresh active items;
- replace the existing carry-count, stale-review, explicit-closure,
  no-silent-drop, or explicit-replacement rules.

## Validation and quality gates

This slice was only closed after:

- widening the strict tool-input parser and schema;
- adding runner-owned validation for explicit stale-item consolidation refs;
- proving multiple stale open questions can consolidate into one narrower
  active open question;
- proving invalid consolidation refs are rejected when their target does not
  appear in the resulting active register;
- re-running targeted runner lint/typecheck/test loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a stronger focused-memory lifecycle model:

- exact baseline continuity;
- carry counts and stale-review hints;
- explicit closure references;
- no-silent-drop discipline for stale items;
- explicit stale-item replacement; and
- explicit stale-item consolidation.

The next best move is stronger long-horizon consolidation and retirement
quality on top of this baseline, not more random register widening.
