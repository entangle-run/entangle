# Entangle

Entangle is a graph-native environment for composing, governing, and running modular AI organizations.

This repository is the active design-and-implementation monorepo for Entangle.
The design corpus remains deliberately deep, but the repository is no longer in
a pre-implementation state: real host, runner, transport, artifact, and local
deployment slices are already in place, and the remaining work is concentrated
in the highest-value runtime capabilities rather than in foundational
architecture discovery.

## Repository Layout

- `apps/`
  User-facing surfaces. The first scaffold includes `studio/` for the visual
  operator experience and `cli/` for thin headless operation.
- `services/`
  Long-running runtime components. The first scaffold includes `host/` and
  `runner/`.
- `packages/`
  Shared internal packages. The first scaffold includes `types/`, `validator/`,
  `host-client/`, `agent-engine/`, and `package-scaffold/`.
- `deploy/`
  Local deployment material such as the first Compose profile and Dockerfiles.
- `resources/`
  External reference repositories and a manifest of the research corpus. This directory holds local clones of the primary systems, protocols, and engines studied while designing Entangle.
- `references/`
  High-detail product, architecture, protocol, runtime, and roadmap documents. These files are the canonical narrative and technical specification corpus for the project.
- `wiki/`
  A project-specific persistent wiki adapted from the LLM Wiki pattern. This is the operational memory for ongoing design, research ingestion, decision capture, and future implementation tracking.

## Project Thesis

Today's mainstream agentic experience is still structurally narrow. A user speaks to one primary orchestrator, which may internally delegate to subagents. That model is useful, but it hides topology, governance, delegation rules, execution ownership, and collaboration substrate.

Entangle generalizes that model into an explicit graph:

- the user is a first-class node;
- every agent is a first-class node;
- edges define permitted relationships, transport rules, and authority structure;
- messages coordinate work;
- artifacts carry work;
- a session activates a runtime subgraph over a static topology.

The system is not just a chat application with agents behind it. It is a graph-native runtime for AI organizations.

## Hackathon Principle

Entangle should not be architecturally simplified for the hackathon. The correct rule is:

> Keep the final architecture. Reduce only the active feature surface and the number of active components.

That means:

- stable types now;
- restricted execution profile for the hackathon;
- no deliberate shortcuts that would invalidate later features such as remote node attachment, richer transport policies, multi-relay operation, or stronger governance.

## Current Status

This repository currently contains:

- a detailed design corpus;
- an operational wiki schema and initial pages;
- a locally materialized reference corpus under `resources/`;
- a concrete implementation stack direction centered on TypeScript, Node 22,
  `pnpm`, Turborepo, `nostr-tools`, `strfry`, `Gitea`, and Docker Compose;
- an initial monorepo scaffold for `apps/`, `services/`, `packages/`, and
  `deploy/`;
- the first machine-readable contract layer in `packages/types`, now extended
  with Entangle A2A payloads and runner-local lifecycle state contracts;
- a stronger validator surface with resource-resolution and transport
  realizability checks;
- a host control-plane surface with persistent catalog, package-source, and
  graph state under `.entangle/host`;
- host-managed external principal records for backend-facing identities such as
  git principals, exposed through the same host boundary and resolved into
  effective runtime context rather than hardcoded into packages;
- runtime materialization under `.entangle/host` for desired bindings,
  runtime intents, observed runtime records, an immutable package store,
  workspaces, and injected runtime context;
- a runtime-backend abstraction with a tested memory backend, a first Docker
  backend driven by a first-party Docker Engine API client, and persisted
  reconciliation snapshots under observed host state;
- host-owned stable per-node Nostr runtime identities with non-secret identity
  context injected into runners and a separate local secret storage profile;
- host-resolved model credential delivery in the effective runtime context,
  so live runner execution now starts only when the bound model secret is
  actually available instead of assuming endpoint presence is sufficient, with
  explicit per-profile auth-mode selection rather than an unsafe implicit
  default and with Anthropic local defaults now correctly resolving to
  header-secret authentication;
- a host client, package scaffold utility, runtime-aware CLI, and Studio
  surface that now consume real host state instead of a fake graph;
- an explicit package-level tool catalog contract through
  `manifest.runtime.toolsPath` and `runtime/tools.json`, with scaffolds and
  validators now treating empty tool catalogs as explicit package state rather
  than inferred absence;
- runtime-context artifact metadata that now carries resolved git principal
  bindings, including secret-delivery availability and mounted-file delivery
  paths for the current local profile;
