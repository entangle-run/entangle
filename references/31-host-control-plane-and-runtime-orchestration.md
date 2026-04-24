# Host Control Plane and Runtime Orchestration

This document defines the concrete local operating model for Entangle when the
system is running on one machine or one demo environment.

The goal is to preserve the product architecture while making node admission,
graph mutation, and runtime lifecycle management implementable in a disciplined
way.

## Design rule

Studio should be the user-facing administrator of the graph.

It should not be the implementation owner of:

- applied graph truth;
- runtime lifecycle management;
- validator execution;
- container or process orchestration;
- runtime workspace materialization.

Those responsibilities belong to a host control-plane service.

Recommended name:

- `entangle-host`

## 1. Why a host service is necessary

If Studio directly owns Docker or process orchestration, the UI becomes:

- stateful in the wrong place;
- harder to run headless;
- harder to automate from CLI or tests;
- harder to extend to remote nodes later;
- more likely to drift from control-plane truth.

Entangle needs a bounded service that owns local applied state even when the
user interacts through Studio.

## 2. Core responsibility split

### Studio

Studio should:

- present graph and runtime state;
- let the operator propose graph mutations;
- let the operator add nodes from host-visible local package sources;
- let the operator add, edit, enable, disable, and remove edges through bounded flows;
- let the operator start, stop, or restart selected nodes;
- show validation findings and runtime outcomes.

### Host

The host should:

- own the applied local graph revision;
- own the active deployment resource catalog;
- track package sources admitted into the local environment;
- run validators before apply;
- create node bindings and runtime projections;
- provision or register external principals needed for local runtime profiles;
- manage runtime backend operations;
- reconcile desired state with actual running state;
- expose runtime and mutation results to Studio.

The host also now has an optional bootstrap operator-token boundary. When
`ENTANGLE_HOST_OPERATOR_TOKEN` is configured, HTTP control-plane calls require
`Authorization: Bearer <token>`, and the event stream validates the same token
before exposing live host events. This does not replace future user, workspace,
or role-aware authorization, but it prevents the local host from remaining an
unconditionally open mutation surface.

## 3. Canonical local control-plane objects

The host should manage at least these local objects:

### Package source

A record describing where a portable `AgentPackage` came from.

First serious supported kinds:

- `local_path`
- optionally `local_archive`

The canonical source of truth for admission should remain host-visible package
sources. A browser-only directory handle or other UI-local filesystem token
must not become the durable package-source identifier.

### Applied node binding

A validated local binding of:

- `NodeInstance`
- package source
- runtime profile
- secrets references
- artifact backend profile

### Applied graph revision

The graph revision currently chosen as the desired local runtime truth.

### Runtime instance

The concrete local process or container running one node.

### Runtime backend

The mechanism used to run node instances locally.

## 4. Runtime backend abstraction

The host should not hardcode Docker-specific logic into every control-plane path.

It should own a runtime-backend abstraction with a narrow contract.

Recommended conceptual operations:

- `prepareWorkspace(nodeBinding)`
- `startRuntime(nodeBinding)`
- `stopRuntime(nodeId)`
- `restartRuntime(nodeId)`
- `removeRuntime(nodeId)`
- `inspectRuntime(nodeId)`
- `streamRuntimeEvents(nodeId)` or equivalent polling surface

### First backend

The first serious backend should be:

- `docker`

### Optional later backends

- `local_process`
- `ssh_remote`
- future orchestrated backends

The product should support widening backend support later without moving this
responsibility into Studio.

## 5. Docker stance

Docker is the right first backend for local and hackathon operation because it
gives:

- per-node isolation;
- clean secret boundaries;
- explicit mounts for package, workspace, and wiki state;
- operational credibility for a graph of real runtimes.

However, Docker should be used in a specific way.

### Recommended shape

Use Docker Compose to boot the stable shared services:

- `entangle-studio`
- `entangle-host`
- `strfry`
- `gitea`

Then let `entangle-host` create, stop, and remove runner containers dynamically.

Do not model every potential node as a static service entry in `docker-compose.yml`.

That is too rigid for:

- adding nodes in Studio;
- removing nodes;
- changing package sources;
- scaling the graph beyond a demo preset.

