# System Architecture

## Canonical architecture

Entangle has eight main layers.

### 1. Identity layer

Each runtime node is identified by a Nostr keypair.

- public key = global actor identity;
- private key = signing authority for outbound messages;
- graph-local alias = human-readable or graph-specific role name.

### 2. Package layer

An `AgentPackage` is the portable storage representation of an agent.

It contains:

- prompt material;
- capability declarations;
- memory schema;
- local wiki conventions;
- runtime configuration templates;
- optional tool definitions and assets.

It does **not** contain the graph as source of truth.

### 3. Graph layer

A `GraphSpec` defines:

- nodes;
- edges;
- entrypoints;
- topology metadata;
- governance metadata.

This is the structural source of truth.

### 4. Host control layer

Entangle needs a concrete local control-plane service for applied graph state and
runtime lifecycle management.

This role should be implemented by a host service such as `entangle-host`.

The host:

- validates package admission and graph mutations before apply;
- owns the locally applied graph revision and deployment bindings;
- owns the active deployment resource catalog;
- materializes runtime-bound workspaces from package + binding + environment;
- reconciles desired node state with observed runtime state;
- starts, stops, restarts, and removes local runner instances.

Studio may initiate these actions, but it should not directly own their
implementation.

### 5. External resource layer

Entangle depends on external systems, but should not hardcode them into package
or runner logic.

The architecture should therefore model external resources explicitly:

- Nostr relay profiles;
- git service profiles;
- model endpoint profiles;
- later other infrastructure profiles.

These should be registered in a deployment-scoped resource catalog and then
bound into nodes, edges, and runtime projections by reference.

### 6. Runtime layer

Each active node runs through an `AgentRunner`.

The runner:

- loads an agent package;
- mounts secrets;
- receives graph-local configuration;
- subscribes to Nostr events;
- enforces policy;
- invokes the agent engine;
- manages artifacts and memory;
- emits signed messages.

### 7. Artifact layer

Artifacts are durable work products. The architecture must support multiple artifact backends.

Hackathon backend:

- `git`

Canonical model:

- git repositories;
- local files;
- wiki memory;
- future object stores or structured stores.

### 8. Studio layer

Entangle Studio is the user-facing graph client.

It should provide:

- topology view;
- session trace view;
- node inspector;
- bounded graph editing and runtime administration through the host control layer;
- task launch surface.

## Multiple client surfaces

The architecture should support multiple operator surfaces over the same control
plane.

At minimum:

- Studio as the visual graph-aware client;
- a CLI for headless operation and automation;
- file-based workflows for package and graph authoring.

The host control layer should remain the shared boundary for runtime-affecting
operations regardless of client surface.

## Package versus node instance

This distinction is non-negotiable.

### AgentPackage

Portable, reusable, identity-agnostic template or package.

### NodeInstance

Graph-local binding of an agent package:

- graph role;
- visibility mode;
- relation bindings;
- transport and policy overlays;
- runtime-specific prompt overlay.

## Edge as first-class object

Edges must be canonical objects, not duplicated local declarations.

Each edge defines:

- source node;
- target node;
- relation type;
- initiation rules;
- transport policy;
- approval policy;
- constraints.

Local views derived from edges may be injected into the runner, but the edge definition remains the source of truth.

## Deployment stance

Entangle should support isolated node execution from the beginning.

Recommended deployment unit:

- one runner process or container per active node.

Recommended local control-plane unit:

- one host service responsible for managing the active local runner set.

That gives:

- isolation;
- reproducibility;
- clean secret boundaries;
- volume-based state persistence;
- future compatibility with local and remote nodes;
- a clean separation between UI concerns and runtime orchestration.

## Local versus remote nodes

The architecture must support both even if the hackathon implements only local nodes.

### Local node

- package stored locally;
- runner executed locally;
- workspace stored locally.

### Remote node

- package may be locally represented only by metadata and trust information;
- runner executes on another machine;
- communication occurs purely via shared Nostr relay surfaces and referenced artifacts.

This distinction should be modeled now even if only the local case is implemented.

## External resource stance

External infrastructure must be configurable, not hardcoded.

That means:

- nodes may use different relay profiles;
- nodes may use different git service bindings;
- nodes may use different model endpoint profiles;
- edges and artifact handoffs must still validate that the relevant nodes share
  a realizable path for communication or artifact retrieval.

For the hackathon, the runtime may use one relay profile, one git service
profile, and one model profile shared by all nodes. That is a restricted
deployment profile, not the conceptual architecture.
