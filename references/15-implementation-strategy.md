# Implementation Strategy

## Principle

Implement Entangle in small, high-rigor slices that preserve the final
architecture instead of accumulating temporary shortcuts.

Each serious slice should:

1. start with a local audit of the relevant code, specifications, and tests;
2. define a narrow gap statement and acceptance criteria;
3. implement only that gap;
4. run a strict quality pass and verification loop;
5. update canonical docs and wiki where the durable project state changed;
6. commit the slice as one coherent unit;
7. re-evaluate the whole repository before choosing the next slice.

This strategy is intentionally rolling rather than locked. The order below is
the best current delivery path from the present repository state, not a promise
never to re-evaluate.

## Repository stance

Use one monorepo with explicit internal package boundaries.

Do not split the project into multiple repositories during early product
formation unless a future operational boundary becomes strong enough to justify
it.

## Stable implementation units

### `entangle-host`

The local control-plane boundary responsible for:

- desired and observed state;
- package admission;
- graph apply and validation;
- runtime materialization and reconciliation;
- runtime backend ownership;
- host API surfaces for Studio, CLI, and tests.

### `entangle-runner`

The per-node execution boundary responsible for:

- consuming host-resolved runtime context;
- maintaining local runner state;
- receiving and publishing A2A messages;
- invoking the internal agent engine;
- materializing artifacts;
- enforcing stop and reply policy.

### `entangle-agent-engine`

The first-party internal model-execution layer responsible for:

- provider adapters;
- multi-turn execution;
- tool loops;
- provider-agnostic turn results returned to the runner.

### `entangle-studio`

The richer operator surface responsible for:

- graph and runtime inspection;
- live runtime and reconciliation visibility;
- bounded mutation flows through host APIs;
- artifact and session visibility.

### `entangle-cli`

The thinner but serious headless client responsible for:

- validation-oriented offline operations;
- host inspection and mutation for automation and terminal workflows;
- package scaffolding;
- eventual live watch and event consumption.

### Shared packages

- `entangle-types`
  Canonical machine-readable contracts and DTOs.
- `entangle-validator`
  Semantic validation above the shared contracts.
- `entangle-host-client`
  Shared host API client for Studio, CLI, and tests.
- `entangle-package-scaffold`
  Shared scaffolding utilities for new `AgentPackage` trees.

## Current repository state

The repository has already completed the early foundation work.

It now contains:

- the canonical specification corpus;
- shared machine-readable contracts and semantic validation;
- a real local host control plane;
- host-managed runtime identity and external-principal binding;
- host-resolved git principal secret-delivery metadata in runtime context;
- a long-lived runner with real Nostr transport;
- local git-backed artifact materialization;
- Docker-backed runtime lifecycle management;
- a first real Studio and CLI surface over host state;
- a credible lint, test, build, and CI baseline.

The current implementation truth is recorded in
[59-implementation-state-and-delivery-audit.md](59-implementation-state-and-delivery-audit.md).

## Delivery order from the current state

## Phase 1: Remote git collaboration completion

This is the highest-value capability gap still open in the current runtime.

The first two preparation slices are now implemented:

- git transport secret delivery from host-owned secret references;
- deterministic remote repository selection and provisioning policy.

The artifact-record publication-state contract is now also implemented, so the
remaining work in this phase can land on a clean lifecycle model.

The remaining work in this phase is:

- any further git widening beyond the current locator-specific retrieval
  model, especially non-primary target provisioning and replicated fallback
  paths, only when later delivery pressure justifies it.

Acceptance for the phase:

- a runner can publish a git-backed artifact to a named remote git service;
- a second node can retrieve and consume that artifact by reference;
- locator-specific repository targets can be resolved without hidden fallback
  repository assumptions;
- repository-target provisioning policy is enforced for both preexisting and
  service-provisioned repository modes;
- downstream retrieval and handoff policy remains explicit rather than relying
  on hidden fallback repository assumptions;
- publication and retrieval failures are explicit, typed, and persisted.

