# Entangle Wiki Overview

## What this wiki is for

This wiki is the project memory for Entangle.

It is not a personal notebook and not a generic documentation dump. It should track:

- what Entangle is;
- what has been decided;
- why it was decided;
- what remains unresolved;
- which external systems matter;
- which references should shape implementation.

## Current project state

Entangle is currently in a partial end-to-end runtime implementation phase.

The corpus now extends from conceptual architecture into normative contracts,
package and binding structure, edge semantics, artifact backends, control-plane
rules, compatibility policy, observability, Studio responsibilities, host API
contracts, effective runtime context, engine-adapter boundaries, and a concrete
local deployment profile.

The local reference corpus is materialized under `resources/`, and the
implementation stack direction has now been narrowed toward a canonical
TypeScript + Node 22 + pnpm + Turborepo toolchain around `nostr-tools`,
`strfry`, `Gitea`, Docker Compose, `entangle-host`, and host-managed runners.

The previously remaining pre-implementation decisions have now also been
closed:

- the node execution core should live in a first-party internal
  `agent-engine` package rather than inside a wholesale upstream runtime fork;
- live local host state should live under a disciplined `.entangle/` runtime
  root with explicit desired, observed, trace, import, and workspace
  partitions;
- the hackathon should include a thin but real CLI plus package scaffolding,
  while Studio remains the richer operator surface.

The repository is therefore no longer best described as "entering
implementation" or as being in a control-plane-only stage.

The most accurate current description is:

- the architecture and contract layers are strong and largely stable;
- the host and runner are already real local runtime components;
- the remaining work is concentrated in a few major capability gaps rather
  than in foundational uncertainty.

The contract-ownership layer is now also explicit:

- `packages/types` should own the primary `zod` schemas and host API DTO
  contracts;
- `packages/validator` should own semantic validation on top of those schemas;
- generated artifacts such as JSON Schema should remain derivative, not primary.

The repository now also contains the first real implementation baseline:

- a `pnpm` + Turborepo monorepo scaffold;
- `apps/studio` and `apps/cli`;
- `services/host` and `services/runner`;
- `packages/types`, `validator`, `host-client`, `agent-engine`, and
  `package-scaffold`;
- a first local Compose profile and service Dockerfiles;
- a persistent local host-state model under `.entangle/host`;
- a separate local secret root for host-owned runtime identities;
- host-managed external principal bindings for git-facing identities, exposed
  through host routes, the shared host client, and the CLI, and now resolved
  into effective runtime context instead of remaining only in the written
  specification;
- host-resolved model-secret delivery in the effective runtime context, so live
  node execution now depends on actual credential availability rather than only
  on model endpoint selection;
- resolved git principal runtime bindings that now include secret-availability
  status and mounted-file delivery metadata for the current local profile;
- deterministic primary git repository-target resolution in effective runtime
  context, based on explicit git service `remoteBase` contracts, resolved
  namespace hints, and graph identity;
- live host routes for catalog inspection/apply, package admission, graph
  inspection/apply, runtime inspection, runtime context access, and runtime
  desired-state mutation;
- host-side runtime materialization for effective bindings, runtime intents,
  observed runtime records, workspace layout, immutable package-store-backed
  package surfaces, injected runtime context, and stable per-node runtime
  identity context;
- a runtime-backend abstraction with a memory backend used in tests and a
  first Docker backend for the local operator profile, now mediated through a
  first-party Docker Engine API client rather than `docker` CLI shell-outs,
  plus persisted reconciliation snapshots, richer host status output, and a
  read-only secret-volume mount into runner containers;
- a Studio graph surface that now renders live host topology instead of a fake
  demo graph;
- an explicit package tool-catalog contract through `runtime/tools.json`,
  validator enforcement, and scaffolded empty catalogs;
- a runner bootstrap that now consumes injected runtime context, package
  prompts, runtime config, and seeded memory instead of a hardcoded request;
- a first real provider-backed `agent-engine` slice with an internal Anthropic
  adapter, official SDK wiring behind the stable engine boundary, normalized
  one-turn execution, explicit model auth-mode contracts with the correct
  Anthropic local default, and live runner entrypoints no longer bound to the
  stub path;
