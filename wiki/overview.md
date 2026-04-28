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
same-machine deployment profile.

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
- the early same-machine profile should include a thin but real CLI plus package
  scaffolding, while Studio remains the richer operator surface.

The repository is therefore no longer best described as "entering
implementation" or as being in a control-plane-only stage.

As of the 2026-04-26 federated-runtime pivot audit, the forward-looking product
baseline is Entangle. Same-machine deployment is the first deployment topology,
not the product identity or a separate runtime profile. The current
implementation is still materially single-host in places: Host writes injected
runtime context, Docker runners share Host-managed volumes, and Host still
derives much of its runtime projection by reading runner-Entangle state. The active
redesign pack under `references/221-federated-runtime-redesign-index.md`
defines the required shift to Host Authority signing, generic runner
registration, runtime assignments, signed observations, stable User Node
identities, and projection-backed Studio/CLI surfaces.

The most accurate current description is:

- the architecture and contract layers are strong and largely stable;
- the host and runner are already real local runtime components;
- the remaining same-machine-era implementation is now subordinate to the federated
  runtime pivot;
- the largest gaps are Host-runner federation, stable user-node signing, and
  projection state that does not depend on shared local filesystems.

The Human Interface Runtime now has a first usable running User Client for
human graph participants. It can inspect projected inbox state, publish
User Node messages, respond to approval requests, review artifact/wiki/source
evidence, use local JSON APIs for selected conversation detail and message
publishing, and submit Host-mediated source-candidate accept/reject decisions
with `reviewedBy` stamped as the running User Node id. A first dedicated
`apps/user-client` app now consumes that runtime JSON API, and the runtime can
serve static User Client assets from `ENTANGLE_USER_CLIENT_STATIC_DIR`. The
federated dev runner image now bundles that built app, and the Docker launcher
adapter can publish a browser-openable User Client port for User Node runtime
contexts. The dedicated app now reaches runtime-local JSON routes for artifact
preview, source diff, source-candidate review, and wiki preview cards. Studio
remains the operator surface, not the primary human-node client.

The contract-ownership layer is now also explicit:

- `packages/types` should own the primary `zod` schemas and host API DTO
  contracts;
- `packages/validator` should own semantic validation on top of those schemas;
- generated artifacts such as JSON Schema should remain derivative, not primary.

The repository now also contains the first real implementation baseline:

- a `pnpm` + Turborepo monorepo scaffold;
- `apps/studio` and `apps/cli`;
- `apps/user-client` for the human graph participant surface;
- `services/host` and `services/runner`;
- `packages/types`, `validator`, `host-client`, `agent-engine`, and
  `package-scaffold`;
- a first same-machine Compose profile and service Dockerfiles;
- an explicit `deploy/federated-dev/` profile layout for Entangle same-machine deployment
  material, with shared script path constants instead of duplicated local
  Compose paths;
- an explicit `releases/` area for release-control packets, starting with the
  first operator-baseline packet;
- a persistent local host-state model under `.entangle/host`;
- a separate local secret root for host-owned runtime identities;
- a safer `entangle package init` path that exposes package name, package id,
  default node kind, and explicit overwrite controls over the shared scaffold
  utility;
- host-managed external principal bindings for git-facing identities, exposed
  through host routes, the shared host client, and the CLI, safely removable
  when unused, and now resolved into effective runtime context instead of
  remaining only in the written specification;
- host-resolved model-secret delivery in the effective runtime context, so live
  node execution now depends on actual credential availability rather than only
  on model endpoint selection;
- resolved git principal runtime bindings that now include secret-availability
  status and mounted-file delivery metadata for the current same-machine profile;
- deterministic primary git repository-target resolution in effective runtime
  context, based on explicit git service `remoteBase` contracts, resolved
  namespace hints, and graph identity;
- live host routes for catalog inspection/apply, package admission, graph
  inspection/apply, runtime inspection, runtime context access, and runtime
  desired-state mutation;
- an optional bootstrap host operator-token boundary through
  `ENTANGLE_HOST_OPERATOR_TOKEN`, with bearer-token propagation through the
  shared host client, CLI, and Studio while the default same-machine profile remains
  tokenless for low-friction development, plus typed `security` audit events
  for protected mutation requests through `host.operator_request.completed`;
