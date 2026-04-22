# Hackathon Scope and Deliverables

## Scope principle

The hackathon deliverable should be the first serious vertical slice of the final product.

That means:

- the architecture is real;
- the types are real;
- the runtime is real;
- the graph is real;
- the feature set is restricted.

## What must exist in the hackathon build

### Core system

- `AgentPackage` structure
- `NodeInstance` model
- `Edge` model
- `GraphSpec`
- `RuntimeProjection`
- `AgentRunner`
- Nostr-based signed messaging
- one artifact backend: git
- one local memory backend: wiki

### Active graph

- user node
- supervisor/orchestrator node
- two or three worker nodes

### Studio surface

- graph topology view
- runtime trace view
- task launch from the user node
- node inspector with basic configuration

### Collaboration

- at least one shared git repository
- artifact handoff by reference
- real updates to node-local wiki state

## What should be intentionally left out

- remote node attachment UI
- advanced graph editor
- open marketplace semantics
- multi-relay routing optimization
- global trust or reputation
- fully free-form peer-to-peer autonomous graph mutation
- production-grade sandboxing
- billing and payments

## Hackathon acceptance criteria

The hackathon build is a success if it demonstrates all of the following:

1. the user can view the graph;
2. the user can launch a task through an entrypoint node;
3. the session traverses multiple nodes over Nostr;
4. nodes produce durable artifact references, not just text responses;
5. at least one node updates its local wiki memory as part of execution;
6. the runtime subgraph is visible;
7. the user can understand who did what.

## Demo recommendation

Use one controlled scenario:

- a coding or structured artifact task;
- a supervisor delegates to a worker;
- the worker produces a branch or commit;
- another node reviews or continues the work;
- the user sees messages and artifact references in real time.

The runtime subset that should be treated as canonical for the hackathon build is specified more explicitly in [29-hackathon-runtime-profile.md](29-hackathon-runtime-profile.md).
