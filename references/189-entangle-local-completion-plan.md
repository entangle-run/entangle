# Entangle Local Completion Plan

Date: 2026-04-25.

## Purpose

This document is the implementation plan for completing Entangle Local.

For this plan, the project is Entangle Local. Historical names such as
`hackathon_local` are treated as legacy implementation detail that must be
retired before the Local GA release. Cloud and Enterprise are explicitly out of
scope until Entangle Local reaches GA.

## Current Baseline

Completed:

- L1 Local Operator Baseline.
- L1.5 Local Operator Preview.
- L2 Local Workbench.

In progress:

- L3 Agentic Node Runtime.

Not complete:

- L4 Local Reliability.
- L5 Entangle Local GA.

The latest implementation state includes:

- graph and node-level `agentRuntime` selection;
- deployment-level `agentEngineProfiles`;
- effective runtime context with `agentRuntimeContext`;
- OpenCode as the default local agent engine profile;
- per-node source, engine-state, and wiki-repository workspace roots;
- a first safe OpenCode CLI/process adapter in the runner;
- node-scoped OpenCode DB, config, XDG state/cache/data roots, and generic
  engine-session-id observability on runner turn outcomes;
- OpenCode executable version probing before node turns, generic engine-version
  observability on turn outcomes, and bounded process timeout handling for the
  OpenCode version probe and one-shot run process;
- generic engine permission observations, `policy_denied` failure
  classification, and host/CLI/Studio visibility when OpenCode one-shot CLI
  auto-rejects a permission request;
- generic runtime workspace-health inspection for the Local node workspace
  layout, including source, artifact, engine-state, and wiki-repository
  surfaces;
- runner-owned local git snapshots of each node's `memory/wiki` tree into the
  materialized `wiki-repository` workspace after completed turns, with durable
  turn-level sync outcomes and host/CLI/Studio presentation;
- `entangle local doctor` live checks now inspect runtime wiki repositories for
  initialization, clean working trees, branch availability, and committed HEADs
  when runtime context is available;
- runner-owned source workspace change harvesting with bounded changed-file
  and diff summaries on runner turns, host events, runtime inspection, CLI
  output, and Studio details;
- durable pending source-change candidate records for changed node turns, with
  read-only host, host-client, CLI, and Studio inspection surfaces, including
  bounded diff inspection for candidates with shadow-git tree snapshots and
  bounded preview for changed files listed on the candidate plus audited
  accepted/rejected/superseded review mutation and explicit runtime-local
  source-history application for accepted candidates, source-history
  publication as git commit artifacts with explicit retry and target-selection
  controls, node-configured source mutation approval gates, host-scoped
  operator approval decisions, and bounded artifact history/diff inspection
  for supported materialized git artifacts;
- generic host runtime inspection status for the effective agent-runtime mode,
  engine profile, state scope, last engine version, last engine session, last
  permission decision, last engine turn, and bounded engine failure evidence.

The current OpenCode adapter is intentionally not yet enough for L3 acceptance.
It can execute a primary node turn, persist the engine session id and probed
engine version, fail early when its workspace/state roots are unavailable,
terminate overlong OpenCode probe/run processes with classified failure
evidence, and report OpenCode one-shot permission auto-rejections as generic
`policy_denied` outcomes. Host, CLI, and Studio can now see a generic
agent-runtime status summary, but Entangle Local still lacks the complete
policy bridge, live OpenCode permission approval mapping, artifact
restore/replay workflow, git/wiki workflow, external cancellation bridge,
doctor-backed workspace health checks, and richer runtime evidence panels
required for L3 acceptance.

## Initial Deep Audit Baseline

Before executing this plan, the repository must be treated as audited only when
the following baseline has been refreshed in the current working session:

- `git status --short` is checked before edits.
- `README.md`, `resources/README.md`, `wiki/overview.md`, `wiki/index.md`,
  and `wiki/log.md` are read.
- `AGENTS.md` is read for repository-local working rules.
- The current task's relevant reference files are read, including this plan,
  the Local GA product truth audit, repository audit rules, quality gates, and
  quality engineering baseline when the task changes process or release
  readiness.
- The local reference corpus under
  `/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources` is checked
  when work depends on OpenCode, OpenClaw, Open Claude Code, Nostr, A2A, MCP, or
  relay behavior.
- Stale terms, obsolete runtime profile names, missing index entries, stale
  release claims, and implementation/documentation contradictions are searched
  before implementation starts.
- Code boundaries touched by the task are inspected directly instead of
  inferred from memory or prior summaries.

The deep audit performed before workstream A1 confirmed:

