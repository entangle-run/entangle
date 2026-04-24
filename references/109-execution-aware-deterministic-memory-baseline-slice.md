# Execution-Aware Deterministic Memory Baseline Slice

## Summary

This slice strengthens the deterministic memory baseline by making canonical
task pages and the derived recent-work summary preserve more of the structured
execution outcome already owned by the runner.

Before this change, deterministic memory retained:

- stop reason;
- assistant summary;
- consumed artifact ids;
- produced artifact ids.

That was a sound baseline, but still too lossy once the runtime already had
clean bounded execution details such as provider stop reason, token usage, tool
executions, and bounded failure metadata.

## What changed

### 1. Task pages now preserve deterministic execution detail

Runner-owned task pages now include, when present:

- provider stop reason;
- token usage;
- bounded failure summary;
- deterministic tool-execution lines.

This keeps the granular canonical memory page closer to the real turn outcome
without involving any second model pass.

### 2. Recent-work summary now rebuilds from a stronger canonical baseline

The derived `recent-work.md` page is still rebuilt from canonical task pages,
but it now carries stronger execution detail as well:

- stop reason;
- provider stop reason when present;
- token usage when present;
- bounded failure summary when present;
- tool-execution count.

### 3. The source-of-truth relationship remains correct

This slice does **not** switch recent-work reconstruction to hidden runtime
state. The relationship remains:

- task pages are canonical granular memory;
- recent-work is a derived projection rebuilt from task pages;
- model-guided synthesis remains additive on top of that baseline.

## Why this matters

Broader model-guided memory maintenance should rest on a strong deterministic
foundation, not compensate for a weak one.

By preserving more execution detail deterministically:

- future model-guided passes inherit a better baseline;
- recent-work becomes more useful even when no synthesis runs;
- operator-visible memory stays closer to the real runtime behavior.

## Explicit non-goals

This slice does **not**:

- add a new memory page;
- widen builtin tools;
- expose raw provider payloads;
- replace model-guided working-context synthesis;
- make recent-work depend on anything other than canonical task pages.

## Validation and quality gates

This slice was only closed after:

- widening deterministic task-page rendering cleanly;
- widening recent-work reconstruction without breaking its task-page source of truth;
- extending runner tests over both task pages and derived recent-work output;
- re-running targeted runner test, lint, and typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remains clean.

## Resulting state

Entangle now has a stronger deterministic memory baseline:

- richer task pages;
- richer recent-work summary rebuilt from those task pages;
- model-guided memory refinement still layered above, not substituted for,
  deterministic memory ownership.

The next best move is to keep deepening broader model-guided memory maintenance
on top of this stronger baseline rather than widening builtin tools casually.
