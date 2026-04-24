# Recent-Work Memory Summary Slice

This document records the slice that deepens runner-owned memory maintenance
without introducing a second model pass or free-form wiki mutation.

## Why this slice was necessary

After the first deterministic memory-maintenance slice, the runner already:

- wrote task-specific wiki pages for completed turns;
- appended structured entries to `memory/wiki/log.md`;
- kept `memory/wiki/index.md` aligned; and
- fed recent task pages back into future turn assembly.

That baseline was correct, but still too low-level.

Future turns could see raw task pages, yet there was no stable summary layer
that reconstructed the freshest work into one compact bounded page. Jumping
straight from that baseline to model-authored wiki synthesis would have created
too much semantic distance in one step.

## What this slice freezes

### 1. Runner memory maintenance now includes a deterministic recent-work summary

The runner now rebuilds:

- `memory/wiki/summaries/recent-work.md`

after each completed turn.

This page is derived from the freshest task pages and becomes a stable
high-signal entry point into recent node work.

### 2. The summary is reconstructed from canonical task pages

The summary page is not appended through hidden mutable state. It is rebuilt
from the existing task pages, ordered by freshness, and bounded to the newest
few entries.

This preserves the right source-of-truth relationship:

- task pages remain canonical granular memory;
- the recent-work summary is a derived projection;
- the runner, not the model, owns the reconstruction logic.

### 3. The wiki index now exposes the summary as a first-class page

`memory/wiki/index.md` now keeps a `Summaries` section aligned with the derived
recent-work page, just as `Task Pages` remains aligned with task-specific
memory pages.

### 4. Future turn assembly now sees the summary page too

`buildAgentEngineTurnRequest()` now includes the derived recent-work summary in
the bounded `memoryRefs` set when it exists, so later turns get:

- the schema rules;
- the wiki index;
- the wiki log;
- the recent-work summary; and
- the freshest task pages.

This is a meaningfully better memory baseline for future runtime deepening.

## Intentional non-goals

This slice does **not** yet:

- let the model rewrite arbitrary wiki pages;
- add a second model call dedicated to memory synthesis;
- perform contradiction detection or semantic merging across pages;
- expose summary-specific host or Studio surfaces.

Those remain later steps.

## Architectural conclusion

This is the correct intermediate move before richer model-guided synthesis:

- memory stays runner-owned and auditable;
- derived pages are rebuilt from canonical state, not from hidden append-only
  heuristics;
- future turns get a better summarized memory context;
- the next model-guided memory slice can build on a stronger deterministic
  foundation instead of replacing a weak one.