- the worktree was clean before the audit update started;
- the current product state is L2 complete, L3 in progress, L4 and L5 not
  complete;
- `hackathon_local` remained active machine state in schemas, examples,
  fixtures, and tests before A1 and was therefore a required cleanup target,
  not only a documentation issue;
- OpenCode is the only default wired coding-agent runtime, with a first safe
  runner process adapter but not yet a complete policy-bound coding-agent node
  implementation;
- the external resource repositories listed in `resources/README.md` are
  materialized at the manifest commits;
- no new wiki pages were introduced by this plan update, so `wiki/index.md`
  does not need a new entry for this change.

## Professional Constraints

These constraints are mandatory for every task below.

### Product Scope

- The active product is Entangle Local.
- Do not start Cloud or Enterprise product work before Local GA.
- Do not use Local GA language until L3, L4, release hardening, and claim audit
  gates pass.
- Retire legacy public naming such as `hackathon_local` before GA.

### Architecture

- Preserve the final architecture while narrowing only active Local features.
- Keep Entangle graph-native: nodes and edges remain first-class operational
  objects.
- The user remains a first-class node.
- Host remains the control plane.
- Runner remains the per-node execution boundary.
- Studio and CLI must consume the same host boundary.
- Do not collapse the product into a single orchestrator-centric shortcut.
- Do not turn Entangle into an OpenCode or Claude Code fork.

### Agent Engine Boundary

- Coding engines are node-local implementation engines behind an Entangle
  adapter.
- OpenCode is the first production target and the default engine.
- Engine-specific protocol details must not leak into graph, host API, or A2A
  contracts.
- Engine subagents remain internal engine detail unless explicitly surfaced as
  Entangle nodes by configuration.
- Legacy one-turn model inference must not return as a public node runtime.

### Identity, Policy, And Security

- Nostr identities are the coordination identities for nodes.
- Git identities are separate backend principals and must remain host-managed.
- Policy must decide what a node may read, write, execute, publish, mutate, and
  communicate.
- Engine-native permission prompts must map to Entangle approvals where
  possible.
- Repair and upgrade flows must never silently destroy user work.
- Secrets must remain outside non-secret runtime context and browser bundles.

### Artifact And Memory Model

- Messages coordinate work.
- Artifacts carry work.
- Git is the first artifact backend, not the only possible backend.
- Wiki/memory remains runner-owned until repository semantics are implemented
  safely.
- Memory-as-repo should be adopted only after migration, inspection, and
  rollback semantics are clear.

### Engineering Quality

- Shared contracts live in `packages/types`.
- Semantic validation lives in `packages/validator`.
- Host-client presentation and parsing helpers live in `packages/host-client`
  when shared by CLI and Studio.
- Browser-facing shared packages must not import Node-only modules.
- Behavior changes require focused tests.
- Coherent code batches must pass `pnpm verify`.
- Release or deployment batches must additionally run the relevant build,
  preflight, and smoke commands.
- Repository state, references, wiki, release packets, and logs must stay
  internally consistent.

## Mandatory Per-Step Audit Loop

Every task and subtask in this plan must start and end with an audit loop. This
is a gate, not a suggestion. No workstream item from A1 through D5 is allowed to
start from assumed memory.

### Step 0: Entry Audit

Before implementation:

- check `git status --short`;
- read the core state files required by `AGENTS.md`;
- read this plan and the specific workstream section being executed;
- read every concept, decision, source, reference, schema, service, client,
  Studio, CLI, deployment, script, or test file directly touched by the task;
- search for stale names, stale claims, contradictions, unsupported behavior,
  unindexed references, missing release notes, missing tests, unsafe secret
  exposure, browser-unsafe imports, and hidden product-scope expansion;
- for OpenCode work, inspect the relevant local OpenCode source paths before
  changing the adapter;
- for Nostr, A2A, MCP, relay, or memory/wiki work, inspect the relevant local
  reference source or specification before changing Entangle behavior;
- write down the task-local acceptance gates before editing.

### Step 1: Drift Reconciliation

Before adding new functionality:

- correct durable documentation drift that would make the new work ambiguous;
- correct missing indexes when new canonical files exist but are not listed;
- correct stale status statements in README, wiki overview, product truth
  audit, roadmap, release packets, or source comments when the task relies on
  them;
- if a contradiction affects architecture, policy, identity, artifact,
  transport, engine, or release semantics, resolve it first or stop and record
  the blocker.

### Step 2: Design Check

Before code edits:

- identify the owning package or service boundary;
- identify whether the change belongs in `packages/types`,
  `packages/validator`, `packages/host-client`, `services/host`,
  `services/runner`, `apps/cli`, `apps/studio`, deployment scripts, or docs;
