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

Entangle is currently in the architecture and design-consolidation phase, with the corpus now extending from conceptual architecture into normative contracts, package/binding structure, edge semantics, artifact backends, control-plane rules, compatibility policy, observability, Studio responsibilities, and an explicit hackathon runtime profile.

The local reference corpus is materialized under `resources/`, and the initial implementation stack direction has been recorded.

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

- move into the architecture and infrastructure decision batch for monorepo layout, package boundaries, host API boundaries, and deployment profiles;
- formalize the first Docker Compose service topology around Studio, `entangle-host`, host-managed runners, `strfry`, and `Gitea`;
- formalize the deployment resource catalog for relay, git service, and model
  endpoint profiles;
- decide the first concrete package split for `entangle-host`, `entangle-runner`, `entangle-cli`, `entangle-types`, and `entangle-validator`;
- formalize the first host API and the effective runtime binding / injected context contracts;
- formalize the first local deployment topology and first engine-adapter / model-execution contract;
- decide whether the first hackathon cut also includes a thin `entangle-package-scaffold` surface;
- only then begin the first host, validator, runner, and protocol skeletons while keeping the repository audit loop active.
