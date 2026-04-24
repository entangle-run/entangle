# Focused Memory Summary Registers Slice

## Summary

This slice deepens the model-guided memory layer without widening model
authority.

Before this change, one bounded synthesis pass produced exactly one durable
page:

- `memory/wiki/summaries/working-context.md`

That was already useful, but it kept too much durable state in one omnibus
summary.

This slice keeps the same single synthesis pass and the same runner-owned
write boundary, while widening the durable output into a small focused summary
set.

## What changed

### 1. One synthesis pass now updates multiple focused summary registers

The same strict tool-driven synthesis pass now updates:

- `memory/wiki/summaries/working-context.md`
- `memory/wiki/summaries/stable-facts.md`
- `memory/wiki/summaries/open-questions.md`

The model still returns one bounded structured payload. The runner still owns
all filesystem writes. The widening is therefore structural, not authority
expanding.

### 2. Future turns now see the focused summaries directly

`collectMemoryRefs()` now includes the new stable-facts and open-questions
summary pages when present.

That means future engine turns can consume:

- recent work;
- current working context;
- durable stable facts;
- durable open questions and suggested next actions;
- the freshest task pages.

### 3. Memory-synthesis success is now richer and more truthful

Successful `memorySynthesisOutcome` records no longer say only that
`working-context.md` was updated.

They now also preserve:

- the canonical working-context path; and
- the full list of updated summary page paths for the same synthesis pass.

This keeps runtime trace and persisted turn state aligned with the real durable
memory surface.

## Why this matters

This slice closes a practical design gap:

- the synthesis prompt had already become richer and more grounded;
- the durable wiki output was still too concentrated in one page.

By splitting the same bounded synthesis result into focused registers, the wiki
becomes easier to reuse in later turns without widening builtin tools or
introducing free-form model-authored filesystem mutation.

## Explicit non-goals

This slice does **not**:

- add new builtin tool kinds;
- let the model choose arbitrary output paths;
- make memory synthesis mandatory for turn success;
- replace task pages, recent-work, or the deterministic wiki baseline;
- widen provider contracts beyond what the existing synthesis path needs.

## Validation and quality gates

This slice was only closed after:

- widening shared session-state contracts;
- widening runner-owned synthesis output and indexing behavior;
- proving via tests that all three summary pages are written and then fed back
  into later turn assembly;
- widening trace tests so runtime inspection reflects the richer success
  payload;
- re-running targeted `types`, `runner`, `host-client`, `studio`, and `host`
  tests;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a bounded model-guided memory layer that writes a small
focused register set instead of one monolithic derived summary page.

The next best move remains deeper memory maintenance quality, not casual
builtin-tool widening.
