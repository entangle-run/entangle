# Core Contract Invariants

This document defines the non-negotiable invariants that make Entangle's core contracts safe to implement, validate, and evolve.

The type definitions in [12-canonical-type-system.md](12-canonical-type-system.md) describe the shape of the system. This document defines the rules that must hold across those shapes.

## Why this document exists

Without explicit invariants, a specification is still partly interpretive. Teams end up encoding different assumptions in different packages, which creates silent drift and forces later rewrites.

The purpose of this document is to remove that ambiguity.

## Normative language

The terms "must", "must not", "should", and "may" are used normatively.

## Global invariants

These rules apply across the whole Entangle model.

### 1. Structural truth must not live only in prompts

Structural permissions and topology must not be defined only in natural-language prompt files.

Prompts may explain:

- identity;
- role;
- working style;
- constraints;
- interpretation hints.

Prompts must not be the sole source of truth for:

- graph membership;
- edge permissions;
- transport bindings;
- approval authority;
- artifact backend access.

Those must exist as structured data.

### 2. Secrets must never be part of portable package identity

Portable artifacts must not embed live private keys, access tokens, or host-specific credentials.

This applies to:

- `AgentPackage`;
- graph definitions;
- reference corpora;
- tracked wiki state.

Secrets may be injected into runtime instances through bindings, secret references, or deployment configuration.

### 3. Hackathon restrictions must not narrow the canonical model

The hackathon implementation may support only a restricted value profile.

The canonical contracts must still model the final product shape.

This means:

- limited runtime support is acceptable;
- under-specified or distorted core types are not acceptable.

### 4. Messages coordinate work; artifacts carry work

No canonical type may assume that the full work product is carried inline in the transport message.

Messages may contain:

- summaries;
- instructions;
- status updates;
- artifact references.

Durable work product belongs in artifact backends.

### 5. Every runtime actor has one authoritative cryptographic identity

Every active runtime node must have one authoritative Nostr public key for signing protocol events.

Derived display identities may exist, but protocol authorship must resolve to one canonical signing identity.

## AgentPackage invariants

### 1. Package identity is portable and non-graph-specific

An `AgentPackage` must be valid independently of any one graph.

It must not assume:

- a fixed graph id;
- fixed peer identities;
- fixed relay topology;
- fixed approval authorities.

### 2. Package semantics are template-level, not instance-level

An `AgentPackage` defines what kind of actor this is in general.

It may define:

- template identity;
- default capabilities;
- prompt material;
- memory schema;
- tool configuration shape.

It must not define:

- graph-local edge bindings as canonical truth;
- live runtime state as canonical truth;
- one-off session data as canonical truth.

### 3. Entry files must resolve inside the package root

Every path in `entry_files` must:

- be relative to the package root;
- exist;
- not traverse outside the package root;
- point to the expected file type.

### 4. Package memory content is either seed content or mutable instance state, never both at once

If a package ships wiki or memory files, those files must be treated as one of the following:

- seed material copied into a new runtime instance; or
- example/reference material for the package.

They must not be treated as globally authoritative live state across instances.

### 5. Capability declarations must be explicit

A package must not rely on prompt prose alone to imply capabilities.

Every capability exposed to routing, validation, or selection must be declared in structured data.

## NodeInstance invariants

### 1. A NodeInstance binds exactly one package identity into one graph context

A `NodeInstance` must represent one graph-local actor.

It must bind:

- one `graph_id`;
- one `node_id`;
- one signing `pubkey`;
- one underlying package/template identity.

### 2. Node identity must be stable inside a graph

Within one graph:

- `node_id` must be unique;
- active `pubkey` values must be unique unless a future explicit shared-identity feature is introduced.

For v1, two distinct node instances in the same graph must not share the same signing pubkey.

### 3. Graph-local overlays must not mutate template identity

Graph-local settings may specialize behavior.

They must not rewrite the meaning of:

- `agent_template_id`;
- package capability identity;
- package compatibility declarations.

They may add:

- local prompt addenda;
- local trust labels;
- local transport bindings;
- local approval constraints;
- local artifact backend preferences.

### 4. Visibility mode governs runtime projection, not graph truth

`visibility_mode` affects what a node sees at runtime.

It does not change:

- which nodes exist in the graph;
- which edges exist in the graph;
- which control policies are structurally true.

### 5. Node kind and role must not contradict each other semantically

A node may have any string role, but it must not create obvious semantic contradictions with `node_kind`.

Examples:

- a `user` node must not declare itself as a machine executor;
- a `memory` node must not be treated as a human approval authority unless explicitly supported later.

The validator should reject impossible combinations and warn on suspicious ones.

## Edge invariants

### 1. Edges are canonical, first-class, and graph-local

An `Edge` is the canonical source of truth for the relationship between two node instances.

The relationship must not require duplicated hand-maintained truth inside both nodes.

### 2. Source and target must both exist and must not be the same node

For v1:

- `source_node_id` must resolve to a graph member;
- `target_node_id` must resolve to a graph member;
- `source_node_id` and `target_node_id` must differ.

Self-edges are out of scope until an explicit self-loop semantic is introduced.

### 3. Relation type and initiator policy must be compatible

`relation_type` and `initiator_policy` must not contradict one another.

Examples:

- `reports_to` should not default to unconstrained bidirectional delegation;
- `reviews` should not imply unrestricted authority escalation unless policy says so;
- `supervises` must not remove the supervised node from all return-path communication.

### 4. Approval semantics live on the relation or transition, not in node mythology

Approval gating must be encoded in structured policy attached to the relation or runtime transition.

It must not be inferred only from human assumptions such as "this node sounds managerial".

