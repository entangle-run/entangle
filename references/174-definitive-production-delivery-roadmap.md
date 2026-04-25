# Definitive Production Delivery Roadmap

This document is the execution roadmap for taking Entangle from the current
local operator baseline to a complete production-grade product.

It complements the accepted production redesign program under
`wiki/redesign/latticeops/` and the current implementation-truth audit in
`references/59-implementation-state-and-delivery-audit.md`.

## Purpose

The project now needs a release-oriented delivery plan, not another broad
architecture note.

This roadmap defines:

- the near-term presentable milestone;
- the later product releases;
- the audit and reconsideration loop used before and after every serious
  slice;
- quality gates for promotion between releases;
- the remaining gap between Entangle's local runtime baseline and the complete
  production product vision.

## Planning Stance

The correct next move is disciplined completion, not architectural churn.

The repository already has:

- a real host control plane;
- a real per-node runner;
- real local Nostr transport;
- real git-backed artifact materialization and handoff;
- Docker-backed local runtime lifecycle;
- host-owned runtime, session, turn, approval, artifact, recovery, and event
  inspection surfaces;
- Studio and CLI surfaces over the same host boundary;
- a credible `pnpm verify` quality baseline.

The repository does not yet have:

- production persistence on PostgreSQL;
- workspace-aware authentication and authorization;
- tenant isolation;
- production-grade policy enforcement;
- production artifact service over object storage;
- production sandbox and scheduler infrastructure;
- search, analytics, billing, notifications, and compliance surfaces.

That means the next presentable milestone should be a local operator release,
not a false production claim.

## Global Delivery Rules

Every release and every substantial slice must follow the same loop.

### Pre-Slice Audit

Before implementation:

1. Read the current canonical state:
   - `README.md`;
   - `resources/README.md`;
   - `wiki/overview.md`;
   - `wiki/index.md`;
   - `wiki/log.md`;
   - this roadmap;
   - the current implementation audit;
   - any directly touched reference files.
2. Check `git status --short`.
3. Identify user or previous-session changes already present in the working
   tree.
4. Map the requested slice to:
   - current code ownership;
   - current contracts;
   - current tests;
   - current docs;
   - known drift.
5. Write the gap statement before editing code.

### Implementation Discipline

During implementation:

1. Keep the slice narrow.
2. Update contracts before widening behavior.
3. Keep host, runner, CLI, and Studio boundaries clean.
4. Do not move authority across boundaries casually:
   - host owns control-plane state;
   - runner owns runner-local lifecycle mutation;
   - CLI and Studio are clients;
   - shared packages own shared presentation and DTO contracts.
5. Avoid temporary behavior that contradicts the final architecture.
6. Prefer tests around behavior and contracts, not only snapshots.

### Post-Slice Audit

After implementation:

1. Run the narrow test suite for the touched package.
2. Run `pnpm verify` unless the slice is documentation-only.
3. Run local smoke checks when deployment, Docker, relay, Gitea, or runtime
   lifecycle behavior changed.
4. Update affected canonical docs.
5. Update `references/README.md` if a reference file was added.
6. Update `wiki/log.md` if project state or design baseline changed.
7. Re-read the changed docs for contradictions.
8. Commit the coherent batch.

### Reconsideration Gate

After every major release, explicitly answer:

1. Did implementation evidence invalidate any redesign assumption?
2. Did the current slice create a new boundary or authority rule?
3. Did the local operator profile become misleading relative to production?
4. Did quality drift increase?
5. Is the next planned release still the highest-value release?

If any answer is yes, update this roadmap or add a superseding decision record
before continuing.

## Release Taxonomy

This roadmap uses six releases.

| Release | Name | Purpose |
| --- | --- | --- |
| R0 | Closure and Ledger | Freeze current state, close dirty slices, and create release truth. |
| R1 | Local Operator Baseline | Presentable local Entangle v0.1. |
| R2 | Production Foundation | Persistence, identity, tenancy, and API hardening. |
| R3 | Governed Execution MVP | End-to-end production-style session execution. |
| R4 | Private Beta | Design-partner readiness, integrations, search, and operations. |
| R5 | Production Launch | Paid-customer readiness, security, scale, and compliance. |
| R6 | Enterprise Complete | Full product vision: advanced governance, marketplace, analytics, and self-host maturity. |

## R0: Closure And Ledger

Target duration: 0.5 to 1 day.

Target outcome: the repository is coherent enough to start a release closure
instead of continuing as open-ended slice work.

### Scope

