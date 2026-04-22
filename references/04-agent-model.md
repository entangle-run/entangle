# Agent Model

## Definition

An Entangle agent is not a model endpoint. It is a runtime actor with:

- global cryptographic identity;
- local persistent memory;
- tool access;
- artifact workspace;
- policy-constrained relationships;
- a role-specific behavioral definition.

## AgentPackage structure

The most practical package representation is a directory with a stable interface.

Proposed high-level structure:

```text
agent/
  manifest.json
  identity/
    profile.md
    role.md
    skills.md
    duties.md
    obligations.md
  prompts/
    system.md
    interaction.md
    safety.md
  memory/
    wiki/
      index.md
      log.md
      entities/
      concepts/
      tasks/
      notes/
    schema/
      AGENTS.md
  runtime/
    config.json
    capabilities.json
  assets/
  tools/
```

## Why the package matters

This package model gives:

- portability;
- inspectability;
- compatibility checking;
- versioning via git;
- LLM readability;
- the ability to import/export agents cleanly.

The package filesystem and binding contract is specified in more detail in [22-agent-package-filesystem-and-binding-spec.md](22-agent-package-filesystem-and-binding-spec.md).

## NodeInstance overlay

A node instance should add graph-local meaning without mutating the canonical package.

Typical graph-local properties:

- `graph_id`
- `node_alias`
- `role_in_graph`
- `visibility_mode`
- `autonomy_level`
- `transport bindings`
- `approval rules`
- `graph-local prompt addendum`

## Identity surfaces

An Entangle node must be understood as having more than one identity-related
surface.

### 1. Protocol identity

This is the node's authoritative internal identity inside Entangle.

- represented by the node's Nostr public key;
- used for event signing and provenance;
- stable across sessions unless the node is intentionally rekeyed.

### 2. External service principals

These are bindings to external systems that the node uses in order to
collaborate or publish work.

Examples:

- a git user or service account on `Gitea`;
- later storage, issue-tracker, or registry identities.

These are not the same thing as the Nostr identity, even when they are
visually derived from it.

### 3. Secret-backed credentials

These are concrete authentication or signing materials used against those
external systems.

Examples:

- SSH private keys for git transport;
- access tokens for HTTPS-based API or git access;
- optional SSH signing keys for commit signing.

These must remain separate from the Nostr private key.

## Identity boundary rule

Entangle should preserve one strong internal identity while allowing bound
external principals.

Therefore:

- Nostr public key = authoritative runtime identity;
- external principals = bound identities for specific backends;
- credentials = secret material used by those principals;
- commit attribution/signing = separate git-level concerns.

The system should not collapse these into a single "one key for everything"
model.

## Git identity stance

For git-backed collaboration, the preferred model is:

- keep the node's Nostr identity as the authoritative actor identity;
- bind the node to one git principal on the git service;
- keep git authentication credentials separate from the Nostr private key;
- allow git author/committer display information to be derived from the node's
  alias and Nostr identity for human readability.

This gives identity continuity without collapsing security boundaries.

## Visibility model

Nodes should not automatically know the whole graph.

Recommended visibility modes:

- `local` — only self and direct peers;
- `neighborhood` — self, peers, selected reachable nodes;
- `full` — entire graph, generally for user and supervisor nodes.

This matters for:

- security;
- prompt control;
- realistic organization design;
- context-size discipline.

## Agentic behavior requirements

Every node should be capable of more than single-step inference.

Minimum agentic lifecycle:

1. receive and validate an event;
2. construct local operational context;
3. inspect local memory and relevant artifacts;
4. decide what tools or substrate operations are needed;
5. perform work;
6. update memory;
7. produce an outcome;
8. decide whether to emit a response.

## OpenCode / Claude Code question

The correct product stance is:

- each node should behave like a real coding or task agent;
- each node should **not** require a completely separate forked product shell;
- a shared runner should execute many nodes, each with isolated state and configuration.

In other words:

- "agentic behavior per node" = yes;
- "full standalone OpenCode clone per node" = unnecessary and operationally wasteful.
