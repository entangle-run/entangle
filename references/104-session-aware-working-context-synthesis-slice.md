# Session-Aware Working-Context Synthesis Slice

## Summary

This slice deepens model-guided memory synthesis without widening the builtin
tool catalog further.

The key change is architectural, not cosmetic:

- runner-local current-session inspection is now implemented once as a shared
  bounded snapshot builder;
- the builtin tool `inspect_session_state` reuses that shared snapshot;
- the model-guided working-context synthesis path now also consumes the same
  bounded snapshot as input context.

That means the memory-synthesis path now reasons over the node's current
session progress using the same canonical bounded session view already exposed
through the builtin runtime tool surface.

## What changed

### 1. Session snapshot construction is now shared

The runner previously assembled the `inspect_session_state` response inline in
the builtin tool executor.

That was acceptable for the first delivery slice, but it was not a good long
term boundary because the next model-guided memory step would have needed the
same information and would otherwise have duplicated logic.

This slice introduces a shared runner-local session snapshot module that:

- reads persisted session, conversation, turn, and artifact state;
- applies deterministic sorting and bounded truncation;
- returns a stable summarized object for the current session;
- renders a bounded prompt-oriented textual projection for model input.

### 2. `inspect_session_state` now delegates to the shared snapshot

The builtin tool still behaves the same at the contract boundary:

- current-session only;
- bounded numeric limits;
- no arbitrary filesystem or cross-session widening.

But its implementation now delegates to the shared snapshot builder instead of
reconstructing the response inline.

### 3. Working-context synthesis now includes current session state

The model-guided `working-context.md` synthesis path now includes a bounded
session snapshot in the interaction prompt when local session state exists.

The snapshot includes:

- current session status and intent;
- bounded conversation summary;
- bounded recent-turn summary;
- bounded related-artifact summary.

This gives the synthesis step a stronger view of the node's actual current
progress without changing the durable wiki write contract or widening the tool
loop itself.

## Why this matters

Before this change, working-context synthesis could see:

- the current task page;
- the recent-work summary;
- memory refs assembled from the wiki;
- assistant output from the just-completed turn.

But it still lacked a first-class view of the *current live session state*
unless that state happened to be indirectly reflected elsewhere.

That meant the synthesis step had weaker awareness of:

- conversation status;
- recent turn progression;
- related artifact lifecycle state.

Now the synthesis pass is grounded in the same bounded runner-local session
view that the runtime already exposes through `inspect_session_state`.

## Explicit non-goals

This slice does **not**:

- add more builtin tools;
- expose cross-session inspection to synthesis;
- allow synthesis to mutate session state;
- widen the forced-tool write path for `working-context.md`;
- introduce a second model pass.

## Validation and quality gates

The slice was only closed after:

- refactoring the runner to use a shared session snapshot helper;
- widening memory-synthesis tests to seed real local session state and verify
  that the bounded session snapshot reaches the synthesis prompt;
- re-running targeted runner lint and tests;
- re-running the full `pnpm verify` gate;
- confirming `git diff --check` is clean.

## Resulting state

The working-context synthesis path is now session-aware while remaining bounded
and structurally clean.

The next best move is to deepen model-guided memory maintenance further on top
of this session-aware baseline, not to add more builtin tool kinds casually.