- verify that host remains the control plane and runner remains the per-node
  execution boundary;
- verify that CLI and Studio will consume the same host/client truth when both
  surfaces are affected;
- verify that engine-specific details remain behind adapter/runtime
  boundaries;
- choose the smallest coherent batch that can be implemented, tested, and
  committed without mixing unrelated work.

### Step 3: Implementation Audit

During implementation:

- keep changes scoped to the audited task;
- update or add focused tests for material behavior changes;
- avoid public fallback to legacy one-turn inference;
- avoid hidden environment-only configuration for product-visible behavior;
- keep secrets out of browser bundles, non-secret runtime context, logs, and
  support bundles;
- preserve protocol locator portability instead of leaking runtime-local paths;
- preserve historical release records unless a current product claim is stale.

### Step 4: Closure Audit

Before committing:

- rerun `git status --short`;
- inspect the full diff for scope creep and accidental unrelated changes;
- run `git diff --check`;
- run focused lint, typecheck, and tests for touched packages or services;
- run `pnpm verify` for coherent code or tooling batches;
- run `pnpm build`, local preflight, and relevant smokes for deployment,
  runtime, release, or Local reliability batches;
- update affected canonical references, README, wiki overview, release packets,
  and examples when project state changed;
- update `wiki/index.md` when new wiki pages are added;
- append a meaningful entry to `wiki/log.md` when state, design baseline, or
  release readiness changes;
- commit only a coherent batch with a message that reflects the actual change.

### Step 5: Per-Milestone Exit Audit

Before closing L3, L4, or L5:

- compare implemented behavior against every acceptance criterion in this plan;
- compare current state against `references/180-local-ga-product-truth-audit.md`;
- verify no stale Local GA, Cloud, Enterprise, or legacy hackathon claims are
  present in current product surfaces;
- verify release packets contain command evidence and known limitations;
- verify failures are blockers, not silently documented exceptions.

### Step 6: Blocker Protocol

If the audit loop finds a blocker:

- do not continue implementing on top of stale assumptions;
- fix the blocker first when the fix is clearly within scope;
- otherwise record the blocker in the relevant reference or release planning
  document and ask for direction only when the project cannot safely choose a
  default.

## Workstream A: Local Naming And Contract Cleanup

Goal: remove obsolete public Local terminology before the rest of L3/L4 builds
on top of it.

### A1. Rename runtime profile value

Tasks:

- Replace public `hackathon_local` schema value with `local`.
- Use `local` as the canonical machine value for Entangle Local because it is
  product-stable and does not imply GA status.
- Add compatibility parsing only if needed for old fixtures or release assets.
- Update graph defaults, package scaffolds, examples, smoke scripts, and tests.
- Update release notes to record the migration.

Constraints:

- Do not break existing Local Preview assets without a deliberate migration.
- Keep old release packets historically accurate.
- Do not use a name that implies GA before GA exists.

Acceptance:

- New scaffolds emit `local` and no longer emit `hackathon_local`.
- Active examples use `local` and no longer use `hackathon_local`.
- Validator accepts the new Local profile.
- Tests and smokes use the new Local profile.

### A2. Update public project language

Tasks:

- Update current docs to refer to Entangle Local as the active product.
- Keep historical hackathon documents clearly historical.
- Make the roadmap point from L2 to L3/L4/L5 without ambiguous R1 wording.
- Ensure README, wiki overview, product truth audit, and release index agree.

Constraints:

- Do not rewrite historical decision records as if the history did not happen.
- Do not claim Local GA before the gate passes.

Acceptance:

- Current-state docs call the project Entangle Local.
- Historical hackathon language remains only in historical/reference context.

## Workstream B: L3 Agentic Node Runtime

Goal: every non-user Entangle Local node can be configured as a real coding
agent entity while Entangle owns graph, identity, policy, artifacts, wiki,
communication, and inspection.

### B1. Finalize agent runtime contracts

Tasks:

- Audit `AgentRuntime`, `AgentEngineProfile`, `EffectiveRuntimeContext`, and
  validator semantics after the first OpenCode adapter.
- Add missing runtime status DTOs for engine availability, engine session,
  permission state, and harvested output.
- Ensure graph-level defaults and node-level overrides are explicit.
- Add validation for unsupported engine kinds, contradictory modes, and missing
  required workspace bindings.
- Keep `disabled` as an explicit runtime mode for nodes that should not execute.

Constraints:

- Contracts must remain engine-agnostic.
- OpenCode-specific fields belong under engine profile/configuration, not in
  graph or A2A core.
