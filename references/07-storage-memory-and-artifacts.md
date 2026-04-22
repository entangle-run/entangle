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