- host-side runtime materialization for effective bindings, runtime intents,
  observed runtime records, workspace layout, immutable package-store-backed
  package surfaces, injected runtime context, and stable per-node runtime
  identity context;
- peer-identity-aware runtime edge routes where adjacent non-user node public
  keys are injected as non-secret route metadata and runner turn assembly now
  includes a bounded peer-route summary for graph-aware multi-node reasoning;
- controlled autonomous runner handoffs where structured engine
  `handoffDirectives` must resolve through effective edge routes, local
  autonomy policy, materialized peer pubkeys, and allowed handoff relations
  before the runner emits `task.handoff`, with emitted handoff ids carried
  through runner-turn, host-event, and client presentation contracts, and with
  runner-owned active-conversation reconciliation now keeping multi-handoff
  sessions active only while real delegated conversations remain open, with
  a runner-start repair pass that realigns stale active-conversation ids from
  durable conversation records, moves still-pending approval-gated drained
  sessions to `waiting_approval`, clears already-approved waiting gates, and
  safely completes drained active or unblocked waiting sessions before new
  transport intake begins, and with host-owned session summaries now
  exposing aggregate active-work ids plus conversation and approval lifecycle
  status counts plus conversation-level, approval-level, and session-level
  consistency findings for list-level operator inspection;
- a runtime-backend abstraction with a memory backend used in tests and a
  first Docker backend for the local operator profile, now mediated through a
  first-party Docker Engine API client rather than `docker` CLI shell-outs,
  plus persisted reconciliation snapshots, richer host status output, and a
  read-only secret-volume mount into runner containers;
- a Studio graph surface that now renders live host topology instead of a fake
  demo graph;
- canonical Federated Preview assets under `examples/federated-preview/` plus
  `pnpm ops:demo-federated-preview`, which reuses the real local host, runner,
  relay, model-stub, and Gitea/git-backed artifact path for an inspectable
  preview session;
- a released L2 Federated Workbench slice with CLI package inspection, package
  tool-catalog validation, offline graph diffing, root-relative path handling
  for `pnpm --filter @entangle/cli dev`, headless session launch through the
  host API over host-resolved runtime context and the local relay, optional
  CLI launch wait polling through host session inspection, Studio
  selected-runtime session launch through the same host API, shared graph
  diffing for CLI and Studio, Studio graph revision diff against active graph
  state, host-backed Studio active-graph validation, host graph import/export
  through the CLI, CLI graph template list/export commands for the canonical
  Federated Preview graph, artifact filtering by session id, bounded local
  report-artifact preview through the host API, CLI, and Studio, and runtime
  memory page inspection plus bounded preview through the host API, CLI, and
  Studio;