## Phase 2: Agent-engine deepening

The first provider-backed engine slice is now complete.

Completed in the current repository state:

1. a first real `anthropic` adapter behind the internal engine boundary;
2. provider-agnostic turn execution through the internal engine package;
3. host-resolved model credential delivery into the effective runtime context;
4. live runner entrypoints wired to the real engine path instead of the stub.

Remaining work in this phase:

1. package tool-catalog loading into runner turn assembly, then bounded
   multi-turn execution and internal tool-loop support;
2. richer normalized provider metadata and error reporting;
3. wider memory/context assembly discipline as runtime depth grows.

Acceptance for the phase:

- live runner execution no longer depends on a stub engine;
- provider-native types do not leak into runner contracts;
- the engine path is test-covered and reusable across runner scenarios;
- multi-turn and tool-loop behavior are added without collapsing provider logic
  into the runner.

## Phase 3: Host control-plane completion

Complete the missing host surfaces after the core runtime capabilities are in
place.

Implement in small slices:

1. host event stream;
2. revision inspection and history surfaces;
3. node and edge resource mutation surfaces;
4. restart, degraded, and richer reconciliation semantics.

Acceptance for the phase:

- Studio and CLI can consume live host events;
- host API coverage aligns more closely with the published control-plane spec;
- runtime state changes are inspectable and auditable without reading files by
  hand.

## Phase 4: Studio completion

Deepen Studio only on top of completed host capability, not by adding
client-owned control logic.

Implement in small slices:

1. richer runtime and reconciliation views;
2. artifact and session inspection;
3. bounded package, node, edge, and runtime mutation flows;
4. live event-driven updates via the host event stream.

Acceptance for the phase:

- Studio becomes a real operator surface;
- all mutations still go through the host boundary;
- Studio shows real state instead of inferred or fake state.

## Phase 5: CLI completion

Keep CLI thinner than Studio but operationally serious.

Implement in small slices:

1. fuller host resource coverage;
2. stronger automation-oriented JSON flows;
3. live watch or event-stream consumption where valuable.

Acceptance for the phase:

- a power user can operate the local system headlessly;
- CLI remains a client, not a second control plane.

## Phase 6: Deployment and integration hardening

Finish the local operator profile as a real product-quality environment.

Implement in small slices:

1. stronger Docker-backed end-to-end runtime smoke;
2. richer CI integration coverage across relay, host, runner, and git service;
3. documented operator bootstrap and recovery flows;
4. restart, failure, and degraded-state verification.

Acceptance for the phase:

- the local deployment profile is proven end to end;
- the repository quality bar is enforced by automation, not by hope.

## Non-negotiable rules

### Strong yes

- define and consume contracts before widening behavior;
- keep quality gates strict and boring;
- keep resource binding deployment-scoped instead of hardcoding runtime
  assumptions;
- keep Studio and CLI as clients of the host;
- keep artifacts as durable work products instead of collapsing them into
  message content;
- keep provider integration behind the internal engine boundary;
- keep every slice small enough to audit properly.

### Strong no

- do not widen scope inside a slice;
- do not add UI-owned orchestration logic;
- do not introduce hidden fallback behavior for identity, transport, or git
  selection;
- do not justify canonical shortcuts with hackathon pressure;
- do not let old planning survive once implementation reality contradicts it.

## Definition of done for the first serious product slice

The first serious slice is done when:

- node packages validate;
- graph instances validate;
- host can admit, bind, manage, and observe multiple local nodes;
- runners can exchange signed messages over Nostr using real runtime identities;
- at least one git-backed artifact can be published remotely and retrieved by a
  second node;
- live runner execution uses a real internal engine path rather than a stub;
- Studio can inspect and operate the system through host APIs;
- CLI can operate the same system headlessly;
- the deployment profile is demonstrably reproducible and verifiable.

The quality gates that govern movement between phases remain defined in
[30-quality-gates-and-acceptance-criteria.md](30-quality-gates-and-acceptance-criteria.md).
