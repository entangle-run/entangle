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

- a broad builtin tool surface inside the internal runtime execution path;
- broader semantic memory maintenance beyond the current bounded focused
  register set, explicit lifecycle reconciliation, and carry/staleness
  signaling baseline;
- fuller Studio and CLI depth only where later operator workflows expose real
  blind spots rather than surface-area vanity;
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
  surfaces, especially narrower diagnostics-oriented event payloads plus deeper
  reconciliation inspection;
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
- host-owned session summary and session-detail inspection backed by persisted
  runner session state;
- typed host-event persistence, HTTP event listing, and live WebSocket event
  streaming through the same host boundary;
- richer reconciliation semantics with per-runtime derived reconciliation
  summaries, persisted blocked/degraded/transitioning counts, and host status
  derived from those findings instead of from raw failure counts alone;
- host-owned runtime recovery-history inspection with durable per-node
  recovery records, canonicalized fingerprint-based deduplication, and a
  stable `GET /v1/runtimes/{nodeId}/recovery` read boundary;
- explicit host-owned runtime recovery policy records, recovery-controller
  state, and bounded automatic restart-on-failure behavior exposed through the
  same runtime recovery surface plus `PUT /v1/runtimes/{nodeId}/recovery-policy`;
- typed recovery-policy, recovery-attempt, recovery-exhaustion,
  recovery-recorded, and recovery-controller-updated host events exposed
  through the same persisted event boundary and WebSocket stream;
- typed conversation, approval, and artifact trace events derived from the
  persisted runner state through the same host-owned event boundary;
- host-managed runtime identity persistence;
- runtime materialization and reconciliation snapshot persistence;
- runtime backend abstraction with memory and Docker-backed implementations;
- first-party Docker Engine API integration instead of `docker` CLI shell-outs;
- host-resolved model-secret delivery in the effective runtime context, with
  runtime realizability now gated on bound model credential availability.

### Still missing or incomplete

- narrower diagnostics-oriented event classes beyond the now-implemented trace
  surface, especially where later operator workflows justify them.

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
  inspection behavior, now widened to include bounded memory-ref inspection
  over the current turn's `memoryRefs` plus bounded current-session state
  inspection over runner-local session records;
- a first deterministic post-turn memory maintenance slice in the runner,
  including task-page creation plus wiki log/index maintenance;
- a richer deterministic summary layer where runner-owned memory maintenance
  now rebuilds `memory/wiki/summaries/recent-work.md` from the freshest task
  pages and feeds that summary back into future turn assembly;
- a first bounded model-guided memory-synthesis layer where the runner now
  maintains `memory/wiki/summaries/working-context.md` through a strict
  structured tool call while preserving runner ownership of the actual wiki
  write path and keeping synthesis failure additive rather than turn-fatal;
- a session-aware refinement of that working-context synthesis path where the
  model-guided summary now also consumes the same bounded current-session
  snapshot exposed through `inspect_session_state`, rather than duplicating or
  omitting runner-local session progress;
- an artifact-aware refinement of that same synthesis path where the runner
  now passes explicit retrieved and produced artifact context into memory
  synthesis instead of leaving work-product visibility trapped in the main
  task-execution path;
- an artifact-context carry-forward refinement of that same synthesis path
  where the durable `working-context.md` page now preserves deterministic
  consumed/produced artifact context plus bounded model-guided artifact
  insights instead of leaving artifact awareness trapped in request-time
  context alone;
- an engine-outcome-aware refinement of that same synthesis path where the
  bounded synthesis prompt now carries the just-completed turn's normalized
  engine outcome instead of relying on assistant text and coarse stop reason
  alone;
- an execution-insight carry-forward refinement of that same synthesis path
  where the durable `working-context.md` page now preserves bounded execution
  insights instead of leaving current-turn execution awareness trapped in
  prompt-time context alone;
- an execution-aware deterministic memory-baseline refinement where
  runner-owned task pages and the derived recent-work summary now preserve
  richer normalized execution detail before any model-guided synthesis
  widening is applied;