- a first L3 Agentic Node Runtime foundation where deployment catalogs must
  carry at least one agent engine profile, graph and node bindings can select
  an `agentRuntime`, effective runtime context exposes the resolved
  `agentRuntimeContext`, the default engine profile is OpenCode, and
  per-node source, engine-state, and wiki-repository workspace roots now exist,
  with the runner wired to a first safe OpenCode CLI/process adapter for
  primary node turns that now isolates OpenCode DB/config/XDG state under the
  node engine-state workspace, probes OpenCode version before turns, applies
  bounded probe/run process timeouts, probes attached OpenCode server
  health/version before `--attach` turns when configured, and persists generic
  engine-session ids
  plus engine versions and permission-block observations on turn outcomes,
  including `policy_denied` results when OpenCode one-shot CLI auto-rejects a
  permission request, plus bounded generic tool evidence from OpenCode JSON
  events, including tool titles, redacted input summaries, output summaries,
  durations, and call ids, while the federated dev runner image now installs
  pinned `opencode-ai@1.14.20` and verifies `opencode --version` during image
  build, and host runtime inspection now carries a generic agent-runtime
  summary plus workspace-health status consumed by the shared host-client, CLI,
  and Studio, and runner-owned source workspace change
  harvesting now records bounded changed-file and diff summaries on turns,
  host events, runtime inspection, CLI output, and Studio details, plus durable
  pending source-change candidate records with host, CLI, and Studio
  inspection plus bounded candidate diff, listed-file previews, and audited
  review lifecycle mutations plus runtime-local source-history application for
  accepted candidates, and a separate source-history publication mutation that
  turns applied source-history commits into git commit artifacts with durable
  publication metadata, resolved target metadata, explicit retry after failed
  attempts, and host-owned provisioning for selected non-primary `gitea_api`
  targets, with node-configured source mutation policy now able to
  require approved runtime approval ids before source application, before any
  source-history publication, or before non-primary publication targets by
  default, while validating approval operation and concrete resource scope
  before accepting a supplied approval id, with a host/CLI/Studio operator
  decision path for creating scoped approvals or deciding pending approvals,
  with bounded host/CLI/Studio history and diff inspection for supported
  materialized git artifacts, plus a first safe host/CLI/Studio restore path
  that materializes git-backed runtime artifacts into explicit artifact
  workspace restore directories without overwriting existing targets by
  default, with host/CLI/Studio restore-attempt history inspection and a first
  approval-gated host/CLI/Studio promotion path from successful restores into
  the source workspace, and with runner-owned local git snapshots of `memory/wiki` into
  each node's `wiki-repository` workspace after completed turns, including
  durable sync outcomes on turns, host events, CLI output, and Studio turn
  inspection, plus
  `entangle deployment doctor` runtime wiki repository health warnings for
  uninitialized, dirty, or uncommitted snapshots, plus host-mediated
  wiki-repository publication as `knowledge_summary` git artifacts with
  durable publication records, `wiki_repository.published` events, and
  host-client/CLI/Studio controls, and with
  bounded engine-request summaries on executable turns so CLI and Studio turn
  inspection can show prompt part counts, aggregate prompt size, memory,
  artifact, and tool counts, execution limits, and peer-route inclusion without
  exposing raw prompt text, runtime-local paths, or engine-specific payloads,
  while executable turn assembly now explicitly includes agent-runtime,
  workspace-boundary, autonomy/source-mutation policy, and inbound
  response/constraint control context for the node-local coding engine, plus
  an Entangle action contract that lets OpenCode propose validated handoff
  directives and policy-scoped approval request directives through bounded
  `entangle-actions` output blocks, with unauthorized or unroutable handoffs
  classified as `policy_denied` while preserving bounded engine evidence, and
  with engine-requested approvals materialized as pending runner approval
  records that move the session/conversation lifecycle to
  `waiting_approval`/`awaiting_approval` without granting the engine the
  gated side effect, with host-written external session cancellation requests
  now exposed through CLI and Studio controls, observed by node runners while
  idle or mid-turn, and translated into engine abort signals for OpenCode-backed
  turns, and with generic runtime inspection now surfacing pending
  approval blockers plus the latest produced artifact and requested approval
  ids through the shared host/CLI/Studio boundary, and with runner-served User
  Clients now rendering runtime identity, Host API, relay status, and
  lightweight live refresh over `/api/state`, plus local JSON APIs for selected
  conversation detail and message publishing;
- an explicit package tool-catalog contract through `runtime/tools.json`,
  validator enforcement, and scaffolded empty catalogs;
- a runner bootstrap that now consumes injected runtime context, package
  prompts, runtime config, and seeded memory instead of a hardcoded request;
- a first real provider-backed `agent-engine` slice with an internal Anthropic
  adapter, official SDK wiring behind the stable engine boundary, normalized
  one-turn execution, explicit model auth-mode contracts with the correct
  Anthropic local default, and an internal adapter path that is no longer the
  public node-runtime profile;
- a second provider-backed `agent-engine` slice with an OpenAI-compatible chat
  completions adapter behind the same internal engine boundary, preserving
  provider-agnostic runner contracts while supporting bearer-token auth,
  prompt rendering, usage/stop normalization, and bounded tool-call loops;
- a first bounded tool-execution slice where the runner now loads
  package-declared tool catalogs into turn assembly, the runtime owns an
  Entangle builtin tool executor boundary, and the Anthropic adapter can
  complete internal `tool_use` / `tool_result` loops without leaking provider
  protocol logic into the runner surface;
- a bounded builtin-tool widening slice where the runner can now inspect
  bounded memory refs from the current turn through `inspect_memory_ref`, and
  a further bounded runtime-local inspection slice where the runner can now
  inspect current session state through `inspect_session_state`, both without
  widening host surfaces or granting arbitrary filesystem access;
- a first deterministic post-turn memory-maintenance slice where completed
  turns now write task pages into the node wiki, append structured entries to
  `memory/wiki/log.md`, keep `memory/wiki/index.md` aligned, and feed the
  freshest task memory back into subsequent turn assembly;
