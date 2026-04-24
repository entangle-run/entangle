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

- a broad builtin tool surface and richer model-guided memory maintenance
  inside the internal runtime execution path;
- full resource-oriented host mutation coverage for nodes and edges;
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
- canonical host-event DTOs for persisted inspection and WebSocket streaming;
- canonical graph-revision DTOs for active revision records, revision history
  metadata, and revision inspection responses;
- canonical node-inspection DTOs for applied non-user bindings and their paired
  runtime summaries;
- explicit package-level tool catalog contracts with manifest-owned
  `runtime.toolsPath` and structured `runtime/tools.json` documents;
- semantic validation in `packages/validator` for graph-resource consistency,
  realizable transport overlap, package-source binding, principal resolution,
  and runtime-context-related constraints;
- host and runner code consuming shared contracts rather than defining local
  shadow shapes.

### Still missing or incomplete

- fuller host API DTO coverage for the remaining control-plane resource
  surfaces, especially richer event-stream payloads and deeper reconciliation
  inspection;
- richer engine/tool-execution observability contracts once tool activity is
  surfaced more explicitly through host and Studio.

### Assessment

This layer is strong and directionally correct. It is not a blocker.

### 2. Host control plane

### Implemented

- persistent host desired and observed state under `.entangle/host`;
- catalog apply and validation;
- package-source admission and inspection;
- external-principal persistence and inspection;
- graph apply, inspection, and validation;
- graph revision-history listing and revision-detail inspection;
- applied non-user node binding listing and node-detail inspection;
- resource-oriented managed-node creation, full replacement, and deletion
  through the host API, including typed `node.binding.updated` control-plane
  events;
- resource-oriented edge listing plus creation, full replacement, and deletion
  through the host API, including typed `edge.updated` control-plane events;
- runtime inspection, start, stop, deterministic restart, context inspection,
  and artifact inspection;
- typed host-event persistence, HTTP event listing, and live WebSocket event
  streaming through the same host boundary;
- host-managed runtime identity persistence;
- runtime materialization and reconciliation snapshot persistence;
- runtime backend abstraction with memory and Docker-backed implementations;
- first-party Docker Engine API integration instead of `docker` CLI shell-outs;
- host-resolved model-secret delivery in the effective runtime context, with
  runtime realizability now gated on bound model credential availability.

### Still missing or incomplete

- session-level and richer runner-originated event classes on top of the new
  host event surface;
- richer reconciliation diagnostics and restart policies;
- stronger degraded-state and recovery inspection surfaces.

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
- host-provided effective runtime context consumption;
- live runner entrypoints wired to the real internal engine boundary instead of
  the stub path;
- deterministic post-turn wiki maintenance that writes task pages, appends to
  `memory/wiki/log.md`, keeps `memory/wiki/index.md` aligned, and feeds recent
  task memory back into future turn assembly.

### Still missing or incomplete

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
- deterministic primary remote repository target resolution from git service
  profiles, namespace hints, and graph identity;
- explicit artifact publication-state metadata separating local materialization
  from remote publication outcome;
- remote publication to deterministic preexisting repositories, with persisted
  success and failure semantics on artifact records;
- downstream retrieval of published git artifacts from the receiving runtime's
  effective runtime context, with persisted retrieval-state records,
  locator-specific repository-target resolution, deterministic service-scoped
  transport-principal selection, repository-partitioned retrieval caches, and
  local engine artifact inputs;
- host-owned provisioning of primary repository targets whose selected git
  service declares `gitea_api`, with persisted provisioning-state records and
  runtime realizability gated on provisioning success;
- host inspection surface for runtime artifacts.

### Still missing or incomplete

- advanced git widening beyond the current locator-specific retrieval model,
  especially non-primary target provisioning and replicated fallback paths;
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
- effective runtime resolution of git principals and primary-principal hints;
- resolved git secret-delivery metadata for bound git principals in runtime
  context.

### Still missing or incomplete

- broader secret-delivery backends and lifecycle handling beyond the current
  mounted-file local profile.

### Assessment

The conceptual boundary is correct. The missing work is operational delivery,
not modeling.

### 6. Agent engine

### Implemented

- first-party internal engine boundary in `packages/agent-engine`;
- provider-agnostic turn contracts;
- a first real `anthropic` adapter using the official Anthropic TypeScript SDK
  behind the stable internal engine boundary;
- resolved model-auth delivery consumed at runtime instead of assuming ambient
  process configuration;
- one-turn provider-backed execution with normalized usage and stop-reason
  mapping;
- package-tool-catalog loading into runner turn assembly and a bounded internal
  Anthropic tool loop driven by `tool_use` / `tool_result` exchanges through an
  Entangle-owned tool-executor boundary;
- a first builtin runner-side tool executor with deterministic artifact-input
  inspection behavior;
- a first deterministic post-turn memory maintenance slice in the runner,
  including task-page creation plus wiki log/index maintenance;
- typed provider-error normalization and isolated engine tests that do not
  require live model calls.

### Still missing or incomplete

- a broader builtin tool surface beyond the first artifact-inspection path;
- richer model-guided memory maintenance beyond the current deterministic task
  page and log/index baseline;
- richer provider metadata and broader error surfacing through the runner.

### Assessment

This boundary is now real. The remaining work is depth and widening, not first
delivery.

### 7. Studio

### Implemented

- real host-backed graph and runtime status surface;
- host-backed topology rendering instead of a fake demo graph;
- shared host-client support for typed event listing and WebSocket event
  subscription, ready for Studio consumption.

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

1. widen the internal `agent-engine` beyond the first bounded tool loop,
   especially around builtin tool surface depth and richer model-guided memory
   updates;
2. complete the remaining core host resource surfaces and widen host events to
   deeper session-level runtime activity;
3. deepen Studio into a real operator surface on top of those host capabilities;
4. complete CLI parity for the core host workflows;
5. harden end-to-end deployment, restart, and integration coverage;
6. widen git collaboration only where later delivery needs justify going beyond
   the current locator-specific retrieval and primary-target provisioning model.

This ordering preserves the best current properties of the repository:

- it closes the core collaboration substrate before UI polish;
- it keeps engine/provider logic behind the existing internal boundary;
- it finishes control-plane completeness before broadening client complexity;
- it keeps deployment hardening as a real finalization phase rather than a
  premature distraction.

The git secret-delivery, repository-target-resolution, publication-state,
preexisting-repository publication, locator-specific retrieval, host-owned
`gitea_api` provisioning, first real provider-backed engine, first bounded
tool-loop, deterministic post-turn memory, and first host-event-surface slices
are now complete for the current local operator profile, so the next best
capability move is controlled runtime deepening and host-surface completion
rather than another foundational rewrite.

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