- a final-state session-context refinement of that same synthesis path where
  optional working-context synthesis now runs against final post-turn
  conversation/session state and the durable `working-context.md` page now
  preserves bounded session-context signals instead of leaving session
  awareness trapped in prompt-time context alone;
- a memory-synthesis observability refinement where optional synthesis now
  persists a canonical bounded outcome on `RunnerTurnRecord` and that same
  outcome now surfaces through host-owned runner activity and runtime-trace
  inspection instead of remaining trapped in wiki logs alone;
- a focused memory-summary-register widening where the same bounded
  model-guided synthesis pass now updates `working-context.md`,
  `stable-facts.md`, and `open-questions.md`, with future turns consuming the
  focused summary set directly through canonical `memoryRefs` instead of
  relying on one omnibus derived page alone;
- a decision-register refinement where that same bounded synthesis pass now
  updates `decisions.md`, the durable `working-context.md` page now preserves
  bounded decision carry-forward, and future turns can consume prior decisions
  directly instead of inferring them only from broader summary prose;
- a next-actions register refinement where that same bounded synthesis pass
  now updates `next-actions.md`, open questions no longer act as the only
  focused pending-work surface, and future turns can consume durable next
  actions directly instead of inferring them only from `working-context.md`
  or the mixed open-questions page;
- a resolutions-register refinement where that same bounded synthesis pass now
  updates `resolutions.md`, recent closures no longer disappear implicitly
  from focused memory, and future turns can consume durable resolved
  questions and completed actions directly instead of inferring closure only
  from rewritten prose;
- a focused-register lifecycle-discipline refinement where that same bounded
  synthesis pass now sees the current
  open-questions/next-actions/resolutions baseline explicitly and
  runner-owned reconciliation removes exact resolved overlaps from active
  registers instead of letting closure drift survive as silent duplication;
- a focused-register aging-signals refinement where the runner now persists a
  separate carry-state file for the focused registers and feeds bounded
  stale-review hints back into synthesis for repeatedly carried active items,
  without polluting the durable wiki pages with noisy lifecycle metadata;
- a first bounded engine-turn observability layer where the internal tool loop
  now records structured tool requests plus bounded tool-execution outcomes,
  and normalized engine outcome now persists through runner-turn state,
  observed runner activity, and durable host `runner.turn.updated` events;
- a first shared operator-facing runtime-trace consumption slice where
  `packages/host-client` now owns bounded runtime-trace labels and detail-line
  generation, Studio renders those shared trace details in the selected-runtime
  panel, and the CLI can filter to runtime-trace events plus print structured
  trace summaries without inventing a separate event model.
- a bounded provider-metadata and failure-reporting slice where successful
  turns now preserve normalized provider identity, failed turns now persist
  bounded engine failure payloads, and successful engine outcomes remain
  durable even when later artifact materialization fails.
- typed provider-error normalization and isolated engine tests that do not
  require live model calls.

### Still missing or incomplete

- richer model-guided memory maintenance beyond the current deterministic task
  page, log/index, derived recent-work summary, session-aware plus
  artifact-aware/artifact-carrying/engine-outcome-aware/execution-insight-carrying
  working-context summary, focused
  decisions/stable-facts/open-questions/next-actions/resolutions summary
  registers with explicit baseline continuity and exact closure
  reconciliation, and bounded current-session inspection baseline;
- later provider widening only where new adapters or delivery modes introduce a
  real canonical contract need.

### Assessment

This boundary is now real. The remaining work is depth and widening, not first
delivery.

### 7. Studio

### Implemented

- real host-backed graph and runtime status surface;
- host-backed topology rendering instead of a fake demo graph;
- shared host-client support for typed event listing and WebSocket event
  subscription;
- recovery-focused runtime selection, policy/controller inspection, recovery
  history inspection, and live recovery-event inspection on top of host-owned
  runtime recovery reads and events;
