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
- host-owned session inspection over persisted runner state;
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
4. live runner entrypoints wired to the real engine path instead of the stub;
5. a bounded builtin tool surface that now includes deterministic
   artifact-input inspection, bounded memory-ref inspection, and bounded
   current-session state inspection through the runner-owned tool executor;
6. a richer deterministic memory-maintenance layer where the runner now
   rebuilds a recent-work summary page from canonical task pages and feeds that
   summary back into future turn assembly;
7. a first bounded model-guided memory-synthesis pass where the runner now
   maintains `memory/wiki/summaries/working-context.md` through a strict
   forced tool call while preserving runner ownership of the actual wiki
   write path;
8. a first bounded engine-turn observability slice where the internal tool loop
   now records structured tool requests and bounded tool-execution outcomes,
   and that normalized engine outcome now persists through runner-turn state
   into host-owned runner activity events.
9. a shared runtime-trace consumption slice where Studio and CLI now read that
   normalized engine outcome through shared `host-client` presentation helpers
   instead of leaving operator-facing trace inspection trapped in raw host-event
   JSON.
10. a bounded provider-metadata and engine-failure-reporting slice where
    successful turns now preserve normalized provider identity, failed turns now
    persist bounded failure payloads, and successful engine outcomes survive
    later artifact-materialization failures.
11. a session-aware working-context synthesis slice where the model-guided
    memory pass now consumes the same bounded current-session snapshot used by
    `inspect_session_state`, instead of keeping session reasoning trapped in
    the builtin tool path alone.
12. an artifact-aware refinement of that same working-context synthesis path
    where the runner now passes explicit retrieved and produced artifact
    context into memory synthesis instead of leaving work-product visibility
    trapped in the main task-execution path.
13. an artifact-context carry-forward refinement of that same synthesis path
    where the durable `working-context.md` page now preserves deterministic
    consumed/produced artifact context plus bounded model-guided artifact
    insights instead of leaving artifact awareness trapped in request-time
    context alone.
14. an engine-outcome-aware refinement of that same synthesis path where the
    bounded synthesis prompt now carries the just-completed turn's normalized
    engine outcome instead of relying on assistant text and coarse stop reason
    alone.
15. an execution-insight carry-forward refinement of that same synthesis path
    where the durable `working-context.md` page now preserves bounded
    execution insights instead of leaving current-turn execution awareness
    trapped in prompt-time context alone.

Remaining work in this phase:

1. deepen model-guided memory maintenance and runtime reasoning on top of the
   now-implemented artifact inspection, bounded memory-ref inspection, bounded
   current-session state inspection, and session-aware working-context
   synthesis paths, now including artifact-aware and artifact-carrying
   working-context synthesis plus current-turn engine-outcome grounding and
   execution-insight carry-forward, before adding more builtin tool kinds;
2. deepen the now-implemented deterministic post-turn memory/wiki update phase,
   now including the derived recent-work and working-context summary layers,
   into broader model-guided memory maintenance;
3. widen provider metadata only where later provider adapters or delivery modes
   justify new canonical fields instead of adding provider-shaped churn
   prematurely.

Acceptance for the phase:

- live runner execution no longer depends on a stub engine;
- provider-native types do not leak into runner contracts;
- the engine path is test-covered and reusable across runner scenarios;
- bounded tool-loop behavior is added without collapsing provider logic into
  the runner.

## Phase 3: Host control-plane completion

Complete the missing host surfaces after the core runtime capabilities are in
place.

Implement in small slices:

1. broader diagnostics-oriented event widening only where the now-implemented
   trace surface still leaves real operator blind spots.

Acceptance for the phase:

- Studio and CLI can consume live host events;
- host API coverage aligns more closely with the published control-plane spec;
- runtime lifecycle changes, including deterministic restart and explicit
  degraded-state semantics, explicit recovery policy, bounded automatic
  recovery, persisted session inspection, host-derived session/runner activity
  events, host-owned runtime recovery history, and host-owned runtime recovery
  events, are inspectable and auditable without reading files by hand.

Completed in the current repository state:

- richer Studio and CLI inspection over the now-implemented runtime recovery
  policy, controller, history, and event surfaces.
- broader conversation-, approval-, and artifact-oriented host event widening
  on top of the now-implemented runtime, recovery, session, and runner
  activity surfaces.
- richer Studio runtime, reconciliation, and live trace inspection on top of
  the now-broader host-owned trace surface, without widening the host API or
  introducing client-owned event logic.
- the first bounded Studio runtime lifecycle mutation flow, where the visual
  operator surface now starts, stops, and restarts selected runtimes strictly
  through existing host lifecycle surfaces.
- deeper Studio runtime artifact inspection on top of the already implemented
  host runtime-artifact read surface, with partial-failure-tolerant selected
  runtime refresh instead of all-or-nothing panel failure.
- deeper Studio runtime session inspection on top of the already implemented
  host session read model, again preserving partial-failure-tolerant
  selected-runtime refresh semantics.
- the first bounded Studio graph-mutation slice through host-owned edge
  mutation flows, with edge selection, create/replace/delete, and canonical
  post-mutation refresh.
- the next bounded Studio mutation slice through host-owned managed-node
  mutation flows, with package-source-backed node binding selection and
  preservation of hidden bindings on replace.
- the next bounded Studio mutation slice through host-owned package-source
  admission flows, with canonical `local_path` / `local_archive` request
  assembly and partial-failure-aware package-source inventory loading.
- the next bounded Studio completion slice through host-event-driven refresh,
  where overview and selected-runtime reads are now coalesced off the existing
  host event stream without reconnecting the subscription on runtime
  selection changes.
- the next bounded Studio completion slice through host-backed session-detail
  drilldown, where one runtime-scoped session summary can now be selected and
  expanded into per-node session/runtime detail through the existing
  `GET /v1/sessions/{sessionId}` surface.

The next best current move is to keep deepening model-guided memory maintenance
on top of the now stronger session-aware and artifact-aware bounded runtime
inspection surface, not to widen the builtin tool catalog casually.

## Phase 4: Studio completion

Deepen Studio only on top of completed host capability, not by adding
client-owned control logic.

Implement in small slices:

1. further operator workflow completion only where the existing host surface
   still leaves a real blind spot.

Acceptance for the phase:

- Studio becomes a real operator surface;
- all mutations still go through the host boundary;
- Studio shows real state instead of inferred or fake state.

## Phase 5: CLI completion

Keep CLI thinner than Studio but operationally serious.

Implement in small slices:

1. stronger automation-oriented JSON flows;
2. live watch or event-stream consumption where valuable.

Acceptance for the phase:

- a power user can operate the local system headlessly;
- CLI remains a client, not a second control plane.

Completed in the current repository state:

- package-source list and detail inspection through the existing host read
  surface;
- canonical package-source admission for both `local_path` and `local_archive`
  sources, including optional explicit package-source ids through the CLI.
- runtime artifact inspection through the existing host artifact read surface,
  including deterministic local filtering over host-owned artifact records.
- dry-run previews across the main host-facing mutation commands, including
  package-source admission, graph apply, node and edge mutation, external
  principal upsert, runtime recovery-policy mutation, and runtime lifecycle
  intents.

The next best current move is to keep CLI widening opportunistic and instead
return to bounded runtime/tooling depth where it adds real execution value.

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
