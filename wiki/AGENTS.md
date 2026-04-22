# Entangle Project Wiki Schema

This file defines how the project wiki should be maintained.

The wiki is not a loose note dump. It is the persistent operational memory for Entangle. It should accumulate architecture, decisions, references, contradictions, unresolved questions, and implementation-relevant insights over time.

## Purpose

The wiki exists to solve four problems:

1. keep the design state coherent across long sessions;
2. prevent rediscovery of architectural conclusions;
3. preserve source-aware reasoning and open questions;
4. provide a compact interface between raw references and future implementation work.

## Layers

The project should be maintained using three layers.

### 1. Raw sources

Immutable external references:

- local clones in `resources/`;
- copied notes from protocol specs;
- links to docs, repos, and papers.

These are never edited as part of the wiki maintenance process.

### 2. Wiki pages

Markdown pages inside `wiki/` that synthesize, compare, and structure what matters.

### 3. This schema

This document defines conventions, workflows, and maintenance rules.

## Directory structure

```text
wiki/
  AGENTS.md
  index.md
  log.md
  overview.md
  concepts/
  decisions/
  sources/
  sessions/
```

## Content conventions

### `overview.md`

Project-wide orientation page:

- what Entangle is;
- current status;
- major active themes;
- top unresolved questions.

### `concepts/`

Stable conceptual pages:

- runtime model;
- graph model;
- identity model;
- message model;
- artifact model.

### `decisions/`

Explicit design decisions and their rationale.

Each decision page should document:

- decision statement;
- rationale;
- alternatives rejected;
- consequences;
- status.

### `sources/`

Summaries of important external references:

- repositories;
- NIPs;
- docs pages;
- technical references.

These are not copies of the original sources; they are high-signal project-oriented summaries.

### `sessions/`

Working notes or significant conversation imports that informed the design.

## Core operations

### Ingest

When a new source is introduced:

1. identify whether it belongs in `resources/` and/or `wiki/sources/`;
2. summarize it in project terms;
3. update any affected concept or decision pages;
4. update `index.md`;
5. append an entry to `log.md`.

### Query

When a design question is asked:

1. start from `index.md`;
2. follow links into concept and decision pages;
3. synthesize an answer from the current wiki state;
4. if the answer creates a new durable insight, write it back into the wiki.

### Lint

Periodically check for:

- contradictions;
- stale decisions;
- orphan pages;
- missing links;
- duplicated concepts;
- open questions that need promotion into proper design pages;
- code or tooling quality assumptions that have not yet been encoded into checks.

## Interaction audit loop

Before substantial work in any interaction:

1. reread `README.md`, `resources/README.md`, `wiki/overview.md`, `wiki/index.md`, and `wiki/log.md`;
2. inspect any concept, decision, source, or reference pages directly affected by the current request;
3. search for stale status statements, contradictions, drift introduced by earlier changes, and quality regressions in code or tooling;
4. correct durable inconsistencies before building new work on top of them.

After durable repository changes:

1. update the affected canonical pages;
2. update `wiki/index.md` if new wiki pages were added;
3. append a `wiki/log.md` entry when project state, corpus structure, or design baseline changes in a way future sessions must remember;
4. record the quality gate that now protects the new state when the batch changes engineering process.

Treat the repository as a live system that must stay internally coherent across sessions. Never assume prior documentation is still accurate without a quick audit pass.

## Style rules

- Write in English.
- Prefer dense, high-signal technical prose.
- Avoid vague aspirational language unless a page is explicitly philosophical.
- Every page should either clarify the design, record a decision, or summarize a source.
- Do not duplicate whole sources verbatim.
- Prefer linking concept pages to decisions and sources explicitly.

## Logging format

Each `log.md` entry should begin with:

```md
## [YYYY-MM-DD] <operation> | <title>
```

Examples:

- `## [2026-04-22] ingest | OpenCode repository identified as primary implementation reference`
- `## [2026-04-22] decision | Edge remains canonical source of relation truth`

## Index expectations

`index.md` should stay lightweight and navigable. It should list:

- page title;
- path;
- one-line summary;
- optional status marker.

## Wiki operating principle

The wiki should become more structured over time, not more verbose without structure.

Good wiki growth means:

- clearer boundaries;
- stronger links;
- fewer repeated arguments;
- more explicit decisions;
- more actionable implementation guidance.