- Audit the working tree.
- Finish or explicitly defer any in-progress runner/session/approval work.
- Preserve all user changes.
- Create a release ledger for R1 through R6.
- Keep the active R1 ledger in
  [177-r1-local-operator-release-ledger.md](177-r1-local-operator-release-ledger.md).
- Ensure current docs do not misstate the implementation phase.

### Tasks

1. Inspect current dirty files.
2. Identify whether each dirty file belongs to:
   - the active approval/session slice;
   - unrelated user work;
   - generated output;
   - documentation drift.
3. Complete active slice tests.
4. Update the relevant reference slice.
5. Update `wiki/log.md`.
6. Run focused tests.
7. Run `pnpm verify`.
8. Commit the coherent R0 batch.

### Acceptance Criteria

- `git status --short` is clean after commit, or only explicitly deferred user
  changes remain.
- `pnpm verify` passes.
- Current canonical docs identify the repository as a partial end-to-end local
  runtime implementation, not a production product.
- The remaining production scope is explicit.

### Exit Decision

Do not enter R1 closure if the runner/session/approval lifecycle has unresolved
failing tests or if docs still describe unimplemented production features as
current behavior.

## R1: Local Operator Baseline

Target duration: 1 to 2 days from the current repository state.

Target outcome: Entangle v0.1 local/operator baseline is presentable,
verifiable, and honest.

### Product Promise

R1 proves the architecture locally:

- a user/operator can run a graph-native local control plane;
- the host can manage packages, graph state, runtime lifecycle, and observed
  state;
- runners can execute real provider-backed turns;
- messages coordinate work;
- git-backed artifacts carry work between nodes;
- CLI and Studio can inspect the same host truth.

R1 does not claim production tenancy, production auth, production sandboxing,
or enterprise compliance.

### Required Capabilities

1. Contracts and validation:
   - package manifests validate;
   - graph specs validate;
   - transport and resource binding errors are explicit;
   - approval/session/turn/artifact state contracts are current.
2. Host:
   - status, events, graph, package-source, node, edge, runtime, session,
     approval, turn, artifact, and recovery read surfaces are coherent;
   - local operator-token behavior is documented and tested;
   - runtime reconciliation findings are operator-readable.
3. Runner:
   - long-lived service starts from injected runtime context;
   - Nostr transport path works through local relay;
   - controlled handoff path stays edge-bound;
   - approval lifecycle messages materialize runner-local approval state;
   - session repair does not strand completed or approved work;
   - git artifact publication and retrieval work in the local profile.
4. Studio:
   - graph and runtime state are host-backed;
   - runtime/session/artifact/approval/turn/recovery panels do not invent
     state;
   - graph, node, edge, package-source, and lifecycle mutations go through host
     APIs.
5. CLI:
   - headless inspection and key mutations work through the same host client;
   - `--summary` and `--dry-run` flows are coherent for R1 workflows.
6. Deployment:
   - local Compose profile is documented;
   - preflight and smoke commands are documented;
   - disposable runtime smoke is the strongest proof path.

### R1 Freeze Scope

Allowed:

- bug fixes;
- consistency repairs;
- targeted diagnostics;
- docs and release notes;
- smoke hardening where it protects the local operator baseline.

Not allowed:

- PostgreSQL migration;
- full workspace tenancy;
- SSO/SAML/SCIM;
- billing;
- marketplace;
- broad UI redesign;
- Kubernetes production deployment;
- new integration catalog.

### R1 Verification

Required:

- `pnpm verify`;
- `pnpm --filter @entangle/runner test` after runner changes;
- `pnpm --filter @entangle/host test` after host changes;
- `pnpm --filter @entangle/validator test` after validation changes;
- `pnpm ops:check-local:strict` when local deployment files changed.

Preferred when Docker is available:

- `pnpm ops:smoke-local:disposable`;
- `pnpm ops:smoke-local:disposable:runtime`.

### R1 Acceptance Criteria

- The repository can be described as "Entangle v0.1 local operator baseline".
- Local end-to-end proof covers host, runner, relay, git service, artifact
  handoff, provider-compatible execution, and operator inspection.
- README, wiki overview, implementation audit, and
  [177-r1-local-operator-release-ledger.md](177-r1-local-operator-release-ledger.md)
  agree.
- Any production-grade exclusions are explicit.
- The release can be tagged without apologizing for hidden fake behavior.

### R1 Release Artifacts

- Release note: `references/<next>-local-operator-baseline-release.md`.
- Updated `README.md`.
- Updated `wiki/overview.md`.
- Updated `wiki/log.md`.
- Clean commit and optional tag: `v0.1-local-operator-baseline`.

## R2: Production Foundation

