# Stale Item Disappearance Discipline Slice

## Summary

This slice closes the next long-horizon memory-quality gap after carry counts,
stale-review hints, and explicit closure references.

The previous state already had:

- explicit focused-register baseline continuity;
- exact closure precedence through `resolutions.md`;
- carry-count and stale-review signals for repeatedly carried active items;
- explicit closure references for active baseline items whose new resolution
  wording differs from the original text.

But one real weakness still remained:

- even a stale review candidate could still disappear silently if the model
  omitted it from the active register set and also failed to retire it
  explicitly.

That was too permissive for long-running memory quality.

## What changed

### 1. Stale active baseline items now require explicit handling

For focused-register baseline entries already marked as stale-review
candidates, the runner now requires one of three outcomes:

- keep the item active with the same exact baseline text;
- retire it explicitly through the closure-reference fields;
- or carry the same exact text into `resolutions.md`.

If none of those happen, the runner rejects the synthesis payload.

### 2. The model instruction is now explicit

The synthesis prompt now states that a stale-review candidate may not disappear
silently.

That keeps the contract honest:

- the model sees the stale signal;
- and the runner enforces the discipline.

### 3. The rule is intentionally narrow

This slice does **not** force the same discipline for every fresh active item.

The stronger no-silent-drop rule applies only to the already stale-review
subset, because that is the point where accidental disappearance becomes most
damaging to memory quality.

## Why this matters

This slice upgrades the memory layer from:

- “stale items are visible and hinted”

to:

- “stale items are visible, hinted, and cannot disappear by accident”.

That is a materially stronger quality boundary for long-running agent memory.

## Explicit non-goals

This slice does **not**:

- add fuzzy semantic matching beyond the existing exact baseline references;
- widen host, CLI, or Studio contracts;
- add noisy retirement metadata to wiki pages;
- force fresh items to follow the same no-silent-drop rule;
- replace the existing carry-count, stale-review, or explicit-closure models.

## Validation and quality gates

This slice was only closed after:

- adding runner-owned validation for stale baseline disappearance;
- proving successful runner tests still pass for explicit closure and carry
  continuity flows;
- proving stale baseline items are rejected when they are dropped without
  explicit retention or retirement;
- re-running targeted runner test/lint/typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a stronger no-silent-drop guarantee for stale focused-memory
items.

The next best move is stronger semantic narrowing/replacement quality on top
of this baseline, not more random summary-page widening.
