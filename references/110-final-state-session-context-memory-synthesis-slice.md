# Final-State Session-Context Memory Synthesis Slice

## Summary

This slice fixes a real architectural weakness in the model-guided memory path:
working-context synthesis was session-aware at prompt time, but it still ran
before the runner had finished applying the final conversation and session
lifecycle transitions for the completed turn.

That meant synthesis could reason over a bounded current-session snapshot, yet
still see pre-completion state such as `working` / `active` where the durable
post-turn state was already about to become `closed` / `completed`.

This slice corrects that ordering and also makes the durable
`working-context.md` page preserve bounded session-context insights explicitly.

## What changed

### 1. Optional memory synthesis now runs against final post-turn lifecycle state

`RunnerService` now performs optional model-guided memory synthesis only after:

- deterministic post-turn memory maintenance has completed;
- conversation state has reached its final post-turn status for the path taken;
- session state has reached its final post-turn status for the path taken;
- response publication, when required, has already succeeded.

This is the correct boundary. The synthesis step is additive memory enrichment,
not part of the turn's validity or publication path.

### 2. Session snapshot construction is now evaluated once per synthesis run

The synthesizer now resolves the bounded current-session snapshot once for the
synthesis run and reuses that same snapshot for:

- prompt-time grounding; and
- runner-owned page rendering.

This keeps the bounded session view consistent inside a single synthesis pass
and avoids hidden drift between request assembly and durable page output.

### 3. `working-context.md` now carries a dedicated session-context section

The strict summary tool contract now requires:

- `sessionInsights`

The runner-owned durable page now also includes:

- deterministic bounded session-context lines; and
- a `Durable Session Insights` subsection.

This gives session/coordination state the same durable status already granted
to artifact context and execution signals.

## Why this matters

The important correction here is not cosmetic.

It is that durable memory synthesis must see and preserve the **final** local
state of the completed turn, not a state snapshot that is about to be
immediately superseded by the runner's own lifecycle transitions.

Without that correction:

- session-aware synthesis remained subtly stale;
- durable memory could lag behind the real runner lifecycle;
- future turns inherited weaker coordination context than the runtime already
  knew.

## Explicit non-goals

This slice does **not**:

- add new builtin tools;
- widen host or Studio surfaces;
- replace deterministic task-page or recent-work ownership;
- change the bounded current-session snapshot contract itself;
- introduce a second synthesis pass.

## Validation and quality gates

This slice was only closed after:

- refactoring runner ordering so synthesis occurs after final post-turn
  lifecycle application;
- widening synthesis tests to verify durable session-context carry-forward;
- widening service tests to prove synthesis now sees `closed` / `completed`
  post-turn state instead of earlier lifecycle state;
- re-running targeted runner test, lint, and typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remains clean.

## Resulting state

The model-guided working-context path is now stronger in two ways:

- it is grounded in the final local session/conversation state of the completed
  turn; and
- it preserves bounded session-context signals durably instead of leaving
  session awareness trapped in prompt-time context alone.

The next best move is to continue deepening broader model-guided memory
maintenance on top of this now stronger final-state baseline, not to widen
builtin tools casually.