- Browser-safe shared packages must stay browser-safe.

Current partial implementation:

- `RuntimeInspectionResponse.agentRuntime` now exposes generic status for the
  effective runtime mode, engine profile kind/reference/display name, default
  agent, state scope, last engine session, last engine turn, stop reason, and
  bounded engine failure evidence;
- the host derives this status from the effective runtime context and durable
  runner turn records without adding OpenCode-specific fields to the public
  runtime inspection contract;
- shared host-client detail lines, CLI runtime summaries, and Studio
  selected-runtime details now consume the same host DTO.

Acceptance:

- Host, CLI, Studio, and runner can all reason about effective agent runtime
  state without provider-specific leakage.
- Unknown or impossible runtime bindings fail validation before launch.

### B2. Make the OpenCode adapter production-quality

Tasks:

- Study the local OpenCode source before each deeper adapter change.
- Decide whether Entangle Local should use one-shot `opencode run`, an attached
  OpenCode server, or a hybrid lifecycle per node.
- Implement availability checks for executable, version, config root, DB root,
  and workspace access.
- Persist OpenCode session ids and map them to Entangle session/turn ids.
- Capture structured stdout/stderr, exit reason, error classification, and
  bounded logs.
- Add timeout and cancellation handling.
- Add explicit degraded-runtime evidence when OpenCode is unavailable.
- Add unit tests around process lifecycle, events, timeout, and failures.

Constraints:

- Do not pass unsafe global permission bypass flags as the default.
- Keep engine state under node-scoped engine-state roots.
- Keep source workspace operations inside the node workspace.
- Do not couple runner state to OpenCode internals beyond adapter-owned state.

Current partial implementation:

- the runner now captures OpenCode JSON `sessionID` values as generic
  `engineSessionId` values on engine turn outcomes;
- the OpenCode process is launched with node-scoped `OPENCODE_DB`,
  `OPENCODE_CONFIG_DIR`, `OPENCODE_TEST_HOME`, and XDG config/state/data/cache
  roots under the node engine-state workspace;
- the adapter verifies workspace and engine-state readability/writability
  before spawning OpenCode;
- the adapter now runs an `opencode --version` probe with the same node-scoped
  environment before the turn, persists the generic `engineVersion`, and exposes
  the latest engine version through host runtime inspection, the shared
  host-client presentation layer, CLI, and Studio;
- the adapter now applies a bounded timeout to the version probe and one-shot
  run process, sends `SIGTERM` on timeout, and records classified
  `provider_unavailable` evidence;
- this does not yet complete external cancellation, permission mapping, full
  degraded-runtime status DTOs, attached server lifecycle, policy-gated source
  publication, or artifact restore/replay workflow.

Acceptance:

- A node can execute a real OpenCode-backed turn repeatedly.
- Failures are inspectable from host, CLI, and Studio.
- OpenCode state is node-scoped and survives normal runner restarts where
  appropriate.

### B3. Build the policy and approval bridge

Tasks:

- Define the Entangle Local policy operations needed by coding nodes:
  filesystem read, filesystem write, command execution, git commit, git push,
  artifact publication, wiki update, peer message, graph mutation, and
  approval request.
- Map OpenCode permission events to Entangle approval records where possible.
- Add fallback deny behavior for permission events that cannot be mapped.
- Persist approval requests with enough evidence for operator decisions.
- Feed approval decisions back into the engine lifecycle.
- Add tests for allowed, denied, pending, stale, and orphan permission flows.

Constraints:

- Entangle policy is authoritative.
- OpenCode permission semantics are adapter input, not product policy.
- Default behavior must be conservative.
- User-visible approvals must not require reading raw engine logs.

Current partial implementation:

- the generic engine result/outcome contract now includes permission
  observations with an Entangle-facing operation vocabulary and bounded
  decision/reason evidence;
- `policy_denied` is now a first-class engine failure classification;
- the OpenCode adapter recognizes one-shot CLI permission auto-rejection lines,
  maps OpenCode permission names such as `bash`, `edit`, `read`, `task`,
  `webfetch`, and `external_directory` to generic policy operations, and
  returns a `policy_denied` result instead of silently treating the turn as
  completed;
- host runtime inspection now exposes the latest permission decision,
  operation, and reason through the generic `agentRuntime` status consumed by
  shared host-client detail helpers, CLI, and Studio;
- effective runtime context now carries node-configured
  `policyContext.sourceMutation` defaults, and host source application/
  publication mutations can require an approved runtime approval id before the
  source side effect is accepted;