- a first bounded tool-execution slice where the runner now loads
  package-declared tool catalogs into turn assembly, the runtime owns an
  Entangle builtin tool executor boundary, and the Anthropic adapter can
  complete internal `tool_use` / `tool_result` loops without leaking provider
  protocol logic into the runner surface;
- a bounded builtin-tool widening slice where the runner can now inspect
  bounded memory refs from the current turn through `inspect_memory_ref`
  without widening host surfaces or granting arbitrary filesystem access;
- a first deterministic post-turn memory-maintenance slice where completed
  turns now write task pages into the node wiki, append structured entries to
  `memory/wiki/log.md`, keep `memory/wiki/index.md` aligned, and feed the
  freshest task memory back into subsequent turn assembly;
- a richer deterministic memory-summary slice where the runner now rebuilds
  `memory/wiki/summaries/recent-work.md` from canonical task pages and feeds
  that summary back into future bounded turn assembly;
- a first typed host-event surface where `entangle-host` now persists
  canonical event records, lists them over `GET /v1/events`, streams them over
  WebSocket on the same route, and exposes the shared event boundary through
  `packages/host-client` for Studio and CLI live usage;
- a typed graph-revision history surface where `entangle-host` now persists
  canonical revision records, exposes `GET /v1/graph/revisions` plus
  `GET /v1/graph/revisions/{revisionId}`, keeps backward compatibility with
  older raw graph-snapshot revision files, and shares that inspection boundary
  through `packages/host-client` and the CLI;
- a first resource-oriented node surface where `entangle-host` now exposes
  applied non-user node bindings through `GET /v1/nodes` and
  `GET /v1/nodes/{nodeId}`, and shares that inspection boundary through
  `packages/host-client` and the CLI;
- a first resource-oriented managed-node mutation surface where
  `entangle-host` now supports `POST /v1/nodes`, `PATCH /v1/nodes/{nodeId}`,
  and `DELETE /v1/nodes/{nodeId}`, keeps the graph as the only source of
  truth, rejects deletion while edges still reference the node, and emits
  typed `node.binding.updated` control-plane events;
- a first resource-oriented edge mutation surface where `entangle-host` now
  supports `GET /v1/edges`, `POST /v1/edges`, `PATCH /v1/edges/{edgeId}`, and
  `DELETE /v1/edges/{edgeId}`, keeps topology mutations on the validated
  graph-apply path, and emits typed `edge.updated` control-plane events;
- a first-class runtime restart surface where `entangle-host` now supports
  `POST /v1/runtimes/{nodeId}/restart`, persists monotonic restart
  generations in runtime intents, emits typed `runtime.restart.requested`
  host events, and forces deterministic Docker runtime recreation when the
  restart generation changes;
- richer reconciliation and degraded-state semantics where runtime inspection
  now carries derived reconciliation state plus finding codes, persisted host
  reconciliation snapshots distinguish blocked, transitioning, and degraded
  runtimes, and `GET /v1/host/status` now derives health from explicit
  reconciliation findings instead of raw failure counts alone;
- a host-owned runtime recovery-history surface where `entangle-host` now
  exposes `GET /v1/runtimes/{nodeId}/recovery`, persists per-node recovery
  records under observed host state, deduplicates unchanged runtime states
  with canonicalized fingerprints, and serializes host reconciliation reads so
  identical successive inspections do not create duplicate history entries;
- an explicit host-owned runtime recovery-policy slice where `entangle-host`
  now persists desired recovery-policy records, observed recovery-controller
  state, exposes `PUT /v1/runtimes/{nodeId}/recovery-policy`, and can perform
  bounded automatic `restart_on_failure` recovery against stable failure
  fingerprints instead of treating retries as implicit or unbounded behavior;
- a widening of the host recovery event surface where `entangle-host` now
  emits durable `runtime.recovery.recorded` and
  `runtime.recovery_controller.updated` events from the same host-owned
  recovery history and controller state already exposed through runtime
  recovery inspection, while suppressing trivial idle-bootstrap noise;
