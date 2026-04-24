# Next Actions Register Memory Slice

## Summary

This slice closes a structural gap in the bounded memory layer.

The model-guided synthesis path already preserved:

- `working-context.md`
- `decisions.md`
- `stable-facts.md`
- `open-questions.md`

But pending work still lived only:

- inside the omnibus `working-context.md`; or
- mixed into `open-questions.md` under a suggested-actions section.

That was the wrong boundary. Open questions and pending work are related, but
they are not the same durable memory surface.

This slice adds a focused `next-actions.md` register and keeps the write path
runner-owned.

## What changed

### 1. The focused summary-register set now includes `next-actions.md`

The same single strict `write_memory_summary` tool call now updates:

- `memory/wiki/summaries/working-context.md`
- `memory/wiki/summaries/decisions.md`
- `memory/wiki/summaries/stable-facts.md`
- `memory/wiki/summaries/open-questions.md`
- `memory/wiki/summaries/next-actions.md`

The model still only returns bounded structured content. The runner still owns
the actual filesystem writes and the fixed target paths.

### 2. Open questions and next actions are now focused instead of conflated

`open-questions.md` is now centered on unresolved questions only.

It still links to the pending-work surface, but it no longer duplicates the
actual next-actions list. The dedicated `next-actions.md` page now owns that
focused register.

### 3. Future turns now consume the next-actions register directly

`collectMemoryRefs()` now includes `summaries/next-actions.md`, so later turns
can reason over durable pending work directly instead of inferring it only from
`working-context.md` or a mixed open-questions page.

### 4. Observability remains aligned with the real updated-page set

Successful `memorySynthesisOutcome.updatedSummaryPagePaths` now includes the
new next-actions register, so host events plus shared CLI/Studio runtime-trace
helpers continue to reflect the actual durable write set.

## Why this matters

Pending work is one of the highest-signal durable outputs of a runner turn.

Without a focused next-actions register, the memory layer still blurred two
different questions:

- what remains unclear?
- what should happen next?

Those are not interchangeable. This slice makes the memory model cleaner
without widening model authority.

## Explicit non-goals

This slice does **not**:

- add a new builtin tool kind;
- allow arbitrary file creation;
- make memory synthesis mandatory for successful turns;
- widen provider-specific engine behavior;
- change the deterministic recent-work baseline.

## Validation and quality gates

This slice was only closed after:

- widening runner-owned memory-maintenance helpers and synthesis write paths;
- proving the new register is written, indexed, and re-consumed via later
  `memoryRefs`;
- proving the focused split between open questions and next actions in runner
  tests;
- widening shared host/CLI/Studio/runtime-trace fixtures so observability
  matches the real updated-page set;
- re-running targeted package tests;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a bounded durable next-actions register inside the
model-guided memory layer.

The next best move remains deeper memory quality and maintenance discipline,
not casual widening of builtin tools or UI surfaces.
