# Implementation Strategy

## North star

Build the minimum number of executables and the minimum number of active profiles while preserving the final conceptual architecture.

## Recommended implementation units

### `entangle-runner`

One executable or service responsible for running a node instance.

### `entangle-studio`

One client surface for:

- viewing the graph;
- launching work from the user node;
- inspecting runtime traces;
- editing limited graph structure and node configuration.

### `entangle-types`

Shared package for:

- package schema;
- graph schema;
- protocol schema;
- validation helpers.

### `entangle-validator`

Validation CLI or library for:

- package validation;
- graph validation;
- runtime binding validation;
- transport feasibility validation.

## Hackathon-first implementation profile

### Strong yes

- define schemas first;
- implement runner with one engine adapter;
- use git as first artifact backend;
- implement wiki memory folder and update phase;
- use one relay profile;
- keep graph small and deterministic.

### Strong no

- do not build a fake graph UI that does not reflect real runtime state;
- do not make package structure graph-specific;
- do not let the model control conversation stopping alone;
- do not collapse artifacts into chat messages;
- do not bind the entire architecture to one engine's internal assumptions.

## Suggested order of implementation

1. define core types;
2. define runner lifecycle;
3. define A2A protocol;
4. implement validator;
5. implement local package + node execution;
6. implement Nostr messaging;
7. implement git artifact handoff;
8. implement wiki update phase;
9. implement Studio read-only graph view;
10. implement lightweight graph editing and task launch.

## Definition of done for the first serious version

The first serious version is done when:

- node packages validate;
- graph instances validate;
- runner can execute multiple nodes locally;
- nodes exchange signed messages over Nostr;
- at least one git-backed artifact handoff occurs;
- user can watch the session subgraph;
- the resulting architecture clearly extends to remote nodes later without changing core types.
