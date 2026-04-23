# Deterministic Post-Turn Memory Update Slice

This document records the slice that closes the first real memory-update phase
in the runner lifecycle.

## Why this slice was necessary

The repository had already reached the point where:

- the runner maintained durable session, conversation, turn, and artifact
  state;
- the package memory schema and wiki layout were part of the package contract;
- the engine request already accepted `memoryRefs`.

But the runner still did not perform a real post-turn memory update.

That meant the wiki remained mostly seed content even after completed work, and
future turn assembly could not benefit from the node’s own recent execution
history.

## What this slice freezes

### 1. Post-turn memory maintenance is now a real runner phase

The runner now performs deterministic wiki maintenance after a completed turn.

That maintenance currently includes:

- writing a task-specific wiki page for the completed turn;
- appending a structured entry to `memory/wiki/log.md`;
- keeping `memory/wiki/index.md` aligned with the new task page.

### 2. The first memory-update slice is deterministic, not model-authored

This slice deliberately does **not** try to make the model write arbitrary wiki
content directly.

The first implementation choice is:

- runner-owned structure;
- deterministic templates;
- predictable file layout;
- no hidden prompt-side memory mutation.

This is the correct starting point because it keeps the lifecycle explicit and
auditable while creating a clean baseline for later model-guided synthesis.

### 3. Updated wiki state now feeds back into future turn assembly

The runner’s memory-ref collection now includes:

- the package memory schema;
- `memory/wiki/index.md`;
- `memory/wiki/log.md`;
- the freshest recent task pages.

So the memory-maintenance phase is no longer a dead-end side effect. It is now
part of the live execution loop.

## Intentional non-goals

This slice does **not** yet:

- create wiki-backed artifact refs for every memory page;
- let the model rewrite arbitrary wiki structure autonomously;
- implement semantic page merging or contradiction resolution;
- add host or Studio surfaces for wiki-diff inspection;
- replace later richer memory-maintenance work.

## Architectural conclusion

The runner now has a real, explicit post-turn memory phase without violating
the project’s design rules:

- memory remains distinct from messages and artifacts;
- the runner owns lifecycle discipline;
- the first implementation is deterministic and auditable;
- future richer memory synthesis can widen on top of a clean baseline rather
  than replacing an absent phase.
