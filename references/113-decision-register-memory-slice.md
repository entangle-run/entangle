# Decision Register Memory Slice

## Summary

This slice closes a specific gap between the runner specification and the
implemented model-guided memory layer.

The lifecycle spec already required the runner to record decisions during
memory consolidation. The bounded model-guided synthesis path, however, still
had no dedicated durable decision register.

This slice adds that missing register without widening model authority.

## What changed

### 1. The synthesis payload now includes bounded durable decisions

The strict `write_memory_summary` synthesis tool now requires a `decisions`
field:

- array of non-empty strings;
- bounded to the same list limits as the other durable summary fields;
- validated before any wiki write occurs.

### 2. The runner now writes a dedicated decisions register

The same single model-guided synthesis pass now updates:

- `memory/wiki/summaries/working-context.md`
- `memory/wiki/summaries/decisions.md`
- `memory/wiki/summaries/stable-facts.md`
- `memory/wiki/summaries/open-questions.md`

The runner still owns all write paths. The model still only supplies bounded
structured content.

### 3. Working context now also preserves decision carry-forward

`working-context.md` now includes a bounded `Decisions` section, while
`decisions.md` acts as the focused durable register for that same decision
surface.

### 4. Future turns now consume the decision register directly

`collectMemoryRefs()` now includes `summaries/decisions.md`, so later turns can
reason over durable prior decisions without depending only on the omnibus
working-context page.

## Why this matters

Without a decision register, the bounded memory layer was still missing one of
the highest-signal durable outputs for an agent organization:

- what was concluded;
- what was chosen;
- what should remain true unless later evidence changes it.

This slice improves memory quality without:

- widening builtin tools;
- allowing arbitrary file creation;
- or moving memory ownership away from the runner.

## Explicit non-goals

This slice does **not**:

- add free-form model-authored wiki mutation;
- introduce a new builtin tool kind;
- make memory synthesis mandatory for successful turns;
- widen provider-specific engine contracts.

## Validation and quality gates

This slice was only closed after:

- widening the synthesis input contract and normalization logic;
- proving the new decision register is written, indexed, and re-consumed via
  later `memoryRefs`;
- widening shared trace/event fixtures so observability matches the new
  summary-register count;
- re-running targeted package tests;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remained clean.

## Resulting state

Entangle now has a bounded durable decision register inside the model-guided
memory layer.

The next best move is still deeper memory quality and maintenance discipline,
not casual widening of tools or UI surfaces.