- a richer deterministic memory-summary slice where the runner now rebuilds
  `memory/wiki/summaries/recent-work.md` from canonical task pages and feeds
  that summary back into future bounded turn assembly;
- a first bounded model-guided memory-synthesis slice where the runner now
  maintains `memory/wiki/summaries/working-context.md` through a strict
  forced tool call while preserving runner ownership of the actual wiki
  write path and keeping synthesis failure additive rather than turn-fatal;
- a session-aware refinement of that working-context synthesis path where the
  model-guided summary now also consumes the same bounded current-session
  snapshot exposed through `inspect_session_state`, instead of leaving session
  reasoning trapped in the builtin tool path alone;
- an approval-aware refinement of that session snapshot where
  `inspect_session_state` and model-guided memory synthesis now carry bounded
  approval summaries, waiting-gate counts, and recorded approval status context
  alongside conversation, turn, and artifact context;
- an approval-gate carry-forward refinement where the durable
  `working-context.md` page now preserves deterministic waiting approval ids
  and bounded approval-record summaries instead of relying only on model prose
  to keep approval blockers visible to later turns;
- a first approval-message handling slice where `approval.request` and
  `approval.response` now have explicit A2A metadata contracts and the runner
  materializes pending approval gates, applies approved decisions, closes
  approved approval conversations when policy allows, completes unblocked
  waiting sessions, and relies on the canonical A2A validator to reject
  malformed approval metadata plus approval-specific response-policy loops
  before local lifecycle state is written, while orphan approval responses that
  match no local session, conversation, or approval record are absorbed without
  creating phantom active work;
- an artifact-aware refinement of that same synthesis path where the runner now
  passes explicit retrieved and produced artifact context into working-context
  synthesis, instead of leaving work-product visibility trapped in the main
  task-execution path alone;
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
  `stable-facts.md`, and `open-questions.md`, and future turns now consume
  those focused summaries directly instead of relying on one omnibus derived
  page alone;
- a decision-register refinement where that same bounded synthesis pass now
  updates `decisions.md`, the durable `working-context.md` page now carries
  bounded decision carry-forward, and future turns can consume prior
  decisions directly instead of inferring them only from broader summary
  prose;
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
  synthesis pass now sees the current open-questions/next-actions/resolutions
  baseline explicitly and runner-owned reconciliation removes exact resolved
  overlaps from active registers instead of letting closure drift survive as
  silent duplication;
- a focused-register aging-signals refinement where the runner now persists a
  separate carry-state file for the focused registers and feeds bounded
  stale-review hints back into synthesis for repeatedly carried active items,
  without adding noisy lifecycle metadata to the durable wiki pages;
- an explicit closure-reference refinement where the bounded synthesis path can
  now retire active open questions and next actions through runner-validated
  references to the current baseline, even when the new resolutions wording
  differs from the original active entry text;
- a stale-item disappearance-discipline refinement where stale review
  candidates from the focused-register baseline may no longer disappear
  silently: the runner now requires explicit retention or explicit retirement
  semantics for those entries;
- an explicit stale-item replacement refinement where stale open questions and
  next actions may now be replaced deterministically by narrower active items
  through runner-validated `from -> to` mappings instead of being forced to
  stay active or pretend to be resolved;
- an explicit stale-item consolidation refinement where multiple stale open
  questions or next actions may now collapse deterministically into one
  narrower active successor through runner-validated many-to-one mappings
  instead of surviving as overlapping active noise;
- a focused-register transition-history refinement where the runner now
  persists bounded runtime-local lifecycle audit entries for closure,
  completion, replacement, consolidation, and exact resolution-overlap
  retirements while keeping the wiki pages clean and human-readable;
- a first bounded engine-turn observability slice where the internal tool loop
  now records structured tool requests plus bounded tool-execution outcomes,
  and normalized engine outcome now persists through runner-turn state into
  host-owned runner activity events;
- a shared runtime-trace consumption slice where `packages/host-client` now
  owns bounded labels and detail-line generation for runtime-trace events, and
  both Studio and CLI consume that shared presentation over the existing
  host-owned event surface;