- a first serious runtime-recovery inspection slice across the shared clients,
  where `packages/host-client` now owns reusable host-event filtering helpers,
  `entangle-cli` supports typed `host events list` and `host events watch`
  flows with recovery-oriented filtering, and Studio consumes the live host
  event stream to inspect runtime recovery policy, controller state, recovery
  history, and live recovery events without introducing a client-owned
  recovery model;
- a broader host-owned trace-event slice where `entangle-host` now derives and
  persists `conversation.trace.event`, `approval.trace.event`, and
  `artifact.trace.event` from persisted runner state using the same
  deduplicated observed-state model already used for session and runner-turn
  activity;
- a deeper Studio runtime-inspection slice where the selected-runtime view now
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
- the first bounded Studio graph-mutation slice where the operator can now
  select, create, replace, and delete graph edges through host-owned mutation
  routes instead of keeping Studio fully read-only on topology;
- the next bounded Studio mutation slice where the operator can now create,
  replace, and delete managed nodes through host-owned mutation routes while
  selecting admitted package sources from Studio;
- the next bounded Studio mutation slice where the operator can now admit
  package sources directly through host-owned `local_path` /
  `local_archive` flows and inspect the admitted inventory without leaving the
  graph editor surface;
- the next bounded Studio completion slice where the operator surface now uses
  the existing host event stream to coalesce live overview and
  selected-runtime refresh instead of depending only on explicit post-mutation
  reloads;
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
  detail through the existing session read surface, without introducing
  client-owned session state;
- the next bounded CLI completion slice where the main host-facing mutation
  commands now support `--dry-run`, printing canonical mutation payloads or
  intents without mutating the host;
- a host-owned session inspection surface where `entangle-host` now exposes
  `GET /v1/sessions` plus `GET /v1/sessions/{sessionId}`, aggregates persisted
  runner session records across the current host runtime set, and shares the
  same boundary through `packages/host-client` and the CLI so future event
  widening can build on a stable read model instead of event-only logic;
- a widening of the host event surface where `entangle-host` now derives
  `session.updated` plus `runner.turn.updated` records from persisted runner
  session and turn state, persists those observations under observed host
  state, and emits them only when the durable observed fingerprint changes;
- a deterministic runner transport abstraction, file-backed runner-local state
  store, and long-lived `RunnerService` that subscribes by recipient pubkey,
  validates inbound A2A payloads, persists session/conversation/turn records,
  and emits bounded `task.result` replies when required;
- a first git-backed artifact materialization slice in the runner, with
  persisted artifact records, session/conversation/turn artifact linkage,
  committed markdown turn reports under the runtime artifact workspace, and a
  host read surface for runtime artifact inspection; protocol-facing
  `ArtifactRef` locators are now kept portable while runtime-local filesystem
  details remain under persisted artifact-record materialization metadata, and
  artifact records now also carry explicit publication-state metadata so local
  materialization and remote publication are not conflated; the runner can now
  also publish to deterministic preexisting remote repositories while
  preserving local artifact truth if publication fails; it can also retrieve
  published git handoffs from locator-specific repository targets into an
  explicit retrieval cache partitioned by service, namespace, repository, and
  artifact id, with deterministic service-scoped git-principal selection and
  typed local artifact inputs into the engine request; the host now also provisions primary `gitea_api`
  repository targets itself, persists provisioning-state records, and treats
  provisioning failure as a runtime-realizability error instead of deferring
  it to the runner;
- a real Nostr runner transport using NIP-59 gift wrapping plus a dedicated
  Entangle rumor kind, with relay-readiness preconnect semantics at startup;
- a corrected local `strfry` deployment profile with an explicit mounted relay
  config instead of an invalid config-less command;
- a hardened local Docker image topology with an explicit `.dockerignore`,
  pinned `pnpm` installation and store semantics inside build stages, a static
  Nginx Studio runtime, and verified host/runner portable deploy payloads
  built from the real `build -> deploy` path;
- build outputs for deployable runtime packages that now exclude compiled test
  files, while typed linting keeps explicit coverage over tests through a
  tightly scoped out-of-project configuration;
