# Production Redesign Program

## Status

Accepted as the active strategic program for the next major Entangle phase.

## Decision

Entangle will be advanced as a production-grade graph-native control plane for
governed AI organizations. The imported LatticeOps redesign corpus under
`wiki/redesign/latticeops/` is the strategic reference for product, UX,
architecture, quality, security, DevOps, and business direction.

Entangle keeps its core conceptual identity:

- graph-native topology;
- user as a first-class node;
- agent packages separated from node instances;
- edges as authority and coordination boundaries;
- messages as coordination;
- artifacts as the primary work substrate;
- host control plane separated from runner execution;
- CLI and Studio over the same host-facing boundary.

The program explicitly allows breaking changes when they improve production
clarity, safety, scalability, or maintainability. Breaking changes must be
introduced through coherent slices with contract updates, validators, tests,
canonical documentation, and migration notes where applicable.

## Rationale

The current repository already has a serious local runtime baseline, but its
remaining gaps are production gaps rather than conceptual gaps. The strongest
path is not to discard Entangle's architecture. The strongest path is to harden
the operating model around durable state, identity, authorization, policy,
artifact governance, execution isolation, observability, and end-to-end session
workflows.

The imported redesign corpus gives the project a complete target shape without
forcing every target decision into the immediate implementation slice.

## Immediate Execution Order

1. Preserve and verify the current baseline.
2. Keep the imported redesign corpus linked from the wiki index.
3. Audit current implementation state against the redesign program.
4. Define the first production hardening slice around control-plane state,
   session lifecycle, and artifact governance.
5. Implement each slice with tests and documentation in the same batch.
6. Reconsider the program after each major slice and record better decisions
   when repository evidence contradicts the initial plan.

## Non-Goals

- Do not collapse Entangle into a single orchestrator-centric agent runner.
- Do not make Studio-only changes that are not backed by host and CLI surfaces.
- Do not treat Nostr as the only possible production transport if an internal
  event bus or RPC boundary better serves production operation.
- Do not treat Git as the only possible artifact backend, even though it
  remains the first implemented backend and a core reference point.
- Do not introduce enterprise abstractions before their contracts are clear
  enough to validate and test.

## Consequences

- Future work may rename or reshape public contracts, but only with explicit
  migration notes and validator updates.
- Documentation must distinguish the current Entangle baseline from the
  imported LatticeOps target architecture.
- The repository remains implementation-first: redesign decisions should become
  contracts, tests, services, and operator surfaces rather than long-lived
  speculative notes.
- The first production milestone should still be narrow: a user launches a
  governed session, a runner performs real work, an artifact is produced, and
  host, CLI, and Studio can inspect the state, trace, and output.