## 6. Package and workspace materialization

Selecting a folder in Studio should not mean "mount that folder as the live node
root and let the runtime mutate it arbitrarily".

Preferred materialization:

- package source path mounted read-only;
- seed memory copied or initialized into node-local mutable storage;
- runtime-injected files written into a separate injected surface;
- workspace, logs, and wiki memory written to node-local mutable storage;
- secrets provided separately from package content.

This keeps the portable package graph-agnostic and makes the runtime-bound
workspace reproducible from:

- package source;
- node binding;
- graph revision;
- environment.

## 7. Node admission flow

Recommended local flow:

1. the operator selects a local package folder in Studio;
2. Studio sends an admission request to the host;
3. the host validates the package structure and compatibility;
4. the host records a package source descriptor;
5. the operator chooses graph-local node properties;
6. the host validates the resulting node binding against the graph;
7. the host produces a new graph revision if accepted;
8. the host materializes the runtime workspace and starts the node if desired.

This is the right place to enforce:

- package validation;
- capability compatibility;
- transport feasibility;
- artifact backend compatibility;
- secrets and runtime profile requirements.
- external principal and credential requirements for backends such as git.
- resource-profile resolution for relay, git, and model endpoint dependencies.

## 8. Edge mutation flow

Recommended local flow:

1. the operator creates or edits an edge in Studio;
2. Studio sends the proposed change to the host;
3. the host runs semantic and transport validation;
4. approval or authorization checks run if required;
5. the host produces a new graph revision;
6. the host refreshes affected node projections and runtime state where required.

## 9. Desired state versus observed state

The host should explicitly track:

- desired state
  - which graph revision is applied;
  - which nodes should be running;
  - which edges and policies are active;
- observed state
  - which runners are actually up;
  - health and last-seen status;
  - last runtime error;
  - current revision actually mounted.

This distinction matters because a serious system must handle:

- failed starts;
- stale containers;
- partial apply;
- restart and recovery.

## 10. Host API stance

The exact route names may still evolve, but the host API is no longer merely an
open question. The first serious resource-oriented surface is specified in
[36-host-api-and-reconciliation-spec.md](36-host-api-and-reconciliation-spec.md).

The host should expose bounded surfaces for:

- graph inspection;
- node admission and removal;
- edge creation and mutation;
- node lifecycle control;
- validation results;
- runtime health and trace subscriptions.

These surfaces should be suitable for more than one client:

- Studio;
- CLI;
- tests and automation.

The transport may be:

- local HTTP;
- local WebSocket;
- IPC;
- a combination of HTTP + WebSocket.

The implementation detail matters less than the boundary, but the current
recommended first implementation is local HTTP plus WebSocket as described in
[36-host-api-and-reconciliation-spec.md](36-host-api-and-reconciliation-spec.md).

## 10.1 Headless-first implication

The host should be designed so that a serious operator can use Entangle without
the visual frontend if desired.

That does not mean the frontend is optional in product value.
It means the control plane must be real enough that the frontend is not hiding a
private architecture behind it.

## 11. Relationship to remote nodes

This architecture is specifically chosen because it extends well to remote nodes.

Later, a graph may include:

- locally hosted nodes managed by the local host;
- remotely hosted nodes represented by metadata and trust bindings;
- hybrid graphs where not every node lifecycle is managed on the same machine.

Studio remains the operator surface.
The host remains the local control-plane authority.
Remote hosts can later appear without changing this conceptual split.

## 12. Hackathon profile

The hackathon should use a restricted version of this model, not a different one.

Recommended hackathon operating profile:

- one local host service;
- Docker backend only;
- `local_path` package admission only;
- bounded Studio flows for adding local nodes and editing edges;
- no remote host federation;
- no advanced scheduling;
- no autonomous agent-driven topology mutation.

This still demonstrates the real control-plane shape of the product.

## 13. Rejected anti-patterns

Reject these implementation directions:

- Studio directly spawning and tracking containers as a UI-owned concern;
- graph truth living only in browser memory;
- mounting the source package as the full mutable node root;
- static compose service definitions for every possible node in a dynamic graph;
- hiding all runtime orchestration in ad hoc scripts outside the product architecture.
