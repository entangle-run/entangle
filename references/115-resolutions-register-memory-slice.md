# Resolutions Register Memory Slice

## Summary

This slice closes the next lifecycle gap in the bounded memory layer.

The focused model-guided synthesis path already preserved:

- `working-context.md`
- `decisions.md`
- `stable-facts.md`
- `open-questions.md`
- `next-actions.md`

But recent closures still disappeared only implicitly:

- when open questions were rewritten away; or
- when next actions stopped being listed after completion.

That was the wrong boundary. Closed questions and completed actions are not
just "absence of pending work"; they are durable closure signals that future
turns should sometimes preserve explicitly.

This slice adds a focused `resolutions.md` register while keeping the write
path runner-owned and bounded.

## What changed

### 1. The focused summary-register set now includes `resolutions.md`

The same single strict `write_memory_summary` tool call now updates:

- `memory/wiki/summaries/working-context.md`
- `memory/wiki/summaries/decisions.md`
- `memory/wiki/summaries/stable-facts.md`
- `memory/wiki/summaries/open-questions.md`
- `memory/wiki/summaries/next-actions.md`
- `memory/wiki/summaries/resolutions.md`

The model still only returns bounded structured content. The runner still owns
the actual filesystem writes and fixed target paths.

### 2. Working context now carries explicit recent closure signals

`working-context.md` now includes a bounded `Recent Resolutions` section.

That keeps immediate closure context visible in the omnibus summary without
replacing the dedicated durable register that owns the same focused surface.

### 3. Future turns now consume the resolutions register directly

`collectMemoryRefs()` now includes `summaries/resolutions.md`, so later turns
can reason over durable resolved questions and completed actions directly
instead of inferring closure only from broader rewritten prose.

### 4. Observability remains aligned with the real updated-page set

Successful `memorySynthesisOutcome.updatedSummaryPagePaths` now includes the
new resolutions register, so host events plus shared CLI/Studio runtime-trace
helpers continue to reflect the real durable write set.

## Why this matters

Durable memory should preserve not only what remains true or pending, but also
what was explicitly closed:

- which uncertainties are no longer active;
- which actions are done;
- which temporary concerns should not be silently reopened.

Without a focused resolutions register, the memory layer still relied on
implicit disappearance as the only closure signal. That is weaker than a
bounded explicit closure record.

## Explicit non-goals

This slice does **not**:

- add a new builtin tool kind;
- allow arbitrary file creation;
- make memory synthesis mandatory for successful turns;
- widen provider-specific engine behavior;
- replace deterministic task-page or recent-work baselines.

## Validation and quality gates

This slice was only closed after:

- widening runner-owned memory-maintenance helpers and synthesis write paths;
- proving the new register is written, indexed, and re-consumed via later
  `memoryRefs`;
- proving recent resolutions appear in the durable working-context page;
- widening shared host/CLI/Studio/runtime-trace fixtures so observability
  matches the real updated-page set;
- re-running targeted package tests;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a bounded durable resolutions register inside the
model-guided memory layer.

The next best move remains deeper memory quality and maintenance discipline,
not casual widening of builtin tools or UI surfaces.
