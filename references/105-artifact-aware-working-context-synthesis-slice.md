# Artifact-Aware Working-Context Synthesis Slice

## Summary

This slice deepens the existing model-guided working-context synthesis path by
making it artifact-aware without widening runner permissions.

The important boundary choice is this:

- the synthesizer does **not** rescan the filesystem to rediscover artifacts;
- the runner passes explicit bounded `artifactRefs` and `artifactInputs`
  gathered during the completed turn;
- the engine can therefore see the real work products of the turn through the
  same canonical contracts already used by main task execution.

## What changed

### 1. Memory synthesis now accepts explicit artifact context

`RunnerMemorySynthesisInput` now carries:

- `artifactRefs`
- `artifactInputs`

This keeps the synthesizer aligned with the existing engine request contract
instead of forcing it to reconstruct artifact state from ids alone.

### 2. Produced artifacts are converted into canonical engine inputs

The runner already had two bounded artifact surfaces at the end of a turn:

- retrieved inbound artifact inputs from the retrieval path;
- newly materialized local artifact records from the artifact backend.

This slice adds a small internal helper that converts materialized artifact
records with local paths into canonical `EngineArtifactInput` values.

That means memory synthesis can now see:

- retrieved inbound work products;
- newly produced local work products from the current turn.

### 3. Service wiring is now explicit

`RunnerService` now passes memory synthesis:

- inbound `artifactRefs` from the message;
- produced artifact refs from the current materialization pass;
- retrieved inbound artifact inputs;
- produced local artifact inputs derived from materialized records.

This is the right ownership boundary:

- artifact backend owns retrieval/materialization;
- runner owns turn orchestration and explicit handoff to memory synthesis;
- synthesizer consumes explicit turn-local context only.

## Why this matters

Before this slice, working-context synthesis could see:

- task-page memory;
- recent-work summary;
- wiki memory refs;
- bounded current-session snapshot;
- assistant output from the just-completed turn.

But it still could not directly see the concrete artifacts that the turn had
consumed or produced, even though the runtime already had those surfaces in
canonical form.

Now the synthesis pass is grounded in:

- live session state;
- durable memory state;
- artifact-backed work products from the current turn.

That is a materially stronger basis for durable memory maintenance.

## Explicit non-goals

This slice does **not**:

- add new builtin tools;
- widen filesystem access for synthesis;
- make memory synthesis responsible for artifact discovery;
- introduce cross-turn artifact search;
- widen git retrieval or publication behavior.

## Validation and quality gates

This slice was only closed after:

- extending the runner-memory synthesis boundary cleanly;
- adding runner tests that prove artifact refs and artifact inputs now reach the
  synthesis request;
- adding a service-level test that proves retrieved and produced artifacts are
  both handed into optional memory synthesis;
- re-running targeted runner test, lint, and typecheck loops;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` remains clean.

## Resulting state

The working-context synthesis path is now both session-aware and artifact-aware
while remaining bounded and structurally clean.

The next best move is to keep deepening model-guided memory maintenance on top
of this stronger base, not to widen the builtin catalog casually.
