# Explicit Closure Reference Memory Slice

## Summary

This slice closes the next focused-memory quality gap after carry counts and
stale-review hints.

The previous state already had:

- explicit focused-register baseline continuity;
- runner-owned exact closure precedence through `resolutions.md`; and
- runner-owned carry-count and stale-review signals for repeatedly carried
  active items.

But one real weakness remained:

- retirement still depended too much on textual overlap between active
  registers and `resolutions.md`.

That was too fragile. A resolution can legitimately describe closure in better
or narrower wording than the original active register entry.

## What changed

### 1. The bounded synthesis tool now accepts explicit closure references

The strict `write_memory_summary` tool input now includes:

- `closedOpenQuestions`
- `completedNextActions`

These fields are not free-form closure prose. They are bounded lists of exact
current baseline entries that should be retired from the active registers.

### 2. Closure references are runner-validated against the current baseline

The runner now validates those closure-reference fields before any wiki write:

- each `closedOpenQuestions` entry must match a current baseline open question;
- each `completedNextActions` entry must match a current baseline next action;
- explicit closure references require at least one bounded `resolutions` entry.

Invalid references are rejected as structured tool-input errors.

### 3. Retirement is now deterministic even when wording changes

After validation, runner-owned reconciliation now removes active open-question
and next-action items when they are retired by explicit baseline reference,
even if the new `resolutions` text uses different wording.

This is stronger than the previous exact-overlap-only rule.

### 4. The model contract stays bounded

The model still cannot mutate arbitrary files.

It can only:

- propose updated focused registers;
- identify which current active baseline items are now closed or complete; and
- provide bounded `resolutions` text that records the closure durably.

The runner still owns actual reconciliation and filesystem writes.

## Why this matters

This slice strengthens the memory layer from “closure by textual coincidence”
to “closure by validated reference”.

That is a better boundary because:

- the runner keeps deterministic retirement semantics;
- the model can improve or narrow resolution wording without losing closure;
- focused memory no longer depends on exact repeated text to retire stale
  active entries.

## Explicit non-goals

This slice does **not**:

- add semantic fuzzy matching beyond current normalized exact baseline
  references;
- widen host, CLI, or Studio contracts;
- add noisy retirement metadata to the wiki pages;
- replace the existing carry-count/stale-review model;
- allow the model to retire items that are not present in the current
  baseline.

## Validation and quality gates

This slice was only closed after:

- widening the strict tool-input schema and parser;
- adding runner-owned validation for explicit closure references;
- proving active items can be retired even when `resolutions.md` uses
  different wording;
- proving invalid closure references are rejected deterministically;
- re-running targeted runner test/lint/typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has stronger semantic retirement discipline in the focused memory
layer.

The next best move is stronger long-horizon retirement quality on top of this
baseline, not more random summary-page widening.