- machine-readable Entangle A2A payloads and runner-local session,
  conversation, approval, and turn-state contracts owned by `packages/types`
  plus validator entrypoints for those surfaces in `packages/validator`;
- a real quality baseline with ESLint, Vitest, and GitHub Actions CI;
- shared Vitest workspace-source resolution so package-local tests do not
  accidentally execute against stale sibling build outputs;
- shared ESLint test-project resolution through a root `tsconfig.eslint.json`,
  so typed linting over tests resolves current workspace sources instead of
  stale sibling declarations;
- an explicit composite TypeScript build graph with solution-build typechecking
  for internal packages and Node services;
- targeted tests over validator semantics, host-client error handling, package
  scaffolding, host API input failure modes, runtime context conflict
  semantics, and runner bootstrap behavior;
- a verified `pnpm verify` path for the current workspace.
- a successful live local relay smoke where a wrapped Entangle message produced
  persisted session, conversation, and turn records under the runner runtime
  root.

The specification corpus now has five layers:

- descriptive and conceptual architecture;
- canonical type definitions;
- normative invariants, normalization rules, validation rules, and runtime state machines.
- operational specifications for packaging, graph policy, artifact backends, control-plane behavior, and compatibility.
- product-operational specifications for observability, Studio, hackathon runtime profile, and phase quality gates.

The central design direction is now clear:

- graph-native, not orchestrator-only;
- user as node;
- agents as first-class nodes;
- hackathon topology should visibly include non-flat organizational structure, not only one coordinator with flat subagents;
- Nostr-signed messaging for coordination;
- artifact backends for work;
- wiki memory per node;
- a runner per node;
- Studio as graph-aware user and operator client;
- a separate host control-plane service for node admission and runtime lifecycle.
- headless operation should remain possible through CLI and host-facing surfaces, not only through Studio.
- the project should remain in one monorepo with explicit internal package boundaries during the hackathon and early product phase.
- relay, git service, and model endpoint configuration should come from a
  deployment-scoped resource catalog, not hardcoded runtime assumptions.
- git-facing principals should be bound explicitly through host-managed
  external principal records, not hidden in package or runner-local config.
- runners should consume a versioned effective runtime context resolved by the
  host, not recompute graph and deployment merges on their own.
- model-provider integration should happen behind an internal engine-adapter
  boundary, and the local deployment profile should make the real control-plane
  topology visible.

## Most important current design conclusions

1. The user is a node in the graph.
2. Nodes are identified globally by Nostr public keys.
3. A portable `AgentPackage` must be separate from a graph-local `NodeInstance`.
4. Edges are first-class and canonical.
5. Messages coordinate work; artifacts carry work.
6. Git should be the first implemented artifact backend.
7. Git credentials must stay separate from the node's Nostr private key, even
   when git-facing attribution is derived from the node identity.
8. Each node must run as a true agent runtime, not as a stateless inference endpoint.
9. Relay, git, and model endpoint resources must be bindable per node or via
   graph defaults rather than hardcoded globally.
10. Host, Studio, CLI, and runner need explicit contracts for API and injected
    runtime context rather than ad hoc coupling.
11. The engine/provider layer must stay behind an adapter boundary, not leak
    provider-native types into the runner contract.
12. The hackathon build should preserve the final architecture while restricting active features.

## Immediate next steps

The current implementation-truth audit now lives in
[../references/59-implementation-state-and-delivery-audit.md](../references/59-implementation-state-and-delivery-audit.md).

- complete remote git collaboration on top of the existing local git-backed
  artifact model only where later delivery needs exceed the now-implemented
  locator-specific retrieval path, the resolved git principal secret-delivery
  bindings, the explicit repository-target contract, the host-owned
  provisioning record model, and the publication/retrieval-state record
  model;
- complete CLI parity where it adds real headless operational value;
- widen the now-real internal `agent-engine` beyond the first bounded tool
  loop, especially around bounded model-guided memory synthesis and any later
  builtin-tool widening that still adds real bounded runtime value;
- keep later CLI widening focused only on real operational leverage, not
  surface parity for its own sake;
- keep Studio host-first as it deepens, so richer operator flows continue to
  consume host-owned truth instead of inventing client-side control logic.
