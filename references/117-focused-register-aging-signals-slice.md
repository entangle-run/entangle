# Focused Register Aging Signals Slice

## Summary

This slice adds the first explicit aging discipline to the bounded focused
memory registers without polluting the wiki with noisy lifecycle metadata.

The previous slice already gave the model two things:

- the current focused-register baseline; and
- runner-owned exact closure precedence through `resolutions.md`.

But it still left one real quality gap:

- the runner had no durable notion of how long an active open question or next
  action had been carried forward across synthesis passes.

That meant repeated carry-forward could still survive only as prose continuity,
not as runner-owned state.

## What changed

### 1. Runner-owned focused-register carry state now exists

The runner now persists a separate focused-register state file under
runtime-Entangle state.

That state tracks, per focused register entry:

- normalized key;
- current text;
- first observed turn id;
- last observed turn id;
- carry count.

This state is machine-readable and runner-owned. It is not stored in the wiki
pages themselves.

### 2. Prompt-time baseline continuity now includes aging signals

When building the bounded `write_memory_summary` synthesis request, the runner
now combines:

- the current focused register pages; and
- the runner-owned carry state.

For repeatedly carried active items, the prompt now includes bounded
carry-forward hints. After a fixed carry threshold, active items are marked as
explicit stale-review candidates.

This gives the model better pressure to:

- keep still-valid active items;
- narrow them;
- replace them with more precise items; or
- close them through bounded `resolutions`.

### 3. The wiki stays clean

The durable focused pages remain human-readable:

- `open-questions.md`
- `next-actions.md`
- `resolutions.md`
- `working-context.md`

No synthetic carry-count or staleness metadata is written into those pages.

The lifecycle metadata lives in runner-owned structured state only.

### 4. Successful synthesis now refreshes the carry state deterministically

After the model output is parsed and reconciled, the runner now updates the
focused-register carry state:

- persisted entries increment their carry count;
- new entries start at carry count `1`;
- entries that disappear from the reconciled register set are removed from the
  active carry state;
- resolved overlaps still obey runner-owned closure precedence.

## Why this matters

Focused registers are now stronger in three distinct ways:

- continuity is explicit;
- closure precedence is explicit;
- repeated carry-forward is explicit.

That is a better memory-quality boundary than relying on the model to notice
staleness from prose alone.

## Explicit non-goals

This slice does **not**:

- add timestamps or noisy lifecycle annotations to the wiki pages;
- widen host, CLI, or Studio contracts;
- make synthesis failure turn-fatal;
- attempt semantic deduplication beyond the current normalized exact-match
  discipline;
- introduce automatic retirement policy beyond bounded stale-review hints.

## Validation and quality gates

This slice was only closed after:

- adding a canonical machine-readable contract for focused-register carry
  state;
- persisting that state through the runner-owned state store;
- proving prompt-time stale hints appear for repeatedly carried active items;
- proving successful synthesis writes and increments the carry state
  deterministically;
- re-running targeted `types` and `runner` test/lint/typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has the first explicit aging-signals layer for focused memory
registers.

The next best move is stronger semantic retirement and resolution discipline
on top of this carry-count baseline, not more random summary-page widening.