- a bounded provider-metadata and engine-failure-reporting slice where
  successful turns now preserve normalized provider identity, failed turns now
  persist bounded failure payloads, and successful engine outcomes survive
  later artifact-materialization failure in durable runner state;
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
  recovery model, with shared recovery presentation helpers and compact
  `host runtimes recovery --summary` output now keeping Studio and CLI
  vocabulary aligned;
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
- a bounded Studio recovery-policy mutation slice where the selected-runtime
  view can now apply manual or restart-on-failure policy records through the
  existing host recovery-policy boundary, with local draft validation matching
  host schema limits;
- a deeper Studio runtime-artifact inspection slice where the selected-runtime
  surface now exposes persisted artifact records from the host read model,
  including deterministic sorting, lifecycle/publication/retrieval summaries,
  and backend-aware locator summaries, while selected-runtime refresh now
  degrades partially under sub-read failures instead of failing wholesale;
- a deeper Studio runtime-session inspection slice where the selected-runtime
  surface now exposes host-backed session summaries relevant to that runtime,
  including per-node session status and trace ids;
- a deeper Studio runtime-approval inspection slice where the selected-runtime
  surface now exposes persisted approval records from the host read model,
  including deterministic sorting and host-backed selected-approval detail;
- a deeper Studio runtime-turn inspection slice where the selected-runtime
  surface now lists persisted runner turns and expands one selected turn into
  host-backed detail, including engine outcome, artifact linkage, trigger,
  phase, and memory-synthesis status;
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
- the host-side completion of `local_archive` package-source admission, where
  tar/tar.gz archives are extracted safely, validated as AgentPackage
  directories, imported under host-managed package storage, and recorded
  through the immutable package store rather than remaining a client-only
  request contract;
- the host-side package-source deletion boundary, where unused sources can be
  removed safely, active graph references block deletion with a typed conflict,
  `package_source.deleted` events refresh Studio overview state, and the CLI
  can perform or dry-run the mutation through the shared host client;
- the host-side external-principal deletion boundary, where unused git-facing
  principal records can be removed safely, active graph references block
  deletion with a typed conflict, `external_principal.deleted` events refresh
  Studio overview state, and the CLI can perform or dry-run the mutation
  through the shared host client;
- the matching Studio package-source deletion flow, where the graph editor
  lists active source references, disables known-conflicting deletes, calls the
  host-owned deletion route for unreferenced sources, and clears stale local
  drafts after host confirmation;
- the matching Studio external-principal lifecycle slice, where the graph
  editor lists host-bound principal records, shows effective active-graph
  references, disables known-conflicting deletes, and calls the host-owned
  deletion route for unreferenced principal bindings;
- the next bounded Studio completion slice where the operator surface now uses
  the existing host event stream to coalesce live overview and
  selected-runtime refresh instead of depending only on explicit post-mutation
  reloads;
- the matching Studio graph-revision history slice, where the host status
  panel now lists persisted applied graph revisions and drills into one
  host-backed topology snapshot without adding client-owned revision truth;
- the next bounded CLI parity slice where headless operators can now inspect
  one admitted package source and admit canonical `local_path` or
  `local_archive` sources with optional explicit package-source ids instead of
  relying on a directory-only shortcut;
- the next bounded CLI parity slice where headless operators can now inspect
  persisted runtime artifacts through the existing host artifact surface and
  apply deterministic local filters over backend, kind, lifecycle,
  publication, and retrieval state;
- the next artifact-governance slice where headless operators can now inspect
  one runtime artifact by id through the shared host boundary instead of
  reading runner-local artifact files directly;
- the matching Studio artifact-detail slice where visual operators can select
  one runtime artifact and inspect its host-backed item record without
  introducing client-owned artifact truth;
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
  same boundary through `packages/host-client` and the CLI, with aggregate
  active-conversation ids, conversation and approval lifecycle status counts,
  waiting approval ids, root artifact ids, optional conversation-level,
  approval-level, and session-level consistency findings, and latest message
  type on list summaries so event traces and session inspection share the same
  active-work and approval-gate vocabulary;
- a host-owned runtime approval inspection surface where `entangle-host` now
  exposes `GET /v1/runtimes/{nodeId}/approvals` plus
  `GET /v1/runtimes/{nodeId}/approvals/{approvalId}` and an explicit
  `POST /v1/runtimes/{nodeId}/approvals` operator decision mutation, sharing
  the same boundary through `packages/host-client`, CLI summaries/filters,
  CLI approval decisions, and Studio selected-runtime drilldown;
