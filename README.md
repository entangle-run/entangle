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
- an explicit TypeScript project graph for the composite packages and Node
  services, with solution-build typechecking at the repository root;
- a verified baseline where `pnpm verify` passes end to end.
- a first real provider-backed `agent-engine` slice with an internal
  Anthropic adapter behind the stable engine boundary, typed error
  normalization, live runner entrypoints wired to the real engine path, and
  tests that exercise request assembly, auth mapping, and provider-failure
  semantics without relying on networked model calls.

The highest-value remaining gaps are:

- multi-turn and tool-loop depth inside the internal `agent-engine`;
- advanced git widening beyond the current locator-specific handoff model,
  especially non-primary target provisioning and replicated fallback paths;
- host event streaming and fuller host resource surfaces;
- deeper Studio runtime and operator workflows;
- stronger end-to-end deployment and integration hardening.

The repository should be treated as a live design baseline rather than as a static document dump. Each substantial interaction with the project should begin with a lightweight audit loop:

- reread the current project state;
- check for stale status statements, drift between documents, and quality regressions in code or tooling;
- update durable project memory when the state changes.
