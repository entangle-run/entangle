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
