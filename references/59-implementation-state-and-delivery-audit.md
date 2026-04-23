# Implementation State and Delivery Audit

This document is the current implementation-truth audit for Entangle.

It supersedes the practical role previously played by
[40-pre-implementation-audit.md](40-pre-implementation-audit.md), which should
now be read as a historical milestone rather than as the current state report.

Its purpose is to answer four questions with the repository as it exists today:

1. What is already implemented?
2. What is only specified?
3. Where do specification and implementation still drift?
4. What is the best next implementation order from the current codebase?

## Audit scope

This audit reviewed:

- root project documents and the current `README.md`;
- the canonical `references/` corpus, with special attention to implementation
  and runtime slices;
- the operational `wiki/` state;
- the live code in `apps/`, `services/`, `packages/`, and `deploy/`;
- the current route surface of `entangle-host`;
- the current runtime behavior of `entangle-runner`;
- the current quality baseline, tests, and CI posture.

## Current phase statement

Entangle is no longer in a pre-implementation or control-plane-only phase.

The repository is now in a **partial end-to-end runtime implementation phase**.

That means the current system already includes:

- a real local control plane;
- durable desired and observed host state;
- a long-lived per-node runner;
- real Nostr transport over a local relay profile;
- local git-backed artifact materialization;
- Docker-backed runner lifecycle management;
- CLI and Studio surfaces consuming the host boundary;
- machine-enforced quality gates and CI.

The repository does **not** yet include:

- remote git publication and retrieval between nodes;
- a real model-backed internal `agent-engine`;
- host event streaming;
- full resource-oriented host mutation coverage for nodes, edges, and revision
  history;
- Studio as a complete operator surface;
- CLI parity with all core host workflows;
- end-to-end deployment hardening for the full local product profile.

## High-confidence conclusions

The main architectural decisions still hold.

The repository does **not** currently show signs that a foundational redesign
is needed. The highest current risk is **delivery drift**, not architectural
misdirection.

The most important stable conclusions remain:

- `entangle-host` is the correct control-plane boundary;
- `entangle-runner` is the correct per-node execution boundary;
- `Studio` and `CLI` should remain clients of the host;
- `packages/types` should remain the source of canonical machine-readable
  contracts;
- `packages/validator` should remain the semantic validation layer;
- Nostr should remain the signed coordination layer;
- git should remain the first serious collaboration substrate for artifacts;
- runtime resource binding should remain host-resolved, not runner-inferred;
- the project should continue as one monorepo with explicit internal package
  boundaries.

## Subsystem reality check

### 1. Contracts and validation

### Implemented

- canonical `zod` contracts in `packages/types` for graph, catalog, runtime
  context, A2A payloads, artifact records, external principals, host DTOs, and
  runner-local state;
- semantic validation in `packages/validator` for graph-resource consistency,
  realizable transport overlap, package-source binding, principal resolution,
  and runtime-context-related constraints;
- host and runner code consuming shared contracts rather than defining local
  shadow shapes.

### Still missing or incomplete

- event-stream DTOs for the future host event surface;
- fuller host API DTO coverage for node/edge resource mutation and revision
  history surfaces not yet implemented;
- remote git publication and retrieval record contracts beyond the current
  local `materialized` artifact posture.

### Assessment

This layer is strong and directionally correct. It is not a blocker.

### 2. Host control plane

### Implemented

- persistent host desired and observed state under `.entangle/host`;
- catalog apply and validation;
- package-source admission and inspection;
- external-principal persistence and inspection;
- graph apply, inspection, and validation;
- runtime inspection, start, stop, context inspection, and artifact inspection;
- host-managed runtime identity persistence;
- runtime materialization and reconciliation snapshot persistence;
- runtime backend abstraction with memory and Docker-backed implementations;
- first-party Docker Engine API integration instead of `docker` CLI shell-outs.

### Still missing or incomplete

- resource-oriented node mutation surfaces;
- resource-oriented edge mutation surfaces;
- graph revision history inspection APIs;
- runtime restart surface;
- host event stream for reconciliation, runtime, and session activity;
- richer reconciliation diagnostics and restart policies.

### Assessment

The host is already real and well-structured. The remaining work is completion
and widening, not rethinking the boundary.

### 3. Runner lifecycle and transport

### Implemented

- long-lived `RunnerService`;
- deterministic transport abstraction plus real NIP-59-backed Nostr transport;
- startup relay-readiness handling;
- runner-local persistence for session, conversation, approval, turn, and
  artifact records;
- durable lifecycle transitions;
- response-policy-aware reply behavior;
- host-provided effective runtime context consumption.

### Still missing or incomplete

- real engine-backed execution in live runtime paths;
- richer runtime restart and recovery behavior;
- broader multi-node live-flow coverage;
- more explicit upward surfacing of runtime events.

### Assessment

The runner is beyond bootstrap. Its biggest remaining gap is the engine and
artifact-collaboration depth, not the runner boundary itself.

### 4. Artifact backend and git collaboration

### Implemented

