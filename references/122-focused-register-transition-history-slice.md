# Focused Register Transition History Slice

## Summary

This slice closes the next focused-memory quality gap after carry counts,
stale-review hints, explicit closure references, stale-item no-silent-drop,
explicit stale-item replacement, and explicit stale-item consolidation.

The previous state already prevented stale active items from disappearing
silently and forced retirements, replacements, and consolidations to be
runner-validated before any wiki write.

One operational weakness remained:

- the runner enforced the lifecycle decision, but it did not persist a compact
  machine-readable trace of what lifecycle transition happened.

That made later auditing weaker than the validation path itself. The wiki pages
stayed clean, but the runtime state did not yet preserve a bounded trace of
closure, completion, replacement, consolidation, and exact resolution-overlap
retirement decisions.

## What changed

### 1. Focused-register state now has a bounded transition history

The runtime-local focused-register state now includes `transitionHistory`.

Each transition records:

- `kind`;
- `register`;
- `sourceTexts`;
- `targetTexts`;
- `resolutionTexts`;
- `turnId`;
- `observedAt`.

The supported transition kinds are:

- `closed`;
- `completed`;
- `replaced`;
- `consolidated`;
- `resolved_overlap`.

The supported lifecycle registers are:

- `openQuestions`;
- `nextActions`.

The history is intentionally bounded to the most recent 60 transitions.

### 2. The runner owns transition generation

The model does not author transition-history state directly.

Instead, the runner derives transition entries after the strict
`write_memory_summary` input has already passed validation and normalization.
That keeps the trace aligned with the authoritative lifecycle rules rather
than trusting a separate model-written audit field.

The runner records:

- `closed` transitions from `closedOpenQuestions`;
- `completed` transitions from `completedNextActions`;
- `replaced` transitions from explicit stale-item replacement refs;
- `consolidated` transitions from explicit stale-item consolidation refs;
- `resolved_overlap` transitions when a baseline active item is retired by
  exact normalized overlap with `resolutions.md`.

### 3. The wiki stays human-readable

Transition history remains in runtime-local state under
`memory-state/focused-register-state.json`.

It is not injected into:

- `open-questions.md`;
- `next-actions.md`;
- `resolutions.md`;
- `working-context.md`;
- host events;
- Studio panels;
- CLI output.

That separation is deliberate. The focused wiki pages remain concise human
memory, while runtime state carries the more technical lifecycle audit trail.

## Why this matters

This slice upgrades focused memory from:

- “the runner validates lifecycle changes”

to:

- “the runner validates lifecycle changes and preserves a bounded structured
  audit trail of those changes.”

That matters because long-running agent memory needs traceability without
turning every human-facing wiki page into a noisy bookkeeping artifact.

## Explicit non-goals

This slice does **not**:

- add fuzzy semantic matching;
- widen host, CLI, or Studio contracts;
- require the model to write transition-history payloads;
- turn wiki pages into lifecycle logs;
- change the external graph, transport, or artifact contracts;
- replace the existing carry-count, stale-review, explicit-closure,
  no-silent-drop, replacement, or consolidation rules.

## Validation and quality gates

This slice was only closed after:

- widening the focused-register state schema with additive defaults for old
  state-file compatibility;
- proving old focused-register state without `transitionHistory` still parses;
- proving explicit transition-history payloads parse through the public type
  contract;
- proving closed and completed baseline items create transition entries;
- proving stale-item replacement creates a transition entry;
- proving stale-item consolidation creates a transition entry;
- re-running targeted types tests;
- re-running targeted runner lint, typecheck, and test loops.

## Resulting state

Entangle now has a focused-memory lifecycle model with:

- exact baseline continuity;
- carry counts and stale-review hints;
- explicit closure references;
- no-silent-drop discipline for stale items;
- explicit stale-item replacement;
- explicit stale-item consolidation; and
- bounded runner-owned transition history.

The next best move remains stronger long-horizon memory quality on top of this
baseline, not random register widening or premature UI surfacing of internal
lifecycle trace data.
