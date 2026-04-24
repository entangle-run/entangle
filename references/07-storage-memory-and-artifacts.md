# Storage, Memory, and Artifacts

## Core distinction

Messages coordinate.
Artifacts carry work.
Memory accumulates understanding.

These three functions should not be collapsed into one substrate.

## Artifact backends

Entangle should support artifact backends as a first-class abstraction.

Canonical possibilities:

- `git`
- `local_files`
- `wiki`
- future object stores
- future issue trackers or structured stores

## Why git matters now

For the hackathon and for the initial coding-agent use case, git should be the primary work substrate because it gives:

- shared state;
- version history;
- branches;
- diffs;
- asynchronous collaboration;
- a natural way to reference work between nodes.

Messages should frequently point to:

- repository;
- branch;
- commit;
- patch location;
- pull request or merge request later.

## Why git is not enough as a general abstraction

Some work products do not belong naturally in git:

- transient coordination notes;
- large binary artifacts;
- local-only working state;
- projected knowledge memory.

So the product should support git strongly without treating git as the only universal substrate.

## Wiki memory

Each node should maintain a durable local wiki, inspired by the LLM Wiki pattern.

That gives each node:

- a persistent knowledge base;
- an evolving summary of what it knows;
- a place to record stable local interpretations of the world;
- history of work and references;
- a compact surface for future prompting.

## Memory update cycle

After each substantial interaction, the runner should perform a memory update phase:

1. append interaction log;
2. update relevant wiki pages;
3. create new pages when needed;
4. add links and references;
5. record unresolved questions or pending work.

This should be a systematic phase of the runner lifecycle, not an occasional manual cleanup.

The first implementation should begin with deterministic runner-maintained
memory hygiene:

- append a structured turn log entry;
- write a task-specific wiki page for the completed turn;
- keep `index.md` and `log.md` aligned with the new page;
- rebuild a derived recent-work summary page from canonical task pages;
- feed the freshest task pages back into future prompt assembly.

The first widening beyond that baseline should remain bounded and
runner-owned:

- model guidance may propose structured summary updates;
- the runner should still own which page is updated;
- the runner should still own the exact filesystem write path;
- the widened phase should never replace the deterministic task-page and
  recent-work baseline.

The current implementation now includes that first widening through a bounded
focused summary-register set generated via model-guided synthesis but written
through a runner-owned structured path. That durable set now includes:

- `working-context.md`
- `decisions.md`
- `stable-facts.md`
- `open-questions.md`
- `next-actions.md`
- `resolutions.md`

Those focused pages are grounded in final post-turn lifecycle state and carry
bounded session, artifact, execution, decision, and planning context durably.
They are now also continuity-aware at synthesis time through an explicit
focused-register baseline, with runner-owned exact closure reconciliation that
removes entries from active open-question and next-action registers when the
same normalized item is explicitly carried in `resolutions.md`.
The runner now also persists a separate focused-register aging state under
runtime-local state, tracking carry counts for the focused registers and
feeding stale-review hints back into synthesis for repeatedly carried active
items without adding noisy metadata to the wiki pages themselves.
The focused memory layer now also supports explicit runner-validated closure
references for active open questions and next actions, so a turn can retire a
baseline item deterministically even when the new resolution wording differs
from the original active register text.
On top of that, stale active baseline items may no longer disappear silently:
the runner now rejects focused-register synthesis that drops a stale review
candidate without either keeping it active, retiring it explicitly, or
carrying the same exact text into `resolutions.md`.
The focused memory layer also now supports explicit runner-validated
replacement refs for stale active open questions and next actions, so a turn
can retire a stale baseline item by mapping it to exact resulting active items
instead of forcing that stale item to remain active or be recorded as closed.
On top of that, the focused memory layer now supports explicit
runner-validated consolidation refs for stale active open questions and next
actions, so multiple overlapping stale items can collapse into one narrower
active successor instead of surviving as parallel active noise.
The runner also now persists a bounded runtime-local focused-register
transition history for closure, completion, replacement, consolidation, and
exact resolution-overlap retirements. That trace stays in
`memory-state/focused-register-state.json`, preserving auditability without
polluting the human-facing wiki pages with lifecycle bookkeeping.

The backend contract for `git`, `wiki`, and `local_file` artifacts is specified in [24-artifact-backend-specification.md](24-artifact-backend-specification.md).
