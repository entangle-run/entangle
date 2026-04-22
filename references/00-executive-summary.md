# Entangle Executive Summary

## One-sentence definition

Entangle is a graph-native runtime for modular AI organizations, where users and agents are first-class nodes, messages coordinate work over Nostr, and artifacts carry the work itself.

## Short product framing

Most current agentic systems expose only a thin slice of the real structure behind them: a user speaks to a primary orchestrator, which may spawn or delegate to specialized subagents. Entangle turns that hidden tree into an explicit, user-composable graph.

In Entangle:

- the user is a node;
- each agent is a node;
- nodes are connected by typed, policy-bound edges;
- messages are signed Nostr events;
- each node has local state, local memory, a runtime, and a workspace;
- sessions activate only part of the graph, producing a visible execution subgraph.

## Why this matters

Entangle is not trying to be just another coding assistant. It is trying to make the backend of agentic systems:

- visible;
- modular;
- governable;
- reusable;
- locally and remotely composable.

That matters for:

- composability of AI systems;
- control over delegation;
- explicit collaboration topologies;
- agent specialization;
- open protocol-based ecosystems;
- future markets of interoperable agents.

## What the hackathon build must prove

The hackathon build does not need to prove every future feature. It must prove the architecture.

The minimum convincing proof is:

1. a user can view and use a graph of nodes;
2. the graph contains a user node plus a visibly non-flat organization of agent
   nodes, including at least one supervisory or entrypoint branch, at least one
   peer collaboration relationship, and at least one delegation path deeper
   than one edge;
3. the nodes communicate over Nostr using signed messages;
4. the nodes collaborate on persistent artifacts, preferably using git;
5. each node runs as a true agent runtime with memory, tools, and local state;
6. the user can observe the session subgraph and the resulting artifacts in real time.

## Design rule

Do not reduce the architecture for the hackathon.

Reduce:

- the number of nodes;
- the number of active relations;
- the number of transport modes;
- the number of artifact backends;
- the number of editable graph features.

Do not reduce:

- the core types;
- the runtime model;
- the identity model;
- the graph model;
- the transport abstraction;
- the distinction between package, node instance, edge, graph, and runner.