### 5. Transport policy must be realizable

An edge is not valid merely because it names relays.

Its transport policy must be realizable by the actual participating nodes.

At minimum:

- sender publish paths must intersect receiver read paths;
- reverse communication, if required, must also be realizable;
- referenced relay bindings must be consistent with the active runtime profile.

## GraphSpec invariants

### 1. A graph is a closed topology definition

`GraphSpec` must define a closed set of node and edge membership for the topology it claims to describe.

Open network discovery may extend the ecosystem later, but a concrete graph definition must still be internally closed and valid on its own.

### 2. Entry points must be graph members

Every `entrypoint` must resolve to a node in the graph.

Entry points must not reference:

- missing nodes;
- disabled nodes;
- nodes forbidden by graph policy from receiving user-initiated sessions.

### 3. Ownership and control authority must be coherent

`owner_pubkey` must resolve to either:

- a graph owner identity recognized by the control model; or
- a management identity outside the runtime node set but valid for control-plane actions.

This distinction may be implemented later, but the graph must not be ownerless.

### 4. Graph defaults must not contradict member capabilities

If graph defaults specify artifact backend defaults or policy profiles, those defaults must be usable by at least the entrypoint path required for serious execution.

## TransportPolicy invariants

### 1. Transport policy is edge-specific

Transport policy must be interpreted in relation to one edge, not as a universal property of a node.

A node may participate in multiple relations with different transport behavior.

### 2. Canonical transport must be directional internally

Even when a symmetric authoring form is allowed, the internal normalized representation must preserve directionality.

This is necessary because:

- publish and read paths may differ;
- relay access may differ;
- future receipt or acknowledgment behavior may differ.

### 3. Logical channels must be explicit

If a transport policy distinguishes channels, the channel name must be explicit and stable.

Hidden channel semantics must not be inferred solely from free-form message content.

## ApprovalPolicy invariants

### 1. Approval authority must be resolvable

Every referenced approver must exist in the graph or in an explicitly supported control identity registry.

Unknown approvers invalidate the policy.

### 2. Contradictory approval rules are invalid

Policies such as the following are invalid:

- work requires confirmation before execution, but no approver exists;
- response requires confirmation, but the edge disallows the necessary response path;
- acknowledgment is required, but the relation forbids return communication.

### 3. Timeouts are policy, not implied behavior

If approval timeout behavior matters, it must be stated.

The runtime must not invent silent timeout semantics.

## RuntimeProjection invariants

### 1. RuntimeProjection is derived state

`RuntimeProjection` must never be treated as hand-authored primary topology truth.

It is always derived from:

- package;
- node instance;
- graph;
- active policies;
- active session context.

### 2. RuntimeProjection must respect visibility mode

It may not leak graph information beyond the allowed view for that node in that runtime context.

### 3. RuntimeProjection must be reproducible

Given the same package, graph, bindings, and session context, the system should be able to reproduce materially equivalent runtime projections.

## Session invariants

### 1. Every session belongs to exactly one graph

A session must not span multiple graphs in v1.

Future federation can introduce cross-graph relationships, but session scope remains graph-bound unless the type system is explicitly extended.

### 2. The originating user must be a real graph actor

`originating_user_node_id` must resolve to a node with `node_kind = user`.

### 3. The entrypoint must be valid for user initiation

`entrypoint_node_id` must:

- resolve to a graph member;
- be listed in the graph's entrypoint set;
- be reachable under current policy from the originating user node.

### 4. Trace identity must be stable across all derived work

All messages, artifacts, approvals, and runtime actions tied to the session must preserve correlation to the session's `trace_id`.

## ArtifactRef invariants

### 1. Artifact references are durable pointers, not informal hints

An `ArtifactRef` must identify a retrievable work product or state location in a backend-specific way.

"See my last changes" is not an artifact reference.

### 2. Backend-specific locators must be sufficient for independent retrieval

The locator must contain enough information for an authorized participant to retrieve the artifact without informal hidden context.

### 3. Artifact ownership and provenance must be attributable

Every artifact must preserve:

- creator identity;
- session association;
- optional task or conversation linkage.

## Cross-object invariants

These rules bind multiple core types together.

### 1. Package and node binding must agree

If a node instance references a local or imported package, then:

- `agent_template_id` must match;
- declared default capabilities must not be silently contradicted by the node overlay.

### 2. Edge endpoints must be compatible with edge semantics

Examples:

- a `reviews` edge should involve at least one node that can review or evaluate;
- a `routes_to` edge should not terminate in a node that cannot receive routed work.

This should be validated semantically, not only structurally.

### 3. Session execution must remain inside allowed topology

The runtime execution subgraph must only traverse:

- nodes present in the graph;
- edges enabled by topology and policy;
- runtime overrides explicitly allowed by the control plane.

### 4. Artifact backend use must be allowed by both node and graph policy

If a node emits a `git` artifact:

- the node must support `git` or be granted it in runtime policy;
- the graph policy must allow it for that path;
- the referenced workspace must exist in the active runtime environment.

## Forbidden patterns

The following patterns are explicitly out of bounds for the first serious version of Entangle:

- using prompt text as the only expression of structural permissions;
- committing live secrets into packages or graph files;
- modeling graph-local connections as duplicated mutable truth inside each package;
- treating runtime projections as author-authored topology;
- allowing unbounded response loops with no structured stop conditions;
- allowing one graph session to silently become a multi-graph execution.

## Hackathon interpretation

The hackathon runtime may implement:

- a subset of relation types;
- a subset of transport modes;
- a subset of session states;
- a subset of artifact backends.

It must still preserve the invariants above, even when many allowed values remain unsupported.
