# Vision and Philosophy

## The deep thesis

The mainstream agentic interface today is structurally conservative. Even when systems appear powerful, the user usually interacts with one main node and a hidden orchestration layer. The topology is implicit, fixed, and not user-governable.

Entangle takes the opposite position:

> agentic systems should be graph-native, not monolithic; composable, not hidden; explicit, not implied.

## Philosophical stance

Entangle is based on five convictions.

### 1. Protocol over platform

A useful long-term system should not depend on one client, one backend, or one model vendor. A protocol-level representation of agent identities, relations, messages, and artifacts is more durable than a vertically integrated product surface.

### 2. Actors over services

An Entangle node is not just a function call endpoint. It is a situated actor with:

- identity;
- role;
- responsibilities;
- local memory;
- local tools;
- bounded visibility;
- policy-constrained relationships.

### 3. Graph over pipeline

Pipelines are too narrow. They are useful projections of work, but they are not sufficient to model real organizations. Entangle therefore distinguishes:

- static topology graph;
- runtime execution subgraph;
- governance/control graph.

### 4. Artifacts over chat

Conversation coordinates work, but durable work should usually live in artifacts:

- git branches and commits;
- wiki pages;
- reports;
- patch files;
- structured outputs.

Messages should not be the sole substrate of collaboration.

### 5. Visibility over convenience

Much of the current AI product stack wins on convenience by hiding structure. Entangle chooses explicitness instead:

- visible topology;
- visible delegation;
- visible approvals;
- visible state transitions;
- visible ownership of artifacts;
- visible execution traces.

## Product worldview

Entangle should eventually feel like a cross between:

- an organization chart editor;
- an operations control plane;
- an agent runtime;
- a protocol-native collaboration environment.

The user should be able to answer:

- Who can talk to whom?
- Who owns this task?
- Which path did this task take through the graph?
- Which artifact contains the actual work product?
- Which node made this decision?
- Where should this node escalate if blocked?

## The company metaphor

The most useful mental model is not "AI assistant with plugins." It is "digital company made of interoperable workers."

In that metaphor:

- node = worker or organizational actor;
- role = job title or function;
- edge = working relationship or reporting line;
- session = a project, issue, or assignment;
- artifact = the actual deliverable;
- user node = the human owner, operator, or supervisor.

This metaphor is not decorative. It drives the architecture.
