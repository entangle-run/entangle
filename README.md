# Entangle

Entangle is a graph-native environment for composing, governing, and running modular AI organizations.

This repository is the project foundation for the Entangle hackathon build and for the larger post-hackathon product. It is intentionally documentation-heavy at this stage. The goal is to establish a stable architectural core before implementation, so the hackathon build is a constrained realization of the final system instead of a throwaway prototype.

## Repository Layout

- `apps/`
  User-facing surfaces. The first scaffold includes `studio/` for the visual
  operator experience and `cli/` for thin headless operation.
- `services/`
  Long-running runtime components. The first scaffold includes `host/` and
  `runner/`.
- `packages/`
  Shared internal packages. The first scaffold includes `types/`, `validator/`,
  `host-client/`, `agent-engine/`, and `package-scaffold/`.
- `deploy/`
  Local deployment material such as the first Compose profile and Dockerfiles.
- `resources/`
  External reference repositories and a manifest of the research corpus. This directory holds local clones of the primary systems, protocols, and engines studied while designing Entangle.
- `references/`
  High-detail product, architecture, protocol, runtime, and roadmap documents. These files are the canonical narrative and technical specification corpus for the project.
- `wiki/`
  A project-specific persistent wiki adapted from the LLM Wiki pattern. This is the operational memory for ongoing design, research ingestion, decision capture, and future implementation tracking.

## Project Thesis

Today's mainstream agentic experience is still structurally narrow. A user speaks to one primary orchestrator, which may internally delegate to subagents. That model is useful, but it hides topology, governance, delegation rules, execution ownership, and collaboration substrate.

Entangle generalizes that model into an explicit graph:

- the user is a first-class node;
- every agent is a first-class node;
- edges define permitted relationships, transport rules, and authority structure;
- messages coordinate work;
- artifacts carry work;
- a session activates a runtime subgraph over a static topology.

The system is not just a chat application with agents behind it. It is a graph-native runtime for AI organizations.

## Hackathon Principle

Entangle should not be architecturally simplified for the hackathon. The correct rule is:

> Keep the final architecture. Reduce only the active feature surface and the number of active components.

That means:

- stable types now;
- restricted execution profile for the hackathon;
- no deliberate shortcuts that would invalidate later features such as remote node attachment, richer transport policies, multi-relay operation, or stronger governance.

## Current Status

This repository currently contains:

- a detailed design corpus;
- an operational wiki schema and initial pages;
- a locally materialized reference corpus under `resources/`;
- a concrete implementation stack direction centered on TypeScript, Node 22,
  `pnpm`, Turborepo, `nostr-tools`, `strfry`, `Gitea`, and Docker Compose;
- an initial monorepo scaffold for `apps/`, `services/`, `packages/`, and
  `deploy/`;
- the first machine-readable contract layer in `packages/types`;
- a stronger validator surface with resource-resolution and transport
  realizability checks;
- a host control-plane surface with persistent catalog, package-source, and
  graph state under `.entangle/host`;
- a host client, package scaffold utility, runner stub, CLI, and Studio
  surface that now consume real host state instead of a fake graph;
- a verified baseline where `pnpm install`, `pnpm typecheck`, and `pnpm build`
  all pass.

The repository should be treated as a live design baseline rather than as a static document dump. Each substantial interaction with the project should begin with a lightweight audit loop:

- reread the current project state;
- check for stale status statements or drift between documents;
- update durable project memory when the state changes.
