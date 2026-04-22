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

Entangle is currently in the architecture and design-consolidation phase.

The local reference corpus is materialized under `resources/`, and the initial implementation stack direction has been recorded.

The central design direction is now clear:

- graph-native, not orchestrator-only;
- user as node;
- agents as first-class nodes;
- Nostr-signed messaging for coordination;
- artifact backends for work;
- wiki memory per node;
- a runner per node;
- Studio as graph-aware user client.

## Most important current design conclusions

1. The user is a node in the graph.
2. Nodes are identified globally by Nostr public keys.
3. A portable `AgentPackage` must be separate from a graph-local `NodeInstance`.
4. Edges are first-class and canonical.
5. Messages coordinate work; artifacts carry work.
6. Git should be the first implemented artifact backend.
7. Each node must run as a true agent runtime, not as a stateless inference endpoint.
8. The hackathon build should preserve the final architecture while restricting active features.

## Immediate next steps

- finalize canonical schemas for packages, nodes, edges, graphs, and messages;
- formalize the first monorepo and package layout for `entangle-runner`, `entangle-studio`, and shared schema packages;
- define the first Docker Compose service topology around Studio, runners, `strfry`, and `Gitea`;
- begin the first runner, validator, and protocol skeletons while keeping the repository audit loop active.
