# External Resource Catalog and Bindings

This document defines how Entangle should model the external systems that nodes
depend on at runtime.

The goal is to avoid hardcoding relay URLs, git remotes, or model endpoints
directly into packages or ad hoc runtime logic.

## Design rule

External infrastructure must be:

- explicit;
- named;
- deployment-scoped;
- bindable per node;
- overridable by graph defaults;
- validatable before runtime.

It must not be implicit in code paths or scattered as duplicated raw URLs across
the graph model.

## 1. Resource classes

The first serious version should model at least three external resource
classes.

### Relay profiles

For Nostr communication.

### Git service profiles

For collaborative artifact storage and retrieval.

### Model endpoint profiles

For inference and tool-using agent execution.

These are all external dependencies of the Entangle runtime, but none of them
should be hardcoded as a product identity.

## 2. Deployment resource catalog

The active environment should expose a deployment-scoped catalog of named
resource profiles.

This catalog should be owned by the host control plane.

The host should treat it as one of the core inputs to node binding, alongside:

- package source;
- node instance;
- graph revision;
- secret references;
- runtime backend profile.

## 3. Why a catalog is better than raw inline URLs

If the graph embeds raw URLs everywhere:

- relay changes require broad graph edits;
- git service rotation is harder;
- secrets drift from endpoint definitions;
- validation becomes weaker;
- the same infrastructure gets duplicated across many nodes.

A named resource catalog allows:

- stable references;
- reuse across nodes;
- defaults at graph level;
- environment-specific overrides;
- stronger validation and safer rotation.

## 4. Binding model

Nodes should bind to resource profiles by reference.

The canonical model should allow:

- one or more relay profile bindings per node;
- one or more git service bindings per node;
- one model endpoint profile per node in the first implementation, with room for
  widening later.

Graphs may also define defaults.

Examples:

- graph default relay profile shared by all nodes;
- graph default git service shared by most nodes;
- graph default model profile overridden only for selected nodes.

## 5. Relay binding semantics

Each node may read and write on different relay sets, but any active edge must
still be realizable.

That means:

- connected nodes do not need identical relay profiles;
- they do need at least one effective communication path consistent with the
  edge's transport policy;
- validation must reject edges whose effective relay path is not realizable in
  the active deployment profile.

The hackathon should use the simplest case:

- one relay profile;
- all active nodes bound to it.

## 6. Git service binding semantics

Each node may bind to one or more git services, but artifact handoff must still
be valid on the path where it is used.

That means:

- nodes do not need identical git service bindings globally;
- a receiving node must be able to retrieve the referenced git artifact from the
  named git service, unless an explicit replication or relay mechanism exists;
- validation and runtime policy should treat git-service reachability as part of
  artifact handoff validity.

The hackathon should use the simplest case:

- one git service profile;
- all active nodes bound to it.

## 7. Model endpoint binding semantics

Packages should not hardcode a specific provider endpoint as part of their
portable identity.

Instead:

- the runtime binds a node to a model endpoint profile;
- the runner receives the effective model profile through injected runtime
  context and secrets;
- provider-specific logic lives behind engine adapters, not in the graph model.

The first implementation should allow:

- one active model endpoint profile per node;
- one engine adapter used by all nodes in the hackathon;
- later widening to multiple adapters and multiple per-node model profiles if
  the product truly needs it.

The hackathon should use:

- one shared model endpoint profile for all active nodes.

## 8. Graph defaults versus node overrides

The graph should be allowed to define defaults for resource profiles.

Recommended precedence:

1. node-local explicit binding
2. graph default
3. deployment default

This gives:

- ergonomic setup for the common case;
- flexibility for exceptional nodes;
- clear fallback order.

## 9. What the host should own

The host should own:

- the active deployment resource catalog;
- secret resolution for resource profiles;
- validation that bindings resolve;
- workspace and runtime injection of effective resource context;
- runtime restarts or rebinding when resource profiles change.

Studio and CLI should operate through the host rather than owning inline copies
of resource truth.

## 10. What should stay out of packages

Portable packages should not embed:

- fixed relay URLs as their only usable runtime path;
- fixed git service host assumptions;
- fixed provider endpoints tied to one operator deployment;
- live secrets for any of the above.

Packages may include:

- capability expectations;
- tool or engine hints;
- minimum runtime requirements;
- documentation about intended backends.

## 11. Local hackathon infrastructure versus long-term ops

For the hackathon, it is correct to keep a minimal local infrastructure profile
inside the main Entangle monorepo under deployment tooling such as
`deploy/local`.

That gives:

- reproducibility;
- easier onboarding;
- one canonical demo environment;
- less repository and release overhead.

It does not mean the product is coupled to one local relay, one local git
server, or one local model endpoint forever.

Later, separate infrastructure or ops repositories may make sense for production
deployment, but they are not the right first move while the core contracts are
still being established.

## 12. Rejected anti-patterns

Entangle should reject:

- hardcoding one relay URL in runtime code;
- hardcoding one git server into artifact logic;
- hardcoding one model endpoint into the node package model;
- duplicating identical raw URLs into every node binding;
- treating hackathon infrastructure defaults as if they were the canonical
  architecture.
