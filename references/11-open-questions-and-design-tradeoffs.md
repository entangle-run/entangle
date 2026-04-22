# Open Questions and Design Tradeoffs

This file exists to keep the architecture honest. Not every unresolved area should be implemented immediately, but the main tradeoffs should remain visible.

## 1. Package binding versus package purity

How much graph-local state should be injected into a package workspace versus kept fully external?

Current recommendation:

- keep package portable and mostly graph-agnostic;
- inject graph-local runtime projections;
- never make graph edges live only inside package-local declarations.

## 2. Engine reuse boundary

How far should Entangle reuse OpenCode-like internals versus building a bespoke runner-driven engine contract?

Current recommendation:

- reuse where it accelerates real agentic behavior;
- keep the runner boundary independent.

## 3. Artifact backend generality

How early should multiple artifact backends be implemented?

Current recommendation:

- model the abstraction now;
- implement git first.

## 4. Remote node trust model

How should remote node attachment decide whether a remote actor is acceptable?

Current recommendation:

- local policy first;
- no global web-of-trust requirement in the first serious version.

## 5. Graph mutation authority

Should agents ever be able to mutate topology directly?

Current recommendation:

- not in the hackathon build;
- later only through strongly bounded governance policies.

## 6. Relay policy complexity

How much transport complexity should the first runner support?

Current recommendation:

- canonical edge-level transport policy type now;
- one restricted runtime profile in the hackathon implementation.