- deterministic primary git repository-target resolution in runtime context,
  separating HTTP/API service base URLs from SSH/HTTPS remote transport roots
  and carrying explicit provisioning mode hints for the selected git service;
- a runner transport and intake slice with a deterministic in-memory transport,
  a file-backed runner state store, and a long-lived `RunnerService` that
  validates inbound A2A messages, advances session and conversation lifecycle
  state, builds engine turn requests from inbound context, and emits
  `task.result` replies when response policy requires them;
- a first git-backed artifact materialization slice in the runner, where each
  completed turn can persist a structured `ArtifactRecord`, write a durable
  report file into a node-local git workspace, commit it, and attach the
  resulting portable artifact reference to outbound `task.result` messages
  without leaking runtime-local filesystem paths into the protocol-facing
  locator, while now also persisting explicit publication-state metadata that
  distinguishes local-only materialization from remote publication outcomes,
  plus a first remote-publication path for deterministic preexisting
  repositories that persists success or failure without corrupting local
  artifact truth, plus a first downstream retrieval path for published
  git-backed handoffs through a runner-local retrieval cache and typed
  retrieval-state records, now widened to locator-specific repository targets
  with deterministic service-scoped transport-principal selection and
  repository-partitioned retrieval caches, plus host-owned provisioning of
  primary `gitea_api` repository targets with persisted provisioning-state
  records and runtime realizability gated on provisioning success;
- a host read surface for persisted runtime artifacts through
  `GET /v1/runtimes/{nodeId}/artifacts`, plus matching host-client coverage;
- a host-owned session inspection surface through `GET /v1/sessions` and
  `GET /v1/sessions/{sessionId}`, aggregating persisted runner session state
  across the current host runtime set and exposing the same boundary through
  `packages/host-client` and the CLI;
- a widening of the host event surface where `entangle-host` now derives and
  persists `session.updated` plus `runner.turn.updated` events from persisted
  runner session and turn state, with durable deduplication anchored in
  observed host state instead of transient in-memory delivery state;
- a live Nostr transport adapter for the runner that uses NIP-59 gift wrapping,
  a dedicated Entangle rumor kind, relay-readiness preconnect semantics, and a
  verified local relay smoke where a real wrapped message produces persisted
  session, conversation, and turn state;
- a corrected local `strfry` deployment profile with an explicit mounted config
  file instead of an invalid config-less relay command;
- a hardened local Docker image topology with an explicit `.dockerignore`,
  explicit pinned `pnpm` installation inside build stages, a pinned shared
  pnpm store path for cache mounts, and a static Nginx runtime image for
  Studio instead of `vite preview`;
- explicit deploy packaging boundaries for host, runner, CLI, and shared
  packages through `files` allowlists and build outputs that exclude compiled
  test files from runtime payloads;
- verified portable deploy payloads for host and runner built from the real
  `build -> deploy` path used by the service images;
- a quality baseline with ESLint, Vitest, and GitHub Actions CI;
- shared Vitest workspace-source resolution so package-local tests do not
  rely on stale sibling `dist/` outputs;
- shared ESLint test-project resolution through a root `tsconfig.eslint.json`
  so type-aware lint over tests also resolves current workspace sources instead
  of stale sibling `dist/` declarations;
- an explicit TypeScript project graph for the composite packages and Node
  services, with solution-build typechecking at the repository root;
- a verified baseline where `pnpm verify` passes end to end.
- a first real provider-backed `agent-engine` slice with an internal
  Anthropic adapter behind the stable engine boundary, typed error
  normalization, live runner entrypoints wired to the real engine path, and
  tests that exercise request assembly, auth mapping, and provider-failure
  semantics without relying on networked model calls;
- a first bounded internal tool-execution slice where package-declared tool
  catalogs are loaded into runner turn assembly, an Entangle-owned builtin
  tool executor is wired behind the internal engine boundary, and the
  Anthropic adapter now completes `tool_use` / `tool_result` loops without
  leaking provider protocol logic into the runner;
- a bounded builtin-tool widening slice where the runner can now inspect
  bounded memory refs from the current turn through `inspect_memory_ref`, and
  a further bounded runtime-local inspection slice where the runner can now
  inspect current session state through `inspect_session_state`, both without
  widening host surfaces or granting arbitrary filesystem access;