- a node agent-runtime configuration surface where the CLI can set or clear
  node-level runtime mode, engine profile, and default-agent overrides through
  `entangle host nodes agent-runtime`, while Studio's Managed Node Editor loads
  catalog engine profiles and writes the same graph-backed `agentRuntime`
  fields through existing host-client node mutation methods;
- a host-owned runner-turn inspection surface where `entangle-host` now exposes
  `GET /v1/runtimes/{nodeId}/turns` plus
  `GET /v1/runtimes/{nodeId}/turns/{turnId}` and shares the same boundary
  through `packages/host-client` and the CLI for audit workflows that need
  persisted turn records instead of event summaries only;
- bounded tool-execution diagnostics where normalized tool observations now
  carry optional diagnostic messages that flow into runner memory, shared
  runtime-trace details, and Studio runner-turn detail;
- shared runtime-turn presentation helpers in `packages/host-client`, with
  Studio consuming the same formatting and the CLI exposing compact
  `host runtimes turn --summary` and `host runtimes turns --summary` output;
- shared session presentation helpers in `packages/host-client`, with Studio
  consuming the same formatting and the CLI exposing compact
  `host sessions list --summary` and `host sessions get --summary` output;
- shared runtime-artifact presentation helpers in `packages/host-client`, with
  Studio consuming the same formatting and the CLI exposing compact
  `host runtimes artifact --summary` and `host runtimes artifacts --summary`
  output, including shared selected-artifact preview, history, and diff
  status formatting plus restore status formatting for headless and visual
  restore operations;
- shared graph-topology presentation helpers in `packages/host-client`, with
  Studio consuming the same graph revision, managed-node, and edge vocabulary
  and the CLI exposing compact `--summary` output for active graph, graph
  revision, node, and edge inspection;
- shared resource-inventory presentation helpers in `packages/host-client`,
  with Studio consuming the same package-source and external-principal
  vocabulary and active-reference summaries, and the CLI exposing compact
  `--summary` output for package-source and external-principal list/detail
  inspection;
- shared runtime-inspection presentation helpers in `packages/host-client`,
  with the CLI exposing compact `host runtimes list --summary` and
  `host runtimes get --summary` output over runtime state, reconciliation,
  context readiness, restart generation, backend, package source, runtime
  handle, and git provisioning signals;
- shared host-status presentation helpers in `packages/host-client`, with
  Studio's Host Status panel and the CLI exposing compact output over service
  health, runtime counts, reconciliation counts, session diagnostics, finding
  codes, graph revision, backend, and last reconciliation time, and with
  Studio overview refresh treating session and conversation activity as
  status-relevant because those events can change top-level session
  diagnostics;
- a widening of the host event surface where `entangle-host` now derives
  `session.updated` plus `runner.turn.updated` records from persisted runner
  session and turn state, with `session.updated` now preserving
  active-conversation ids, conversation and approval lifecycle counts, bounded
  session consistency finding diagnostics, root artifact ids, and last message
  type so runtime traces can distinguish active work, approval state, approval
  gate drift, and drift from session history, while persisting those
  observations under observed host state and emitting them only when the durable
  observed fingerprint changes;
- a deterministic runner transport abstraction, file-backed runner-Entangle state
  store, and long-lived `RunnerService` that subscribes by recipient pubkey,
  validates inbound A2A payloads, persists session/conversation/turn records,
  and emits bounded `task.result` replies when required;
- a first git-backed artifact materialization slice in the runner, with
  persisted artifact records, session/conversation/turn artifact linkage,
  committed markdown turn reports under the runtime artifact workspace, and a
  host collection and item read surface for runtime artifact inspection;
  protocol-facing
  `ArtifactRef` locators are now kept portable while runtime-local filesystem
  details remain under persisted artifact-record materialization metadata, and
  artifact records now also carry explicit publication-state metadata so local
  materialization and remote publication are not conflated; the runner can now
  also publish to deterministic preexisting remote repositories while
  preserving local artifact truth if publication fails; it can also retrieve
  published git handoffs from locator-specific repository targets into an
  explicit retrieval cache partitioned by service, namespace, repository, and
  artifact id, with deterministic service-scoped git-principal selection and
  typed local artifact inputs into the engine request; the host now also
  provisions primary `gitea_api` repository targets itself, persists
  provisioning-state records, and treats provisioning failure as a
  runtime-realizability error instead of deferring it to the runner; URL-based
  runner git operations now support both SSH-key and HTTPS-token transport
  principals without writing token material into runtime files or remote URLs;
  runner-level integration coverage and the Docker-backed disposable runtime
  smoke now prove a real two-node handoff where one node publishes a git
  artifact to a remote and a downstream node retrieves that artifact into
  local engine context by `ArtifactRef`;