Target duration: 3 to 5 weeks after R1 for a small focused team, longer for a
single developer.

Target outcome: replace local-only foundations with production-capable
foundations while preserving Entangle's graph-native semantics.

### Scope

1. Persistence:
   - introduce PostgreSQL;
   - define migrations;
   - create durable tables for workspaces, packages, graphs, sessions,
     artifacts, approvals, runtimes, events, audit logs, and outbox events;
   - migrate read/write services behind repositories.
2. Identity:
   - introduce authenticated users;
   - define local development auth;
   - establish OIDC-ready user model;
   - keep bootstrap operator token only as local fallback.
3. Authorization:
   - define workspace roles;
   - enforce authorization on mutating routes;
   - add tenant/workspace context to host API calls;
   - preserve service identities separately from user identities.
4. API hardening:
   - stabilize versioned `/v1` API shape;
   - standardize errors;
   - add request ids and idempotency keys for retryable mutations;
   - generate or validate OpenAPI coverage.
5. Audit:
   - move audit from local event convenience to append-only production audit
     semantics;
   - log actor, action, target, decision, request id, and trace id.

### Required Decisions

- Database migration tool.
- Auth provider strategy for local, hosted, and self-host modes.
- Whether the current `entangle-host` evolves into the production control
  plane or is split behind modules.
- Event bus choice for MVP: in-process outbox consumer, NATS JetStream, or
  equivalent.

### Acceptance Criteria

- No unauthenticated mutating endpoint remains in production profile.
- Tenant/workspace context is required for tenant-scoped operations.
- PostgreSQL is the source of truth for production profile control-plane state.
- Local file-backed state remains only as a local/dev profile or migration
  bridge.
- Authorization tests cover every core resource class.
- Audit records exist for all mutating control-plane actions.

### Reconsideration Gate

If PostgreSQL migration exposes that current local state shapes are too
file-layout-specific, introduce repository-layer DTOs rather than pushing file
layout assumptions into production tables.

## R3: Governed Execution MVP

Target duration: 6 to 8 weeks after R2.

Target outcome: a user can launch, monitor, approve, and inspect a governed
AI-work session in a production-style environment.

### Scope

1. Session launch:
   - user/API-triggered session creation;
   - graph revision selection;
   - target node or intake path;
   - inputs, attachments, budget, deadline, and approval requirements.
2. Runtime orchestration:
   - production executor abstraction;
   - sandbox profile definition;
   - scoped runtime context injection;
   - retry and failure policy.
3. Model gateway:
   - provider routing behind internal boundary;
   - secret references instead of direct credential handling;
   - usage and cost metadata;
   - provider error normalization.
4. Tool gateway:
   - governed tool registration;
   - schema validation;
   - audit for tool calls;
   - scoped tool grants.
5. Artifact service:
   - object storage-backed artifacts;
   - metadata in PostgreSQL;
   - lineage;
   - markdown/text/json previews;
   - publication records.
6. Approvals:
   - approval inbox;
   - approve, reject, request changes;
   - approval evidence;
   - policy-triggered approval gates.
7. Timeline and trace:
   - session event timeline;
   - runtime and model/tool events;
   - artifact and approval linkage.

### Acceptance Criteria

- A new workspace can run the first governed session in under one hour.
- A reviewer can approve or reject an artifact with context.
- An operator can diagnose a failed runtime from UI and CLI evidence.
- Execution uses scoped secrets and sandbox boundaries.
- MVP E2E tests pass for:
  - workspace setup;
  - package ingestion;
  - graph publication;
  - session launch;
  - artifact creation;
  - approval gate;
  - trace inspection;
  - unauthorized read denial.

### Reconsideration Gate

If production execution needs Temporal, NATS, or Kubernetes earlier than
planned, introduce them behind interfaces and keep local R1 behavior as a dev
profile, not as the production runtime model.

## R4: Private Beta

Target duration: 6 to 8 weeks after R3.

Target outcome: design partners can run real workflows with support.

### Scope

1. Product completeness:
   - onboarding templates;
   - graph validation UX;
   - graph revision diff;
   - package promotion;
   - approval inbox;
   - search v1;
   - cost dashboard v1.
2. Integrations:
   - GitHub;
   - GitLab or Gitea;
   - Slack;
   - webhooks.
3. Operations:
   - staging environment;
   - backup and restore drills;
   - load test baseline;
   - design partner support runbooks.
4. Security:
   - tenant isolation tests;
   - dependency and container scanning;
   - threat model review;
   - audit export v1.

### Acceptance Criteria