- a first deterministic post-turn memory-maintenance slice where the runner
  now writes task-specific wiki pages, appends structured entries to
  `memory/wiki/log.md`, keeps `memory/wiki/index.md` aligned, and feeds recent
  task memory back into future turn assembly.
- a richer deterministic memory-summary slice where the runner now rebuilds
  `memory/wiki/summaries/recent-work.md` from the freshest task pages and
  includes that summary in future bounded `memoryRefs`.
- a first bounded model-guided memory-synthesis slice where the runner now
  maintains `memory/wiki/summaries/working-context.md` through a strict
  forced tool call while preserving runner ownership of the actual wiki
  write path and keeping synthesis failure additive rather than turn-fatal;
- a session-aware refinement of that working-context synthesis path where the
  model-guided summary now also consumes the same bounded current-session
  snapshot exposed through `inspect_session_state`, giving synthesis a stronger
  view of live session progress without widening the tool catalog or the wiki
  write contract;
- a first bounded engine-turn observability slice where the internal tool loop
  now records structured tool requests plus bounded tool-execution outcomes,
  and normalized engine outcome now persists through runner-turn state into
  host-owned runner activity events;
- a shared runtime-trace consumption slice where Studio and CLI now surface
  that normalized engine outcome through shared `packages/host-client`
  presentation helpers instead of leaving runtime-trace inspection trapped in
  raw host-event JSON;
- a bounded provider-metadata and engine-failure-reporting slice where
  successful turns now preserve normalized provider identity, failed turns now
  persist bounded failure payloads, and successful engine outcomes survive
  later artifact-materialization failures;
- a first typed host-event surface where `entangle-host` now persists and
  normalizes event records, exposes `GET /v1/events` for inspection, streams
  live host events over WebSocket on the same route, and shares that boundary
  through `packages/host-client` for Studio and CLI live consumption;
- a typed graph-revision history surface where `entangle-host` now persists
  canonical revision records, exposes `GET /v1/graph/revisions` and
  `GET /v1/graph/revisions/{revisionId}`, preserves backward compatibility with
  earlier raw graph snapshots, and shares the inspection boundary through
  `packages/host-client` and the CLI;
- a first resource-oriented node surface where `entangle-host` now exposes
  applied non-user node bindings through `GET /v1/nodes` and
  `GET /v1/nodes/{nodeId}`, with shared client and CLI support grounded in the
  host's effective binding model rather than a duplicated UI projection;
- a first resource-oriented managed-node mutation surface where
  `entangle-host` now supports `POST /v1/nodes`, `PATCH /v1/nodes/{nodeId}`,
  and `DELETE /v1/nodes/{nodeId}` on top of graph-as-source-of-truth
  semantics, with explicit `409` conflicts for edge-connected deletes, typed
  `node.binding.updated` host events, and shared host-client plus CLI support;
- a first resource-oriented edge mutation surface where `entangle-host` now
  supports `GET /v1/edges`, `POST /v1/edges`, `PATCH /v1/edges/{edgeId}`, and
  `DELETE /v1/edges/{edgeId}` on top of the same graph-as-source-of-truth
  apply path, with typed `edge.updated` control-plane events, shared
  host-client plus CLI support, and explicit separation between `400`
  validation failures and `404`/`409` resource conflicts;
- a first-class runtime restart surface where `entangle-host` now supports
  `POST /v1/runtimes/{nodeId}/restart`, persists monotonic restart
  generations in runtime intents, emits typed `runtime.restart.requested`
  host events, and forces deterministic Docker runtime recreation when the
  restart generation changes even if the runtime context is otherwise stable;
- richer reconciliation and degraded-state semantics where runtime inspection
  now carries derived reconciliation state and finding codes, persisted host
  reconciliation snapshots distinguish blocked, transitioning, and degraded
  runtimes, and `GET /v1/host/status` no longer reduces runtime health to raw
  failure counts alone;
- a host-owned runtime recovery-history surface where `entangle-host` now
  exposes `GET /v1/runtimes/{nodeId}/recovery`, persists per-node recovery
  records under observed host state, deduplicates unchanged states with
  canonicalized recovery fingerprints, and serializes reconciliation reads so
  recovery inspection does not create duplicate history under rapid successive
  calls;
- an explicit host-owned runtime recovery-policy slice where `entangle-host`
  now persists desired recovery policy records, observed recovery-controller
  state, exposes `PUT /v1/runtimes/{nodeId}/recovery-policy`, and can perform
  bounded automatic `restart_on_failure` recovery with stable failure-series
  accounting instead of retrying blindly on every reconciliation;
