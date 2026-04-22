# System Architecture

## Canonical architecture

Entangle has six main layers.

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

### 4. Runtime layer

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

### 5. Artifact layer

Artifacts are durable work products. The architecture must support multiple artifact backends.

Hackathon backend:

- `git`

Canonical model:

- git repositories;
- local files;
- wiki memory;
- future object stores or structured stores.

### 6. Studio layer

Entangle Studio is the user-facing graph client.

It should provide:

- topology view;
- session trace view;
- node inspector;
- lightweight graph editing;
- task launch surface.

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

That gives:

- isolation;
- reproducibility;
- clean secret boundaries;
- volume-based state persistence;
- future compatibility with local and remote nodes.

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