- richer selected-runtime inspection over reconciliation state, finding codes,
  backend/context readiness, restart generation, and a live runtime-trace view
  on top of host-owned session, conversation, approval, artifact, and
  runner-turn events;
- a first bounded runtime lifecycle mutation flow where Studio now starts,
  stops, and restarts the selected runtime strictly through existing host
  lifecycle surfaces;
- runtime artifact inspection on top of the existing host runtime-artifact read
  model, with selected-runtime refresh now degrading partially instead of
  failing wholesale when one selected-runtime sub-read fails;
- runtime session inspection on top of the existing host session read model,
  with selected-runtime refresh now also carrying filtered host session
  summaries for the selected runtime;
- deeper Studio session drilldown on top of the existing host session read
  model, where one runtime-scoped session summary can now be selected and
  expanded into host-backed per-node session/runtime detail without widening
  the host API;
- bounded Studio graph edge mutation on top of the host-owned edge resource
  surface, including live edge selection plus create/replace/delete flows;
- bounded Studio managed-node mutation on top of the host-owned managed-node
  surface, including package-source-backed node editing and preservation of
  hidden bindings on replace;
- bounded Studio package-source admission on top of the existing host-owned
  package-source surface, including canonical `local_path` /
  `local_archive` request assembly plus partial-failure-aware package-source
  inventory loading;
- coalesced live Studio refresh on top of the existing host event stream, so
  overview and selected-runtime reads now react to host-owned control-plane,
  runtime, recovery, session, and artifact events without relying on polling
  or reconnecting the event stream on runtime selection changes;
- access to a broader typed trace surface that now includes conversations,
  approvals, artifacts, sessions, runner turns, and runtime recovery events;
- bounded shared runtime-trace detail presentation over host-owned
  `engineOutcome`, so the selected-runtime trace panel now shows normalized
  provider identity, stop reason, provider stop reason, token usage, bounded
  failure payloads, and bounded tool-execution summaries instead of only raw
  event messages.

### Still missing or incomplete

- further operator workflow completion only where later host capability growth
  creates a real blind spot.

### Assessment

Studio is now a credible operator surface. The remaining work is depth and
workflow completeness, not missing mutation or liveness foundations.

### 8. CLI

### Implemented

- offline validation;
- package scaffolding;
- host status, catalog, package-source, graph, external-principal, and runtime
  inspection and basic mutation commands;
- package-source detail inspection plus canonical package admission for both
  `local_path` and `local_archive`, including optional explicit
  package-source ids in the CLI layer;
- runtime artifact inspection parity through the existing host artifact read
  surface, including deterministic local filtering over artifact backend,
  kind, lifecycle, publication, and retrieval state;
- dry-run previews for the main host-facing mutation commands, including
  package-source admission, graph apply, node and edge mutation, external
  principal upsert, runtime recovery-policy mutation, and runtime lifecycle
  intents;
- typed host-event listing and live watch commands, including recovery-focused
  filtering over the shared host event boundary and the new trace-oriented
  conversation, approval, and artifact event classes;
- runtime-trace-only event filtering plus structured runtime-trace summary
  output over the existing host event list/watch flows.

### Still missing or incomplete

- fuller coverage of the remaining high-value resource workflows only where
  later headless needs justify them;
- stronger automation-oriented ergonomics around live operations where they
  add real operator leverage.

### Assessment

CLI is already useful and correctly thin. It no longer needs immediate
priority widening.

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

1. deepen the internal `agent-engine`, especially around richer
   operator-facing consumption of the now-implemented tool-execution and
   engine-outcome surface, broader provider/runtime metadata, and any later
   model-guided runtime/memory deepening that builds on the now stronger
   bounded builtin tool surface;
2. harden end-to-end deployment, restart, and integration coverage;
3. widen headless operational ergonomics only where later delivery justifies
   more CLI depth;
4. widen git collaboration only where later delivery needs justify going beyond
   the current locator-specific retrieval and primary-target provisioning model.

This ordering preserves the best current properties of the repository:

- it closes the remaining high-value headless operational gaps before more UI
  widening;
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