- approval records, approval request metadata, observed approval activity, and
  approval trace events now carry optional operation and resource scope, and
  host source mutation gates require exact operation/resource matches before
  accepting a supplied approval id;
- the host can now record an explicit operator approval decision through
  `POST /v1/runtimes/{nodeId}/approvals`, creating exact scoped approvals for
  source mutation workflows or deciding an existing pending approval without
  respecifying its scope; the shared host client, CLI, and Studio consume the
  same mutation path;
- this does not yet create durable approval records from live OpenCode
  permission requests or feed approval decisions back into OpenCode because the
  current one-shot `opencode run` lifecycle auto-rejects unless unsafe bypass
  is enabled.

Acceptance:

- Unauthorized file, command, git, publication, or peer operations are blocked.
- Approval-gated work can pause, resume, fail, or complete through existing
  runner/session lifecycle states.

### B4. Complete the node workspace model

Tasks:

- Finalize source, artifact, engine-state, and wiki-repository workspace
  boundaries.
- Ensure each workspace is materialized by host-owned runtime context.
- Add workspace health checks to runtime launch and doctor.
- Decide the first safe memory-as-repo shape.
- Implement wiki-repository initialization only after ownership and migration
  rules are explicit.
- Add migration from file-backed memory to wiki repository if adopted before
  GA.

Constraints:

- Do not expose host filesystem paths in protocol locators.
- Do not let engines read arbitrary local files through memory or artifact
  preview paths.
- Keep wiki writes runner-owned even if an engine suggests content.

Current partial implementation:

- the host materializes the current Local node workspace layout with
  `package`, `injected`, `memory`, `workspace`, `runtime`, `retrieval`,
  `source`, `engine-state`, and `wiki-repository` roots;
- runtime inspection now exposes generic `workspaceHealth` summaries using
  logical surface names and bounded readiness reasons rather than protocol
  locators;
- host reconciliation blocks a desired running runtime with a failed observed
  state when a required workspace surface is degraded;
- shared host-client detail helpers, CLI summaries, and Studio selected-runtime
  details show the same workspace health summary;
- the runner now mirrors the active `memory/wiki` tree into a local
  `wiki-repository` git repository after completed executable turns, commits
  changed snapshots on the fixed `entangle-wiki` branch, and records
  `committed`, `unchanged`, `not_configured`, or `failed` sync outcomes on
  runner turns, host observed activity, host events, CLI output, and Studio
  turn inspection;
- this is a conservative local snapshot, not yet a full memory-as-repo
  migration or remote publication workflow.
- `entangle local doctor` now reports wiki repository initialization, dirty
  working trees, missing HEAD commits, and git inspection failures as runtime
  workspace warnings without mutating node memory.

Acceptance:

- Each node has clear workspace roots with no ambiguous ownership.
- Memory/wiki state can be inspected and backed up as part of Local.

### B5. Harvest diffs, artifacts, and engine outputs

Tasks:

- Detect source workspace changes after engine turns.
- Capture git diff summaries, changed files, and source-change candidates.
- Decide when runner auto-commits versus creates an approval request.
- Materialize report artifacts from engine output and workspace state.
- Link produced artifacts to turns, sessions, messages, and git refs.
- Add artifact history/diff host API, host-client, CLI, and Studio surfaces.
- Add bounded previews for harvested text/code outputs.

Constraints:

- Artifacts remain the primary work handoff substrate.
- Engine-generated files are not automatically trusted as published artifacts.
- Publication must respect node git principal and policy.

Current partial implementation:

- runner turns now carry an optional generic `sourceChangeSummary`;
- the runner prepares a source baseline immediately before engine execution and
  harvests changes after success or failure, so partial engine writes are still
  inspectable;
- source harvesting uses a runner-owned shadow git directory under
  `runtime/source-snapshot.git` and does not create `.git` inside the node
  `source/` workspace;
- changed-file counts, additions/deletions, changed-file summaries, bounded
  diff excerpts, truncation state, and bounded failure reasons are persisted
  without exposing runtime-local workspace paths in protocol-facing locators;
- host observed runner-turn activity, `runner.turn.updated` events, and runtime
  inspection now carry the latest source-change summary;
- shared host-client helpers, CLI output, and Studio runtime details now expose
  the same source-change summary;
- changed source turns now create durable pending source-change candidate
  records with optional shadow-git tree snapshot references;
- runner turn records, host observed activity, and `runner.turn.updated` events
  carry `sourceChangeCandidateIds`;
- host runtime inspection exposes the latest candidate id, and read-only
  source-change candidate list/detail APIs are consumed by shared host-client
  helpers, CLI commands, and Studio selected-runtime details;
