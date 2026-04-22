# Entangle Wiki Overview

## What this wiki is for

This wiki is the project memory for Entangle.

It is not a personal notebook and not a generic documentation dump. It should track:

- what Entangle is;
- what has been decided;
- why it was decided;
- what remains unresolved;
- which external systems matter;
- which references should shape implementation.

## Current project state

Entangle is currently in the first real control-plane implementation phase.

The corpus now extends from conceptual architecture into normative contracts,
package and binding structure, edge semantics, artifact backends, control-plane
rules, compatibility policy, observability, Studio responsibilities, host API
contracts, effective runtime context, engine-adapter boundaries, and a concrete
local deployment profile.

The local reference corpus is materialized under `resources/`, and the
implementation stack direction has now been narrowed toward a canonical
TypeScript + Node 22 + pnpm + Turborepo toolchain around `nostr-tools`,
`strfry`, `Gitea`, Docker Compose, `entangle-host`, and host-managed runners.

The previously remaining pre-implementation decisions have now also been
closed:

- the node execution core should live in a first-party internal
  `agent-engine` package rather than inside a wholesale upstream runtime fork;
- live local host state should live under a disciplined `.entangle/` runtime
  root with explicit desired, observed, trace, import, and workspace
  partitions;
- the hackathon should include a thin but real CLI plus package scaffolding,
  while Studio remains the richer operator surface.

The implementation-readiness gate has now passed at the specification level.
That does not mean the repository should stop auditing itself; it means the
next work can move from architectural uncertainty into schema, validator, host,
runner, CLI, and Studio scaffolding without changing the core model again.

The contract-ownership layer is now also explicit:

- `packages/types` should own the primary `zod` schemas and host API DTO
  contracts;
- `packages/validator` should own semantic validation on top of those schemas;
- generated artifacts such as JSON Schema should remain derivative, not primary.

The repository now also contains the first real implementation baseline:

- a `pnpm` + Turborepo monorepo scaffold;
- `apps/studio` and `apps/cli`;
- `services/host` and `services/runner`;
- `packages/types`, `validator`, `host-client`, `agent-engine`, and
  `package-scaffold`;
- a first local Compose profile and service Dockerfiles;
- a persistent local host-state model under `.entangle/host`;
- live host routes for catalog inspection/apply, package admission, graph
  inspection/apply, runtime inspection, runtime context access, and runtime
  desired-state mutation;
- host-side runtime materialization for effective bindings, runtime intents,
  observed runtime records, workspace layout, immutable package-store-backed
  package surfaces, and injected runtime context;
- a runtime-backend abstraction with a memory backend used in tests and a
  first Docker backend for the local operator profile, now mediated through a
  first-party Docker Engine API client rather than `docker` CLI shell-outs,
  plus persisted reconciliation snapshots and richer host status output;
- a Studio graph surface that now renders live host topology instead of a fake
  demo graph;
- a runner bootstrap that now consumes injected runtime context, package
  prompts, runtime config, and seeded memory instead of a hardcoded request;
- machine-readable Entangle A2A payloads and runner-local session,
  conversation, approval, and turn-state contracts owned by `packages/types`
  plus validator entrypoints for those surfaces in `packages/validator`;
- a real quality baseline with ESLint, Vitest, and GitHub Actions CI;
- an explicit composite TypeScript build graph with solution-build typechecking
  for internal packages and Node services;
- targeted tests over validator semantics, host-client error handling, package
  scaffolding, host API input failure modes, runtime context conflict
  semantics, and runner bootstrap behavior;
- a verified `pnpm verify` path for the current workspace.

The specification corpus now has five layers:

- descriptive and conceptual architecture;
- canonical type definitions;
- normative invariants, normalization rules, validation rules, and runtime state machines.
- operational specifications for packaging, graph policy, artifact backends, control-plane behavior, and compatibility.
- product-operational specifications for observability, Studio, hackathon runtime profile, and phase quality gates.

The central design direction is now clear:

- graph-native, not orchestrator-only;
- user as node;
- agents as first-class nodes;
- hackathon topology should visibly include non-flat organizational structure, not only one coordinator with flat subagents;
- Nostr-signed messaging for coordination;
- artifact backends for work;
- wiki memory per node;
- a runner per node;
- Studio as graph-aware user and operator client;
- a separate host control-plane service for node admission and runtime lifecycle.
- headless operation should remain possible through CLI and host-facing surfaces, not only through Studio.
- the project should remain in one monorepo with explicit internal package boundaries during the hackathon and early product phase.
- relay, git service, and model endpoint configuration should come from a
  deployment-scoped resource catalog, not hardcoded runtime assumptions.
- runners should consume a versioned effective runtime context resolved by the
  host, not recompute graph and deployment merges on their own.
- model-provider integration should happen behind an internal engine-adapter
  boundary, and the local deployment profile should make the real control-plane
  topology visible.

## Most important current design conclusions

1. The user is a node in the graph.
2. Nodes are identified globally by Nostr public keys.
3. A portable `AgentPackage` must be separate from a graph-local `NodeInstance`.
4. Edges are first-class and canonical.
5. Messages coordinate work; artifacts carry work.
6. Git should be the first implemented artifact backend.
7. Git credentials must stay separate from the node's Nostr private key, even
   when git-facing attribution is derived from the node identity.
8. Each node must run as a true agent runtime, not as a stateless inference endpoint.
9. Relay, git, and model endpoint resources must be bindable per node or via
   graph defaults rather than hardcoded globally.
10. Host, Studio, CLI, and runner need explicit contracts for API and injected
    runtime context rather than ad hoc coupling.
11. The engine/provider layer must stay behind an adapter boundary, not leak
    provider-native types into the runner contract.
12. The hackathon build should preserve the final architecture while restricting active features.

## Immediate next steps

- move `entangle-runner` from bootstrap-only execution into Nostr lifecycle and
  session handling;
- materialize stable per-node Nostr identities and inject non-secret identity
  context from the host into runner workspaces;
- add artifact-side git work and handoff logic inside the runner;
- start exposing the richer runtime slice in Studio while keeping the same host
  boundary and quality gates;
- add stronger Docker-backed runtime smoke coverage and explicit restart/event
  semantics on top of the new runtime backend boundary.