- 3 to 5 design partners can run real workflows.
- Median time to first successful run is under 60 minutes.
- Critical workflow success rate is above 95 percent in beta environments.
- No known critical or high security findings remain unaddressed.
- Backup restore has been tested.

### Reconsideration Gate

If design partners do not understand graph composition, prioritize templates,
workflow-first views, and validation explainers before adding more runtime
features.

## R5: Production Launch

Target duration: 8 to 12 weeks after R4.

Target outcome: paid production customers can be onboarded with security,
support, and operational confidence.

### Scope

1. Enterprise identity:
   - SAML;
   - SCIM;
   - MFA policy;
   - emergency access flow.
2. Authorization:
   - advanced RBAC;
   - ABAC for environment, data class, graph, node, action, and resource;
   - policy decision audit.
3. Compliance:
   - SOC 2 Type I readiness;
   - GDPR data export and deletion workflows;
   - retention policies;
   - audit export.
4. Scale and reliability:
   - production SLOs;
   - alerting;
   - load testing;
   - disaster recovery targets;
   - incident runbooks.
5. Commercial:
   - billing and entitlements;
   - plan limits;
   - usage metering;
   - support workflows.

### Acceptance Criteria

- Production readiness review passes.
- Penetration test findings are remediated or formally accepted.
- RPO/RTO targets are validated.
- SLO dashboards and alerts are active.
- Paid customers can be onboarded without manual engineering intervention for
  ordinary setup.

### Reconsideration Gate

If compliance work uncovers audit or retention gaps in earlier data models,
stop feature work and repair the data model before onboarding regulated
customers.

## R6: Enterprise Complete

Target duration: ongoing after R5.

Target outcome: complete the full LatticeOps/Entangle enterprise vision.

### Scope

1. Advanced governance:
   - policy simulation;
   - policy test suites;
   - tamper-evident audit storage;
   - data-classification-aware model and tool routing.
2. Artifact maturity:
   - rich previews;
   - comments;
   - approvals;
   - redaction;
   - version comparison;
   - publication workflows.
3. Memory governance:
   - human-reviewed memory promotion;
   - retention;
   - deletion;
   - provenance;
   - semantic search with authorization filters.
4. Integrations:
   - Jira;
   - Linear;
   - Teams;
   - Google Drive;
   - Confluence;
   - SharePoint;
   - ServiceNow;
   - Zendesk.
5. Analytics:
   - success rate;
   - cost attribution;
   - model/tool usage;
   - approval latency;
   - artifact acceptance;
   - department and workspace KPIs.
6. Platform:
   - multi-region options;
   - self-host Helm chart;
   - Terraform examples;
   - air-gapped install path;
   - SIEM export;
   - warehouse export.
7. Ecosystem:
   - private package catalog;
   - package evaluation suites;
   - regression tests;
   - marketplace path only after governance is mature.

### Acceptance Criteria

- Enterprise customers can run governed AI work across multiple departments.
- Security, audit, retention, and export workflows are customer-operable.
- Self-host deployment has documented upgrade and backup paths.
- Package quality can be evaluated and regressed before promotion.
- Analytics explain operational value, cost, risk, and reliability.

## Cross-Release Epics

These epics span multiple releases and must not be implemented as one large
undifferentiated rewrite.

### Contracts

Owner packages:

- `packages/types`;
- `packages/validator`;
- generated OpenAPI and clients when introduced.

Rules:

- primary contracts remain machine-readable;
- validators own semantic correctness;
- generated artifacts are derivative;
- every API widening has tests and documentation.

### Control Plane

Owner service:

- `services/host` in the current repository shape.

Production evolution:

- keep host as the control-plane facade;
- introduce persistence and service modules behind it;
- split services only when scale, security, or team ownership justify it.

### Runner And Execution

Owner service:

- `services/runner`.

Rules:

- runner-local lifecycle mutation remains runner-owned;
- host can observe and reconcile, but must not silently edit runner-owned truth;
- execution providers stay behind the internal agent-engine boundary;
- sandbox and secret scopes become production requirements by R3.

### Artifacts

Current state:

- git-backed local artifacts and handoff are real.

Production evolution:

- git remains a first backend and collaboration path;
- object storage becomes the production blob store;
- artifact metadata, lineage, approvals, and publication state live in the
  production database;
- connectors publish artifacts outward without becoming the source of truth.

### Studio

Rules:

- Studio is an operator console, not a second control plane;
- every mutation uses host APIs;
- Studio should render host-owned state and shared presentation helpers;
- richer UX follows host capability, not the reverse.

### CLI

Rules:

- CLI remains thin and automation-friendly;
- CLI should preserve JSON and summary output modes;
- CLI should use the same host client and presentation helpers as Studio where
  practical.