- a real Nostr runner transport using NIP-59 gift wrapping plus a dedicated
  Entangle rumor kind, with relay-readiness preconnect semantics at startup;
- a corrected local `strfry` deployment profile with an explicit mounted relay
  config instead of an invalid config-less command;
- a hardened local Docker image topology with an explicit `.dockerignore`,
  TypeScript incremental build metadata excluded from Docker contexts, clean
  service builds inside image stages, pinned `pnpm` installation and store
  semantics, a static Nginx Studio runtime, and verified host/runner portable
  deploy payloads built from the real `build -> deploy` path;
- a documented same-machine operator bootstrap profile under `deploy/`, backed by
  `pnpm ops:check-federated-dev` and `pnpm ops:check-federated-dev:strict` preflight checks
  for same-machine profile files, Node/pnpm, Docker, Docker Compose, daemon access,
  and Compose config validity;
- a first same-machine reliability doctor through `entangle deployment doctor`, with
  read-only human-readable and JSON diagnostics for same-machine profile files,
  Node/pnpm/Docker/Compose, the runner image, OpenCode availability on the host
  and inside the runner image, bundled User Client assets in the runner image,
  `.entangle/host`, Entangle state layout
  compatibility, live host status, host-reported state layout status,
  host-reported runtime workspace health, git principals, Studio, Gitea, and
  the local relay, plus strict and offline modes, and `entangle deployment
  diagnostics` now writes a redacted JSON support bundle with doctor output,
  bounded Compose status/logs, runner-image inspection, live host state, and
  bounded runtime evidence for turns, engine failures, permission decisions,
  approval blockers, and artifact counts when available, while `entangle deployment
  backup` and `entangle deployment restore`
  provide the first versioned `.entangle/host` backup and validated restore
  path without bundling Entangle secrets, and `entangle deployment repair` provides a
  dry-run-first conservative repair surface for safe host-state initialization
  and missing layout-marker recovery;
- an active same-machine profile smoke through `pnpm ops:smoke-federated-dev`, covering
  running Compose services, the local runner image, host status/events, Studio
  HTTP, Gitea HTTP reachability, and the local `strfry` Nostr WebSocket
  subscription path;
- a functional federated process smoke through
  `pnpm ops:smoke-federated-process-runner`, covering Host plus a real joined
  runner process with separate state roots, signed assignment over a live relay,
  portable bootstrap materialization, signed runtime observations, and signed
  User Node message intake persisted by the assigned runner and projected by
  Host from runner-signed session/conversation observations without requiring a
  live model-provider call;
- a same-machine diagnostics smoke through `pnpm ops:smoke-federated-dev:diagnostics`,
  which writes a temporary redacted diagnostics bundle against a running
  same-machine profile and validates its stable top-level shape;
- a same-machine reliability smoke through `pnpm ops:smoke-federated-dev:reliability`,
  which creates a temporary same-machine backup bundle, validates restore dry-run, and
  checks repair dry-run output against an initialized same-machine profile;
- a disposable same-machine profile smoke through `pnpm ops:smoke-federated-dev:disposable`,
  covering strict preflight, runner image build, stable service startup,
  readiness probing through the active smoke, and teardown with volumes;
- a Docker-backed runtime lifecycle smoke through
  `pnpm ops:smoke-federated-dev:runtime` and
  `pnpm ops:smoke-federated-dev:disposable:runtime`, covering disposable package
  admission, local Gitea disposable user/token bootstrap, smoke graph
  application, local model-secret binding, two managed runner starts,
  restart-generation recreation, restart event persistence, real NIP-59 task
  intake through the local relay, provider-backed OpenAI-compatible execution
  against a credential-checking model stub, completed host session and
  runner-turn inspection, published git-backed artifact materialization,
  downstream artifact retrieval by `ArtifactRef`, stop, and disposable
  teardown;