- a widening of the host recovery event surface where `entangle-host` now
  emits durable `runtime.recovery.recorded` and
  `runtime.recovery_controller.updated` events from the same host-owned
  recovery history and controller records exposed through runtime recovery
  inspection, while suppressing trivial idle-bootstrap noise;
- a first serious runtime-recovery inspection slice across the shared clients,
  where `packages/host-client` now owns reusable host-event filtering helpers,
  `entangle-cli` supports `host events list` plus `host events watch` with
  recovery-oriented filtering, and Studio consumes the live host event stream
  to inspect runtime recovery policy, controller state, recovery history, and
  live recovery events without introducing a client-owned recovery model;
- a broader host-owned trace-event slice where `entangle-host` now derives
  and persists `conversation.trace.event`, `approval.trace.event`, and
  `artifact.trace.event` from persisted runner state using the same
  deduplicated observed-state model already used for session and runner-turn
  activity;
- a deeper Studio runtime-inspection slice where the selected-runtime panel now
  surfaces reconciliation state, finding codes, backend/context readiness,
  restart generation, and a live runtime-trace panel over host-owned session,
  conversation, approval, artifact, and runner-turn events without widening
  the host API or inventing client-side trace logic;
- a first bounded Studio runtime-lifecycle mutation slice where the selected
  runtime can now be started, stopped, and restarted strictly through the
  existing host lifecycle surfaces instead of through client-owned state;
- a deeper Studio runtime-artifact inspection slice where the selected-runtime
  surface now exposes persisted artifact records from the host read model,
  including deterministic sorting, lifecycle/publication/retrieval summaries,
  and backend-aware locator summaries, while selected-runtime refresh now
  degrades partially under sub-read failures instead of failing wholesale;
- a deeper Studio runtime-session inspection slice where the selected-runtime
  surface now exposes host-backed session summaries relevant to that runtime,
  including per-node session status and trace ids;
- the first bounded Studio graph-mutation slice where operators can now select,
  create, replace, and delete graph edges through host-owned edge resource
  routes instead of keeping Studio read-only on topology;
- the next bounded Studio mutation slice where operators can now create,
  replace, and delete managed nodes through host-owned node resource routes
  while binding them to admitted package sources from Studio itself;
- the next bounded Studio mutation slice where operators can now admit package
  sources directly through host-owned `local_path` / `local_archive` package
  admission flows and inspect the current admitted inventory without leaving
  the graph editor surface;
- the next bounded Studio completion slice where the operator surface now uses
  the existing host event stream to coalesce live overview and selected-runtime
  refresh instead of depending only on explicit reload loops after mutations;
- the next bounded CLI parity slice where headless operators can now inspect
  one admitted package source and admit canonical `local_path` or
  `local_archive` sources with optional explicit package-source ids instead of
  relying on a directory-only shortcut;
- the next bounded CLI parity slice where headless operators can now inspect
  persisted runtime artifacts through the existing host artifact surface and
  apply deterministic local filters over backend, kind, lifecycle,
  publication, and retrieval state;
- the next bounded Studio completion slice where the operator can now select
  one runtime-scoped session summary and inspect host-backed per-node session
  detail without widening the host API or inventing client-owned session
  state;
- the next bounded CLI completion slice where the main host-facing mutation
  commands now support `--dry-run`, printing canonical mutation payloads or
  intents without mutating the host;
- the next bounded runtime-deepening slice where the builtin tool surface now
  includes deterministic bounded current-session inspection over runner-local
  session, conversation, turn, and related artifact state through
  `inspect_session_state`, without widening the host or filesystem boundary;
- the next bounded runtime-deepening slice where runner-owned memory
  maintenance now rebuilds a derived recent-work summary page from canonical
  task pages and feeds it back into future turn assembly;

The highest-value remaining gaps are:

- richer model-guided memory maintenance on top of the now stronger
  session-aware bounded runtime inspection surface;
- advanced git widening beyond the current locator-specific handoff model,
  especially non-primary target provisioning and replicated fallback paths;
- stronger end-to-end deployment and integration hardening.

The repository should be treated as a live design baseline rather than as a static document dump. Each substantial interaction with the project should begin with a lightweight audit loop:

- reread the current project state;
- check for stale status statements, drift between documents, and quality regressions in code or tooling;
- update durable project memory when the state changes.