- structured portable `ArtifactRef` and persisted `ArtifactRecord` contracts;
- first git-backed local artifact backend;
- node-local git repository initialization and commit provenance;
- report-file artifact materialization per turn;
- artifact linkage into runner-local session, conversation, and turn state;
- host inspection surface for runtime artifacts.

### Still missing or incomplete

- git transport secret delivery;
- remote repository selection and provisioning policy;
- remote push semantics;
- remote retrieval semantics;
- cross-node handoff validation against named git services;
- richer artifact kinds beyond the first report-file slice.

### Assessment

This is one of the most important remaining capability gaps. The current local
artifact model is strong enough to extend without redesign.

### 5. Identity, secrets, and external principals

### Implemented

- host-owned stable per-node Nostr runtime identities;
- separated secret and non-secret identity context;
- host-managed external principals for git-facing identities;
- graph-local binding of principals by reference;
- effective runtime resolution of git principals and primary-principal hints.

### Still missing or incomplete

- secret delivery and materialization for git transport credentials;
- tighter integration of external principal records with remote git publication
  flows.

### Assessment

The conceptual boundary is correct. The missing work is operational delivery,
not modeling.

### 6. Agent engine

### Implemented

- first-party internal engine boundary in `packages/agent-engine`;
- provider-agnostic turn contracts;
- stub engine used to keep the runner contract stable while runtime and
  transport matured.

### Still missing or incomplete

- a real provider adapter, with `anthropic` the intended first canonical
  adapter;
- multi-turn execution;
- tool loop execution;
- normalized real usage and stop-reason reporting.

### Assessment

This is the second major remaining capability gap after remote git
collaboration.

### 7. Studio

### Implemented

- real host-backed graph and runtime status surface;
- host-backed topology rendering instead of a fake demo graph.

### Still missing or incomplete

- live event consumption;
- richer runtime, reconciliation, and artifact visibility;
- bounded mutation flows for package admission, node and edge editing, and
  runtime lifecycle operations.

### Assessment

Studio is correctly positioned, but still shallow compared to the intended
operator experience.

### 8. CLI

### Implemented

- offline validation;
- package scaffolding;
- host status, catalog, package-source, graph, external-principal, and runtime
  inspection and basic mutation commands.

### Still missing or incomplete

- fuller coverage of resource mutation workflows;
- watch or stream consumption;
- stronger automation-oriented ergonomics around live operations.

### Assessment

CLI is already useful and correctly thin. It needs completeness, not a
different philosophy.

### 9. Deployment, quality, and operations

### Implemented

- Node 22 + `pnpm` + Turborepo monorepo baseline;
- TypeScript project references for the composite packages and services;
- pinned multi-stage Docker builds for host and runner;
- static Nginx-based Studio runtime image;
- local `strfry` profile and local `Gitea` profile in Compose;
- ESLint, Vitest, GitHub Actions CI, and repository-wide `pnpm verify`;
- package-local Vitest source aliasing to avoid stale sibling build artifacts.

### Still missing or incomplete

- stronger end-to-end CI coverage across relay, host, runner, and git service;
- richer Docker-backed runtime smoke coverage around restart and artifact-aware
  multi-node flows;
- fully documented local operator bootstrap for the complete product profile.

### Assessment

This layer is ahead of a normal prototype. The remaining work is integration
hardening, not baseline quality setup.

## Drift corrected by this audit batch

This audit specifically corrects planning drift in the canonical project
surface:

- the repository is no longer described as being merely at the start of
  implementation;
- `entangle-runner` is no longer described as only executing a single bootstrap
  turn;
- the `40-pre-implementation-audit` document is now historical rather than the
  current phase report;
- the implementation strategy is no longer modeled as an early step-by-step
  scaffold list, but as a rolling slice-based delivery plan from the current
  repository state.

## Recommended next implementation order

The current best delivery order is:

1. complete git transport secret delivery and remote git publication/retrieval;
2. replace the stub engine with the first real model-backed `agent-engine`
   adapter;
3. complete host event streaming and the remaining core host resource surfaces;
4. deepen Studio into a real operator surface on top of those host capabilities;
5. complete CLI parity for the core host workflows;
6. harden end-to-end deployment, restart, and integration coverage.

This ordering preserves the best current properties of the repository:

- it closes the core collaboration substrate before UI polish;
- it keeps engine/provider logic behind the existing internal boundary;
- it finishes control-plane completeness before broadening client complexity;
- it keeps deployment hardening as a real finalization phase rather than a
  premature distraction.

## What should not happen next

The repository should not widen into:

- marketplace or payment work;
- remote multi-host orchestration;
- advanced trust or reputation systems;
- agent-owned topology mutation;
- speculative UI polish disconnected from host capability growth.

Those remain outside the best current delivery path.

## Final assessment

Entangle is now in a healthy but incomplete implementation state:

- the architecture is sound;
- the contracts are strong;
- the host and runner are real;
- the quality baseline is credible;
- the remaining work is now concentrated in a few high-value capability gaps.

The repository is ready to continue implementation without resetting the model.
The correct move from here is disciplined completion, not architectural churn.
