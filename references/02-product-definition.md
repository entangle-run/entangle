# Product Definition

## Product statement

Entangle is a system for composing organizations of AI actors and executing work across them.

It has two major user-facing surfaces:

1. **Entangle Studio**
   A graph-aware client where the user creates or attaches nodes, edits topology, configures behavior, launches sessions, and watches execution.
2. **Entangle Runner**
   The runtime that executes an individual node as a true agent, not as a stateless inference endpoint.

## What the product is not

Entangle is not:

- a simple Nostr chat client;
- a clone of Claude Code;
- a single-agent coding shell;
- a marketplace without a runtime model;
- a demo-only graph visualizer.

## Primary user problems

### Hidden topology

Current systems hide the real execution graph.

### Poor governance

Users cannot precisely define who can delegate to whom, who must request approval, or how responsibilities propagate.

### Weak modularity

Subagents often exist only inside one orchestrator product, not as interoperable, portable units.

### Weak persistence of organizational knowledge

Agents are often stateless or context-window dependent instead of maintaining durable local memory.

### Poor collaboration substrate

Conversation is often overloaded to carry both coordination and deliverables.

## Core product primitives

The product is built from the following primitives:

- `AgentPackage`
- `NodeInstance`
- `Edge`
- `GraphSpec`
- `RuntimeProjection`
- `AgentRunner`
- `UserNode`
- `Session`
- `Artifact`

## User-facing capabilities

### Graph composition

The user can:

- create a new node from a package template;
- import an existing node package;
- later attach remote nodes;
- connect nodes through typed edges;
- configure permissions, approvals, and transport rules.

### Runtime control

The user can:

- choose an entrypoint node;
- send a task into the graph;
- pause or stop a session;
- inspect node state;
- approve or reject transitions where required.

### Observability

The user can:

- view the static graph;
- inspect the runtime subgraph;
- see messages, state changes, and artifact links;
- inspect who did what and why.

### Node configuration

The user can change:

- model/provider;
- role-specific prompt overlays;
- workspace and artifact settings;
- autonomy level;
- approval behavior;
- relation policies.

## Product boundary for the hackathon

The hackathon build should produce a narrow but real first product slice:

- one user node;
- one supervisor/orchestrator node;
- two or three worker nodes;
- one shared git-backed work substrate;
- one Nostr relay set profile;
- graph viewing and light graph editing;
- real signed inter-node messaging;
- real artifact handoff.

That is enough to validate the product thesis without pretending the full product is complete.