### Deployment

R1:

- Docker Compose local operator profile.

R3 and later:

- production container artifacts;
- Kubernetes or equivalent scheduler;
- object storage;
- PostgreSQL;
- event bus;
- observability pipeline.

R5 and later:

- Helm charts;
- GitOps;
- Terraform examples;
- backup and restore drills;
- upgrade and rollback runbooks.

## Quality Gates

### Gate A: Local Operator Baseline

Required:

- `pnpm verify` passes;
- local smoke commands are documented;
- current implementation audit is accurate;
- known local-profile limitations are explicit.

### Gate B: Production Foundation

Required:

- production profile has no unauthenticated mutations;
- PostgreSQL migrations run cleanly;
- authorization tests cover core resources;
- audit writes are tested;
- OpenAPI/API contract drift is checked.

### Gate C: Governed Execution MVP

Required:

- E2E session workflow passes;
- approval gate workflow passes;
- artifact lineage workflow passes;
- unauthorized access denial passes;
- model/provider failure evidence is inspectable.

### Gate D: Private Beta

Required:

- design partners can onboard;
- restore drill passes;
- security review for beta scope passes;
- critical workflow success rate exceeds 95 percent;
- support runbooks exist.

### Gate E: Production Launch

Required:

- pen test completed and remediated;
- SLO dashboards active;
- incident runbooks complete;
- billing and entitlements operational;
- compliance readiness review passed.

## 48-Hour Presentable Milestone Plan

If the project must produce the strongest possible result within two days, the
goal is R1 release closure.

### Day 1

1. Freeze scope:
   - no production infra;
   - no new product modules;
   - only closure, correctness, docs, and verification.
2. Close active dirty slice:
   - finish tests;
   - update reference slice;
   - update log;
   - run package tests.
3. Audit docs:
   - README;
   - wiki overview;
   - implementation audit;
   - implementation strategy;
   - this roadmap.
4. Run `pnpm verify`.
5. Commit coherent closure batch.

### Day 2

1. Run local preflight.
2. Run disposable smoke if Docker is available.
3. Fix only release-blocking failures.
4. Create R1 release note.
5. Update README and wiki to point at R1 status.
6. Run final `pnpm verify`.
7. Commit release note and docs.
8. Tag if desired.

### Day 2 Exit Statement

The correct public statement is:

> Entangle v0.1 is a local operator baseline for graph-native AI
> organizations. It proves the host/runner/transport/artifact/control-surface
> architecture locally and defines the production roadmap, but it is not yet a
> production multi-tenant enterprise platform.

## Completion Forecast

Assuming sustained disciplined execution:

| Milestone | Realistic Target |
| --- | --- |
| R1 local operator baseline | late April 2026 |
| R2 production foundation | May to June 2026 |
| R3 governed execution MVP | June to July 2026 |
| R4 private beta | August to September 2026 |
| R5 production launch | October to November 2026 |
| R6 enterprise complete | late 2026 to early 2027 |

This forecast assumes scope control. It should be revised after every release
gate using repository evidence, not optimism.

## Explicit Non-Goals Before R1

- No billing.
- No enterprise SSO.
- No marketplace.
- No broad connector catalog.
- No PostgreSQL migration.
- No Kubernetes production deployment.
- No claims of tenant isolation.
- No claims of production compliance.

## Explicit Non-Goals Before R3

- No full marketplace.
- No broad analytics suite.
- No SOC 2 claim.
- No unrestricted autonomous topology mutation.
- No multi-region production promise.

## Highest-Risk Areas

1. Production persistence migration:
   local state is useful, but production will require stricter transactional
   semantics and migrations.
2. Identity and authorization:
   bootstrap token semantics must not be mistaken for production identity.
3. Sandbox execution:
   Docker local lifecycle is not production-grade executor isolation.
4. Artifact governance:
   git handoff is strong, but production artifacts need metadata, lineage,
   object storage, previews, permissions, and retention.
5. Product complexity:
   graph-native control can overwhelm users without templates, validation, and
   workflow-first UX.
6. Scope creep:
   integrations, marketplace, and analytics must not outrun governed execution
   and auditability.

## Immediate Next Slice

The next implementation slice should be release closure, not feature widening.

Recommended order:

1. Finish and commit any active approval/session lifecycle changes.
2. Re-run focused runner and validator tests.
3. Run `pnpm verify`.
4. Add an R1 release note.
5. Run local deployment preflight and, where available, disposable runtime
   smoke.
6. Update the implementation audit only if the release closure changes the
   durable project state.

Only after that should R2 production-foundation work begin.