- host runtime candidate diff APIs now expose bounded read-only `text/x-diff`
  previews for candidates with shadow-git tree snapshots, consumed by the
  shared host client, CLI `source-candidate --diff`, and Studio selected-runtime
  details;
- host runtime candidate file-preview APIs now expose bounded read-only UTF-8
  previews for paths listed in the candidate changed-file summary, consumed by
  the shared host client, CLI `source-candidate --file`, and Studio
  selected-runtime details;
- host runtime candidate review APIs now record accepted, rejected, and
  superseded review decisions, emit `source_change_candidate.reviewed`, and are
  consumed by shared host-client, CLI `source-candidate --review`, and Studio
  selected-runtime actions;
- accepted candidates can now be applied into runtime-local source history
  after validating the current source workspace tree against the candidate
  snapshot; the host records source-history entries, annotates candidates,
  emits `source_history.updated`, and exposes host-client, CLI, and Studio
  apply/list/detail surfaces;
- applied source-history entries can now be published as git commit artifacts;
  the host materializes the source-history tree into a publication repository,
  pushes to the resolved git target when possible, records publication
  metadata and the resolved target on both the source-history entry and artifact
  locator, emits `source_history.published`, rejects repeated failed attempts
  unless `retry: true` is supplied, and exposes host-client, CLI, and Studio
  publish surfaces;
- source application and source-history publication requests can now carry
  `approvalId`; node source mutation policy can require approval for source
  application, for all source publication, or for non-primary publication
  targets by default, and accepted approval ids are persisted on source records
  and source history events;
- source mutation approvals are now operation and resource scoped:
  source-candidate application requires `source_application` plus the concrete
  source-change candidate id, while source-history publication requires
  `source_publication` plus the concrete source-history and git target tuple;
- materialized git artifacts now have bounded host-owned history and diff
  inspection through host API, host-client, CLI, and Studio surfaces;
- live OpenCode permission-to-approval flow, non-primary target
  provisioning/fallback behavior, and artifact restore/replay workflow remain
  open.

Acceptance:

- An OpenCode-backed node can modify its workspace, produce an artifact, and
  expose inspectable diff/history through Entangle Local.

### B6. Complete Entangle message to engine prompt flow

Tasks:

- Improve prompt assembly for inbound tasks with graph context, edge policy,
  peer routes, artifacts, memory, approvals, and workspace boundaries.
- Ensure inbound `task.request`, `task.handoff`, approval, and conversation
  lifecycle messages produce correct engine or state-only behavior.
- Preserve existing rule that non-executable coordination messages do not start
  fresh engine turns.
- Add prompt snapshots or bounded evidence for debugging.

Constraints:

- A2A contracts remain coordination contracts, not engine prompts.
- Prompt detail must be enough for engine quality without leaking secrets.

Acceptance:

- The same task launched from CLI, Studio, or Nostr becomes a consistent
  engine turn.
- Prompt evidence is inspectable without exposing secrets.

### B7. Complete engine result to Entangle action flow

Tasks:

- Normalize engine results into assistant messages, tool observations,
  artifacts, approval requests, commits, handoffs, and lifecycle changes.
- Make handoff directives work from OpenCode outcomes, not only from legacy
  injected engines.
- Preserve graph edge constraints for every outbound peer message.
- Add tests for produced artifact, direct result, handoff, approval request,
  failure, and no-op outcomes.

Constraints:

- Runner owns publication and messaging side effects.
- Engines may propose actions; Entangle validates and performs them.

Acceptance:

- A coding node can collaborate with another node through Entangle messages and
  git-backed artifacts while remaining policy-bound.

### B8. Add CLI and Studio runtime configuration

Tasks:

- Show effective agent runtime mode and engine profile per node.
- Add graph/node editing support for engine profile selection and disabled
  mode.
- Expose OpenCode availability, last engine session, failure evidence, approval
  state, changed files, produced artifacts, and recent engine events.
- Add CLI commands for agent runtime inspection and configuration.
- Add Studio panels for runtime engine state without hiding raw evidence.

Constraints:

- CLI and Studio must use the same host-client contracts.
- Configuration must be graph/node state, not hidden environment-only state.

Current partial implementation:

- CLI and Studio now show effective agent-runtime mode/profile and the last
  engine version/session when host runtime inspection reports them;
- CLI and Studio now also show the latest runner-owned source workspace change
  summary when host runtime inspection or runtime-turn records report it;
