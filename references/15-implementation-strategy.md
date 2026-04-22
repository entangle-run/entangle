# Implementation Strategy

## North star

Build the minimum number of executables and the minimum number of active profiles while preserving the final conceptual architecture.

## Repository stance

Use one monorepo with explicit internal package boundaries.

Do not split the project into multiple repositories during the hackathon or
early product formation.

## Recommended implementation units

### `entangle-host`

One executable or service responsible for:

- local graph revision application;
- package admission from local sources;
- runtime workspace materialization;
- validator invocation before apply;
- node lifecycle management against a runtime backend such as Docker;
- exposing a bounded local control-plane API to Studio.

### `entangle-runner`

One executable or service responsible for running a node instance.

### `entangle-agent-engine`

One shared internal package responsible for:

- normalized model turn orchestration;
- tool-call loop execution;
- provider-adapter dispatch;
- streaming normalization;
- returning provider-agnostic turn outcomes back to the runner.

### `entangle-studio`

One client surface for:

- viewing the graph;
- launching work from the user node;
- inspecting runtime traces;
- editing limited graph structure and node configuration.

### `entangle-cli`

One headless client surface for:

- operating the host from terminal or automation contexts;
- inspecting graph, revision, and runtime state;
- performing bounded node and edge operations through the same control-plane rules as Studio;
- running validation-oriented offline operations where no host is required.

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
- deployment resource validation.

### `entangle-host-client`

Optional but recommended shared client package for:

- Studio-to-host API bindings;
- CLI-to-host API bindings;
- test harness access to the host control plane.

### `entangle-package-scaffold`

Optional but strongly recommended package for:

- generating new `AgentPackage` directory trees;
- enforcing the package interface through scaffolding;
- reusing the same templates from CLI and future Studio flows.

## Hackathon-first implementation profile

### Strong yes

- define schemas first;
- define the deployment resource catalog and node binding references before
  hardcoding relay, git, or model endpoints into runtime code;
- introduce a host/control-plane service before making Studio responsible for runtime lifecycle;
- treat Studio as a first-class hackathon deliverable, not a late cosmetic layer;
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
- do not make Studio directly own Docker or process lifecycle logic.

## Suggested order of implementation

1. define core types;
2. define deployment resource catalog and binding types;
3. define runner lifecycle;
4. define A2A protocol;
5. freeze schema ownership and host API DTO ownership in `packages/types`;
6. implement validator;
7. implement `entangle-agent-engine`;
8. implement `entangle-host` and local runtime-backend abstraction;
9. implement local package admission + node execution;
   First serious host slice:
   - fully support `local_path` package admission;
   - keep `local_archive` in the canonical model, but defer archive
     materialization until the import pipeline exists;
   - persist catalog, package-source, and graph desired state before dynamic
     runtime management.
10. implement Nostr messaging;
11. implement git artifact handoff;
12. implement model-endpoint adapter binding;
13. implement wiki update phase;
14. implement Studio graph and runtime view against host APIs;
15. add bounded graph editing, node admission, and runtime controls in Studio;
16. add thin CLI access to the same host control-plane surfaces.
17. add thin package scaffolding through shared scaffold utilities.

## Definition of done for the first serious version

The first serious version is done when:

- node packages validate;
- graph instances validate;
- host can admit, bind, and manage multiple local nodes;
- runner can execute multiple nodes locally under host control;
- nodes exchange signed messages over Nostr;
- at least one git-backed artifact handoff occurs;
- user can watch the session subgraph;
- the resulting architecture clearly extends to remote nodes later without changing core types.

The phase gates for moving from specification to architecture and implementation are defined in [30-quality-gates-and-acceptance-criteria.md](30-quality-gates-and-acceptance-criteria.md).