- build outputs for deployable runtime packages that now exclude compiled test
  files, while typed linting keeps explicit coverage over tests through a
  tightly scoped out-of-project configuration;
- machine-readable Entangle A2A payloads and runner-local session,
  conversation, approval, and turn-state contracts owned by `packages/types`
  plus validator entrypoints for those surfaces in `packages/validator`;
- a real quality baseline with ESLint, Vitest, GitHub Actions CI, and
  socketless host service tests that keep ordinary verification portable in
  constrained sandbox or CI profiles;
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
- a historical three-product roadmap plus a released R1/L1 local-operator
  baseline. The federated-runtime pivot supersedes the roadmap's product
  identity framing: the product is Entangle, and local is one deployment
  profile.

The specification corpus now has five layers:

- descriptive and conceptual architecture;
- canonical type definitions;
- normative invariants, normalization rules, validation rules, and runtime state machines.
- operational specifications for packaging, graph policy, artifact backends, control-plane behavior, and compatibility.
- product-operational specifications for observability, Studio, the early Local
  runtime profile, and phase quality gates.

The central design direction is now clear:

- graph-native, not orchestrator-only;
- user as node;
- agents as first-class nodes;
- Entangle's local-profile topology should visibly include non-flat organizational
  structure, not only one coordinator with flat subagents;
- Nostr-signed messaging for coordination;
- artifact backends for work;
- wiki memory per node;
- a runner per node;
- Studio as graph-aware user and operator client;
- a separate host control-plane service for node admission and runtime lifecycle.
- headless operation should remain possible through CLI and host-facing surfaces, not only through Studio.
- the project should remain in one monorepo with explicit internal package
  boundaries during the same-machine profile and early product phase.
- relay, git service, and model endpoint configuration should come from a
  deployment-scoped resource catalog, not hardcoded runtime assumptions.
- git-facing principals should be bound explicitly through host-managed
  external principal records, not hidden in package or runner-local config.
- runners should consume a versioned effective runtime context resolved by the
  host, not recompute graph and deployment merges on their own.
- model-provider integration should happen behind an internal engine-adapter
  boundary, and the same-machine deployment profile should make the real control-plane
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
12. The Entangle same-machine profile should preserve the final architecture while restricting active features.

## Immediate next steps

The current implementation-truth audit now lives in
[../references/59-implementation-state-and-delivery-audit.md](../references/59-implementation-state-and-delivery-audit.md).

- complete remote git collaboration on top of the existing local git-backed
  artifact model only where later delivery needs exceed the now-implemented
  locator-specific retrieval path, the resolved git principal secret-delivery
  bindings, the explicit repository-target contract, the host-owned
  provisioning record model, the publication/retrieval-state record model, and
  the new pending source-change candidate records with bounded diff and
  listed-file preview plus review, local source-history state, and first
  retryable target-aware source-history commit artifact publication plus
  bounded artifact history/diff inspection, safe workspace restore, and
  approval-gated promotion with restore/promotion history inspection for
  materialized git artifacts, and direct source-history replay with
  replay-attempt history, now including host-owned provisioning for selected
  non-primary `gitea_api` publication targets; the next git gaps are wiki
  promotion, richer source-history merge/reconcile workflows, and explicit
  fallback or replication behavior, while the next deployment-grade gap is
  non-disposable local-profile upgrade and repair behavior for older Gitea
  volumes;
- complete CLI parity where it adds real headless operational value;
- continue narrowing the remaining delegated-session gaps now that controlled
  autonomous `task.handoff` emission and runner-local active-conversation
  reconciliation plus host-derived conversation lifecycle diagnostics and
  consistency findings are implemented;
- deepen the new bootstrap host operator-token and request-audit boundary into
  real production identity and authorization only through explicit contracts,
  tests, policy decisions, and operator-visible attribution;
- continue broadening normalized provider metadata and bounded failure
  reporting only where later provider adapters justify new canonical fields,
  and otherwise deepen model-guided memory maintenance on top of the now
  stronger session-aware and artifact-aware/artifact-carrying/engine-outcome-aware/
  execution-insight-carrying bounded runtime inspection surface;
- keep later CLI widening focused only on real operational leverage, not
  surface parity for its own sake;
- keep Studio host-first as it deepens, so richer operator flows continue to
  consume host-owned truth instead of inventing client-side control logic.