- CLI and Studio now inspect pending source-change candidates through the same
  host-backed read model used by the host client, and can inspect bounded
  candidate diffs plus listed-file previews where shadow-git tree snapshots are
  available, while also recording accepted/rejected/superseded candidate review
  decisions, source-history application, and source-history publication through
  the host boundary;
- CLI now records scoped runtime approval decisions, while Studio can
  approve/reject selected pending approvals through the shared host-client
  mutation;
- CLI now provides `host nodes agent-runtime` for graph-backed node-level
  runtime mode, engine-profile, and default-agent configuration with dry-run
  support while preserving unrelated managed-node bindings;
- Studio's Managed Node Editor now loads catalog engine profiles and writes the
  same graph-backed `agentRuntime` fields for node-level runtime mode,
  engine-profile, and default-agent overrides;
- OpenCode availability probing in configuration context, approval blockers,
  produced artifacts, richer source publication history views, and recent
  engine-event panels remain open.

Acceptance:

- An operator can see which engine a node uses, why it failed, what it changed,
  what it produced, and which approval is blocking it.

### B9. Add L3 end-to-end gates

Tasks:

- Add an OpenCode-backed disposable runtime smoke.
- Exercise task launch, node workspace operation, artifact production, git
  handoff, downstream retrieval, and inspectable runtime state.
- Add negative smoke coverage for missing OpenCode and denied policy.
- Update release packet for `v0.3-local-agentic-node-runtime`.

Constraints:

- Smokes must run against the same Local host/runner/relay/Gitea topology used
  by the product.
- Where OpenCode is unavailable in CI, the failure must be explicit and not
  silently skipped.

Acceptance:

- L3 exits only when a real OpenCode-backed node completes a graph-valid local
  coding workflow under Entangle policy.

## Workstream C: L4 Local Reliability

Goal: Entangle Local becomes robust enough for repeated technical use.

### C1. Build `entangle local doctor`

Tasks:

- Add a CLI command that checks Node, pnpm, Docker, Compose, host, Studio,
  relay, Gitea, runner image, local state layout, OpenCode availability, model
  secrets if used, git principals, and workspace health.
- Provide human-readable and JSON output.
- Add severity levels and remediation hints.
- Reuse existing preflight code where possible.

Constraints:

- Doctor must inspect and report; it must not mutate state by default.
- Checks must distinguish warnings from blockers.

Current partial implementation:

- `entangle local doctor` now provides a read-only operator diagnostic with
  human-readable and JSON output;
- the first doctor checks required Local profile files, Node 22+, `pnpm`,
  Docker CLI, Docker Compose, Docker daemon, Local Compose config, the local
  runner image, OpenCode availability, `.entangle/host`, live host status,
  host-reported runtime workspace health, runtime wiki repository health,
  host-managed git principals, Studio, Gitea, and the local relay;
- default mode reports optional local infrastructure gaps as warnings, while
  `--strict` escalates those gaps to failures for release and smoke
  preparation;
- `--skip-live` keeps the command offline/read-only against local files and
  local command availability.

Acceptance:

- A user can diagnose the common Local failure modes without reading source
  code or raw `.entangle` files.

### C2. Build conservative repair

Tasks:

- Add repair actions for stale observed runtime records, orphaned runner state,
  old Gitea profile state, missing directories, and safe config drift.
- Require explicit flags for destructive or high-risk actions.
- Record repair events in host/recovery history.
- Add dry-run previews.

Constraints:

- Repair must never silently delete user work, repositories, artifacts, or
  wiki memory.
- Destructive reset remains explicit and separately named.

Acceptance:

- Common stale Local states can be repaired or explained conservatively.

### C3. Add backup and restore

Tasks:

- Define the Local backup bundle contents:
  host state, runtime state, workspace metadata, git repositories, wiki memory,
  release/version metadata, and selected config.
- Explicitly document excluded secrets and external service state.
- Implement export and restore commands.
- Add validation before restore.
- Add restore smoke coverage.

Constraints:

- Secrets must not be accidentally bundled unless explicitly designed and
  protected.
- Restore must detect incompatible state layout versions.

Acceptance:

- A user can back up Entangle Local and restore it into a clean Local
  environment with documented limitations.

### C4. Add state versioning and upgrade checks

Tasks:

- Version the local state layout.
- Add startup compatibility checks.
- Add migration notes between L2, L3, L4, and GA.
- Add machine-readable upgrade status.
- Add downgrade/non-supported-version error messages.

Constraints:

- Do not silently mutate unknown future state.
- Migrations must be idempotent or guarded.

Acceptance:

- Entangle Local can detect unsupported or outdated local state before causing
  damage.

### C5. Add diagnostics and logs bundle

Tasks:

