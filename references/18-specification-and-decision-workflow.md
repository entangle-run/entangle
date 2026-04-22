# Specification and Decision Workflow

This document defines how Entangle should be driven from the current architecture-heavy phase into implementation without degrading the quality of the system design.

It exists because the project goal is not merely to ship a hackathon demo. The goal is to establish foundations that remain valid when the project later becomes a real product built by a team.

## Core principle

The repository should move through three explicit layers of rigor:

1. specification deepening;
2. architecture and infrastructure decision-making;
3. implementation planning and execution.

These layers should not be collapsed into one improvisational loop.

## Primary objective

The objective is:

> maximize architectural quality before implementation hardens the wrong abstractions.

That means the project should optimize for:

- stable types;
- stable boundaries;
- explicit decision rationale;
- constrained hackathon scope without architectural compromise;
- implementation paths that can scale into a team-built product.

## Phase 1: specification deepening

This phase exists to make the core contracts precise enough that implementation becomes a translation step instead of a guessing step.

### Questions this phase should answer

- What are the canonical project types?
- What is optional versus mandatory in each type?
- Which invariants must hold across package, node, edge, graph, runner, and protocol?
- Which fields are hackathon-restricted but architecturally permanent?
- Which semantics live in types versus policy versus runtime interpretation?

### Expected outputs

- sharper schema documents;
- invariant lists;
- allowed and forbidden state transitions;
- normalization rules;
- validation rules;
- examples and counterexamples.

### Commands that maximize yield in this phase

Interactive session:

- `/model`
  Use the strongest available model and the highest useful reasoning level.
- `/fast`
  Keep it off for this phase.
- `/plan`
  Use it at the start of each substantial specification batch.
- `/fork`
  Use it when evaluating competing contract shapes.
- `/side`
  Use it for ephemeral deep dives that should not pollute the main thread.
- `/review`
  Use it after each specification batch.
- `/compact`
  Use it periodically in long sessions.
- `/status`
  Use it to monitor context pressure before the thread becomes degraded.

Shell-side Codex:

- `codex exec`
  Use it for structured one-shot audits, comparison matrices, and schema-shaping prompts.
- `codex review --uncommitted`
  Use it as an external review pass on the current specification corpus.

### Example Codex prompts for this phase

- "Audit the current canonical types and list missing invariants."
- "Compare three candidate TransportPolicy designs and recommend one with tradeoffs."
- "Find places where hackathon restrictions accidentally leaked into the final product model."
- "Rewrite the Session and ArtifactRef contracts so they are more implementation-ready."

## Phase 2: architecture and infrastructure decision-making

This phase begins only after the core contracts are good enough that boundaries can be chosen deliberately.

### Questions this phase should answer

- What are the executable units?
- What belongs in Studio, runner, validator, and shared packages?
- Which services are infrastructure versus product code?
- Which technologies are foundation versus replaceable implementation details?
- Which external protocols should inform the design but remain outside the core?

### Expected outputs

- package boundaries;
- monorepo structure;
- runtime topology;
- container topology;
- service responsibility map;
- technology choices with explicit rationale;
- rejected alternatives.

### Commands that maximize yield in this phase

Interactive session:

- `/plan`
  Use at the start of each decision batch.
- `/fork`
  Use for competing architecture branches.
- `/side`
  Use for scoped explorations such as "all-TS runner" versus "polyglot runner."
- `/review`
  Use after each batch that changes stack or system boundaries.
- `/diff`
  Use to inspect exactly what changed in decision documents.

Shell-side Codex:

- `codex exec --json`
  Use for decision matrices and scored tradeoff tables.
- `codex review --uncommitted`
  Use to detect contradictions between stack, runtime, and implementation strategy documents.

### Example Codex prompts for this phase

- "Compare monorepo structures for Entangle and recommend the most future-proof layout."
- "Audit whether the current Docker and service boundaries match the canonical type system."
- "Evaluate if MCP should influence internal architecture or only boundary integration."
- "Find architecture decisions that are still underspecified for a real team implementation."

## Phase 3: implementation planning

This phase converts architecture into a build order that is disciplined and technically defensible.

### Questions this phase should answer

- What gets built first?
- What depends on what?
- Which pieces can be deferred without corrupting the architecture?
- What should be implemented as code versus config versus generated schema?
- What is the minimum serious vertical slice?

### Expected outputs

- package creation order;
- milestone order;
- dependency graph;
- definition of done per milestone;
- review gates;
- test strategy.

### Commands that maximize yield in this phase

Interactive session:

- `/plan`
  Use to create and revise milestone structure.
- `/review`
  Use after each implementation-plan revision.
- `/compact`
  Use when a planning thread becomes too large.

Shell-side Codex:

- `codex exec`
  Use to generate milestone docs, checklists, and structured implementation sequences.
- `codex review --uncommitted`
  Use before committing planning baselines.

### Example Codex prompts for this phase

- "Turn the current specification corpus into a dependency-aware implementation plan."
- "Identify the minimal serious vertical slice for hackathon delivery without architectural compromise."
- "Find where the current implementation order risks forcing later rewrites."

## High-rigor operating profile

For work that is supposed to maximize architecture quality rather than speed:

- use the strongest model available;
- use high or maximum reasoning effort;
- do not use fast mode;
- prefer forked comparison threads over premature convergence;
- review after each major document batch;
- compact before context quality degrades;
- record decisions immediately into the repository.

## Low-rigor profile to avoid

Avoid this anti-pattern:

- writing partial docs and calling them specs;
- choosing frameworks before boundaries are explicit;
- encoding hackathon shortcuts into canonical types;
- implementing before transport, runner, and artifact contracts are stable;
- relying on chat memory instead of repository memory.

## Practical recommendation for Entangle right now

Right now the repository should focus on:

1. deepening the specifications of the core contracts;
2. deepening the decision documents around architecture and infrastructure;
3. only then locking the implementation plan.

The immediate practical loop should be:

1. specification batch;
2. review batch;
3. decision batch;
4. review batch;
5. implementation-plan batch;
6. review batch;
7. only then scaffold code.

## Final rule

Entangle should be developed as if the early documents are architecture source code.

That means:

- every major decision should be explicit;
- every important tradeoff should be inspectable;
- every implementation milestone should be justified by stable contracts;
- every hackathon shortcut should be visibly constrained to scope, never hidden inside the architecture.