- Collect host logs, runner logs, Docker Compose status, recent events,
  degraded runtime records, OpenCode failure evidence, relay status, and Gitea
  status into a support bundle.
- Redact secrets.
- Add CLI and docs.

Constraints:

- Logs bundle must be useful without exposing secrets.
- Bundle format must be stable enough to attach to issues or release
  validation reports.

Acceptance:

- A user can produce one diagnostics bundle for Local support/debugging.

### C6. Add repeated-use reliability smokes

Tasks:

- Add non-disposable start/stop/restart validation.
- Add upgrade rehearsal from previous Local release state.
- Add backup/restore smoke.
- Add repair dry-run smoke.
- Add logs-bundle smoke.

Constraints:

- Disposable smokes are not enough for L4.
- Repeated-use tests must preserve user-data safety.

Acceptance:

- L4 exits only when Entangle Local can survive repeated use, restart, backup,
  restore, and repair workflows.

## Workstream D: L5 Entangle Local GA

Goal: release Entangle Local as a complete local/developer product.

### D1. Complete install and first-run path

Tasks:

- Document clean install from clone or release package.
- Add first-run setup for local profile.
- Add model/OpenCode setup guidance.
- Add a single recommended demo path.
- Ensure a technical user can complete the flow without reading source code.

Constraints:

- Do not rely on undocumented local machine state.
- Keep Cloud/Enterprise out of the Local install flow.

Acceptance:

- Clean-machine or clean-clone rehearsal passes using only documented steps.

### D2. Complete Entangle Local docs

Tasks:

- Write Local user guide.
- Write operator guide.
- Write troubleshooting guide.
- Write architecture summary for Local.
- Write policy and approval guide.
- Write git/wiki/artifact workflow guide.
- Write limitations and non-goals.

Constraints:

- Docs must describe implemented behavior, not aspirations.
- Limitations must be explicit.

Acceptance:

- A user can operate Local and understand its boundaries from docs alone.

### D3. Close release-control packet

Tasks:

- Create `releases/local/l5-entangle-local-ga.md`.
- Record verification commands and results.
- Record known limitations.
- Record rollback guidance.
- Record upgrade guidance from previous Local releases.
- Tag only after gates pass.

Constraints:

- Release packet must not duplicate canonical truth unnecessarily.
- No GA tag before release evidence exists.

Acceptance:

- The GA packet can stand as the authoritative release evidence.

### D4. Audit public claims

Tasks:

- Audit README, wiki, release notes, examples, website claims, and package
  metadata.
- Remove or qualify stale Local claims.
- Ensure `hackathon_local` is gone from current product surfaces.
- Ensure Cloud and Enterprise are not implied as implemented.

Constraints:

- Website changes are separate if the website is in another repository.
- Historical references can remain historical.

Acceptance:

- Public claims match the implemented Entangle Local product.

### D5. Final GA verification

Tasks:

- Run `pnpm install --frozen-lockfile`.
- Run `git diff --check`.
- Run `pnpm verify`.
- Run `pnpm build`.
- Run `pnpm ops:check-local:strict`.
- Run disposable and non-disposable Local smokes.
- Run OpenCode-backed L3 smoke.
- Run backup/restore and repair smokes.
- Run clean-clone rehearsal.

Constraints:

- Failing gates are blockers, not release notes.
- Manual verification cannot replace missing automated coverage for critical
  behavior.

Acceptance:

- Tag `v1.0-local` only after all GA gates pass.

## Execution Order

The professional order is below. Every numbered item starts with the mandatory
per-step audit loop and ends with the closure audit.

1. A1/A2: clean Local naming and current product language.
2. B1/B2: stabilize contracts and OpenCode lifecycle.
3. B3: policy and approval bridge.
4. B4/B5: workspaces, git/wiki behavior, diff/artifact harvesting.
5. B6/B7: full message-to-engine and engine-to-Entangle action loop.
6. B8/B9: CLI/Studio visibility and L3 smoke gates.
7. C1-C6: Local reliability.
8. D1-D5: GA documentation, release control, public claim audit, and final
   verification.

## Definition Of Done

Entangle Local is complete when:

- every active non-user node can run as a policy-bound coding agent through
  OpenCode by default;
- each node has inspectable identity, runtime, workspace, artifact, git, and
  wiki state;
- nodes can collaborate through Entangle messages and artifacts rather than
  hidden engine-only state;
- user approvals and policy gates are enforced before risky actions;
- CLI and Studio expose the same host truth;
- doctor, repair, backup, restore, upgrade, logs, and smokes are productized;
- current docs and public claims match the implementation;
- all GA verification gates pass from a clean state.
