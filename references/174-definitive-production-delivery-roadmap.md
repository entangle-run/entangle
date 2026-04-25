# Definitive Three-Product Delivery Roadmap

This document is the execution roadmap for turning Entangle into three final
products:

1. Entangle Local;
2. Entangle Cloud;
3. Entangle Enterprise.

It supersedes the earlier single-track production roadmap while preserving its
audit discipline, release gates, and implementation rigor.

The accepted production redesign corpus under `wiki/redesign/latticeops/`
remains the strategic reference for the Cloud and Enterprise products. The
current implementation-truth audit in
`references/59-implementation-state-and-delivery-audit.md` remains the baseline
for what the repository already proves.

## Product Naming Authority

The product names are:

1. Entangle Local;
2. Entangle Cloud;
3. Entangle Enterprise.

`LatticeOps` is the name of the imported redesign corpus only. It is not a
product name. `Local Pro`, `Cloud / LatticeOps SaaS`, and `Enterprise
Self-Hosted` are retired planning labels and must not appear in current release
claims.

## Purpose

The project now has three product destinations, not one.

This roadmap defines:

- the final product line;
- the strict sequencing rule between products;
- incremental release trains for each product;
- the audit and reconsideration loop before and after every serious slice;
- quality gates for each release family;
- the immediate path from the current repository to the first final product:
  Entangle Local.

## Current State

Entangle is currently a partial end-to-end local runtime implementation.

The repository already has:

- a real `entangle-host` control-plane service;
- a real per-node `entangle-runner`;
- local Nostr transport over `strfry`;
- git-backed artifact materialization, publication, and retrieval;
- Docker-backed local runtime lifecycle;
- host-owned runtime, session, turn, approval, artifact, recovery, graph,
  node, edge, package-source, principal, status, and event inspection;
- Studio and CLI surfaces over the same host boundary;
- provider-backed engine adapters through the internal agent-engine boundary;
- bounded tools, memory maintenance, approval handling, and delegated handoff;
- local preflight and smoke commands;
- a credible `pnpm verify` quality baseline;
- a released R1/L1 Local Operator Baseline packet in
  [`releases/local/l1-local-operator-baseline.md`](../releases/local/l1-local-operator-baseline.md),
  backed by the release ledger in
  [177-r1-local-operator-release-ledger.md](177-r1-local-operator-release-ledger.md).

The repository does not yet have:

- PostgreSQL production persistence;
- workspace-aware production identity;
- tenant isolation;
- production RBAC or ABAC;
- production artifact service over object storage;
- production sandbox and scheduler infrastructure;
- search, analytics, notifications, billing, compliance, or enterprise
  self-host packaging.

## Final Product Line

### Product 1: Entangle Local

Entangle Local is the maximum local product.

It is not a throwaway preview. It is the durable local/developer product for:

- agent package builders;
- graph designers;
- technical founders;
- local demos;
- small technical teams;
- CI and smoke environments;
- lightweight self-host experiments.

Its promise:

> Run, build, inspect, and debug graph-native AI organizations locally with a
> polished Studio, serious CLI, local runners, local relay, local git-backed
> artifacts, approval flows, memory, traces, demos, repair tools, and clear
> limits.

### Product 2: Entangle Cloud

Entangle Cloud is the managed production platform.

It is for teams and companies that want governed AI organizations without
operating the infrastructure themselves.

Its promise:

> Multi-user, multi-workspace, governed AI operations with production
> persistence, identity, policy, sandboxed execution, artifact service,
> approvals, audit, search, analytics, integrations, billing, and managed
> reliability.

### Product 3: Entangle Enterprise

Entangle Enterprise is the production product installed inside the
customer's cloud, VPC, or controlled environment.

It is for regulated or security-sensitive customers.

Its promise:

> The production Cloud product's core control-plane and governed execution
> capabilities, packaged for customer-operated infrastructure with enterprise
> identity, external dependency integration, audit export, backup, upgrade,
> observability, and air-gapped maturity where required.

## Sequencing Rule

Product development is sequential.

1. Finish Entangle Local as the first final product.
2. Start Entangle Cloud only after Entangle Local reaches its GA gate.
3. Start Entangle Enterprise only after the Cloud product has a stable
   production core worth packaging for customer-operated environments.

Allowed before a later product starts:

- documentation;
- architectural decisions;
- small exploratory spikes that do not delay the active product;
- contract choices that keep the active product cleaner.

Not allowed before the active product reaches its gate:

- broad implementation of later-product infrastructure;
- UI branches for later-product workflows;
- production-only abstractions that make the local product harder to finish;
- claiming later-product capabilities in release notes.

## Global Audit Loop

Every release and every substantial slice must follow this loop.

### Pre-Slice Audit

Before implementation:

1. Read:
   - `README.md`;
   - `resources/README.md`;
   - `wiki/overview.md`;
   - `wiki/index.md`;
   - `wiki/log.md`;
   - this roadmap;
   - the active release ledger;
   - any directly touched reference files.
2. Run `git status --short`.
3. Identify existing user or previous-session changes.
4. Map the slice to current code ownership:
   - `packages/types`;
   - `packages/validator`;
   - `packages/host-client`;
   - `services/host`;
   - `services/runner`;
   - `apps/cli`;
   - `apps/studio`;
   - `deploy`.
5. Write the gap statement before editing code.
6. Confirm the slice belongs to the currently active product and release.

### Implementation Discipline

During implementation:

1. Keep the slice narrow.
2. Update contracts before widening behavior.
3. Keep authority boundaries clean:
   - host owns control-plane state;
   - runner owns runner-local lifecycle mutation;
   - CLI and Studio are clients;
   - shared packages own shared contracts and presentation helpers.
4. Do not create temporary behavior that contradicts the active product.
5. Do not widen the local product into production claims.
6. Prefer behavior and contract tests over brittle snapshots.

### Post-Slice Audit

After implementation:

1. Run focused package tests.
2. Run `pnpm verify` unless the slice is documentation-only.
3. Run local smoke checks when deployment, Docker, relay, Gitea, or runtime
   lifecycle behavior changed.
4. Update canonical docs.
5. Update `references/README.md` if a reference file was added.
6. Update `wiki/log.md` if state or baseline changed.
7. Re-read changed docs for contradiction.
8. Commit the coherent batch.

### Reconsideration Gate

After every release:

1. Did implementation evidence invalidate a roadmap assumption?
2. Did this release create a new authority boundary?
3. Did the active product become less coherent?
4. Did quality drift increase?
5. Is the next planned release still the highest-value release?

If yes, update this roadmap or add a decision record before continuing.

## Release Train Overview

| Product | Release | Name | Purpose |
| --- | --- | --- | --- |
| Local | L0 | Closure and Ledger | Freeze current state and close active slices. |
| Local | L1 | Local Operator Baseline | Presentable local architecture proof. |
| Local | L1.5 | Local Operator Preview | Usable local demo and technical preview. |
| Local | L2 | Local Workbench | Productized local package, graph, session, and artifact workflows. |
| Local | L3 | Agentic Node Runtime | Per-node coding-agent runtime selection, OpenCode integration path, policy bridge, git/wiki workspaces, and observability. |
| Local | L4 | Local Reliability | Doctor, repair, backup, import/export, upgrade, and diagnostics. |
| Local | L5 | Local GA | Complete local/developer product. |
| Cloud | C0 | Cloud Start Gate | Confirm Local is complete and production work may begin. |
| Cloud | C1 | Cloud Foundation | PostgreSQL, identity, tenancy, auth, audit, API discipline. |
| Cloud | C2 | Governed Execution MVP | Production-style session launch, sandbox, artifact service, approvals. |
| Cloud | C3 | Cloud Private Beta | Design partner usability, integrations, search, notifications, cost. |
| Cloud | C4 | Cloud Production GA | Paid-customer SaaS readiness. |
| Cloud | C5 | Cloud Scale | Advanced governance, marketplace, analytics, and optimization. |
| Enterprise | E0 | Enterprise Start Gate | Confirm the Cloud core is stable enough to package. |
| Enterprise | E1 | Enterprise Install Alpha | Helm, external dependencies, basic customer-operated install. |
| Enterprise | E2 | Enterprise Beta | SSO/SCIM, secrets, SIEM, backup, upgrade, audit export. |
| Enterprise | E3 | Enterprise GA | Supported production self-host. |
| Enterprise | E4 | Enterprise Complete | Air-gapped, HA, DR, multi-region, regulated-enterprise maturity. |

## Product 1: Entangle Local

### L0: Closure And Ledger

Target duration: 0.5 to 1 day.

Target outcome: the repository is coherent enough to close the first release
without continuing open-ended slice work.

Scope:

- audit the working tree;
- finish or explicitly defer active approval/session/runtime slices;
- preserve user changes;
- keep the R1 ledger current;
- keep docs honest about local versus production claims.

Acceptance criteria:

- `git status --short` is clean after commit, or only explicitly deferred user
  work remains;
- `pnpm verify` passes;
- canonical docs describe a local runtime baseline, not a production platform;
- remaining Local work is explicit.

### L1: Local Operator Baseline

Status: released as `v0.1-local-operator-baseline`.

Target outcome: Entangle can be presented as a serious local graph-native
operator runtime.

The historical `R1` ledger is the release-control ledger for this L1 milestone.
It keeps its existing name because it predates the final L-series Local release
train.

The release packet lives in
[`releases/local/l1-local-operator-baseline.md`](../releases/local/l1-local-operator-baseline.md).

Included capabilities:

- host control plane over local state;
- per-node runner;
- local Nostr relay transport;
- git-backed artifact publish and retrieve;
- graph-bound handoff;
- approval request and response handling;
- approval metadata and response-policy validation;
- orphan approval-response guard;
- runner session repair and active-work reconciliation;
- provider-backed engine adapters;
- bounded tools and memory summaries;
- Studio and CLI inspection over host truth;
- local preflight and smoke commands;
- R1 release note and known limitations.

Not included:

- polished onboarding;
- one-command demo;
- graph templates;
- local backup and restore;
- local upgrade/migration tooling;
- production persistence, identity, tenancy, or compliance.

Exit criteria:

- the R1 ledger is complete;
- `pnpm verify` passes;
- `pnpm ops:check-local:strict` passes or a local blocker is recorded;
- the strongest feasible local smoke passes or is explicitly deferred;
- README, wiki overview, roadmap, ledger, and release note agree.

### L1.5: Local Operator Preview

Status: released as `v0.1.5-local-operator-preview`.

Target outcome: a technical user can try Entangle locally without knowing the
whole codebase.

Incremental features:

1. Canonical demo assets:
   - demo agent package;
   - demo graph with user node, two agent nodes, approval edge, handoff edge,
     and git artifact path;
   - deterministic demo model profile or model stub path.
2. Demo flow:
   - near-one-command local demo;
   - documented happy path from install to completed session;
   - CLI and Studio inspection steps.
3. Troubleshooting:
   - Docker daemon failures;
   - stale Gitea volume;
   - missing model secret;
   - relay unreachable;
   - runner degraded;
   - reset and cleanup.
4. Operator UX:
   - clearer Studio landing state for local profile;
   - clearer selected-runtime empty/error states;
   - CLI summary examples for host, runtime, session, approval, artifact, and
     event flows.
5. Smoke confidence:
   - release note records smoke output;
   - disposable runtime smoke becomes the recommended proof path.

Exit criteria:

- a fresh technical user can run the documented demo locally;
- demo output includes a session, turn, approval or approval bypass statement,
  artifact, and trace/event evidence;
- troubleshooting covers the top local failure modes;
- no production claim is made.

### L2: Local Workbench

Target tag: `v0.2-local-workbench`.

Target outcome: Entangle Local becomes a productive local workbench, not only a
demo runtime.

Incremental features:

1. Package authoring:
   - better `entangle package init`;
   - package validate command with readable diagnostics;
   - package manifest and tool catalog examples;
   - local package inventory in Studio.
2. Graph authoring:
   - graph templates;
   - host-backed active-graph validation in Studio;
   - graph revision diff for local revisions;
   - host graph JSON import/export with validation before apply.
3. Session launching:
   - Studio local session launch flow;
   - CLI session launch command over the same host boundary;
   - CLI launch wait polling through host session inspection;
   - attach prompt/input and optional artifact refs;
   - show launch result as a navigable session.
4. Artifact workbench:
   - artifact list/detail improvements;
   - bounded markdown/text preview through the host boundary;
   - runtime memory page list and bounded preview;
   - git commit and remote publication summary;
   - basic diff/history for report artifacts.
5. Memory workbench:
   - local memory summary viewer;
   - task page viewer;
   - focused register viewer for decisions, stable facts, open questions,
     next actions, and resolutions.

Exit criteria:

- users can create or import a package, instantiate it in a graph, launch a
  local session, inspect work, and export graph/package state;
- Studio and CLI remain clients of host APIs;
- local workbench features do not require production tenancy.

### L3: Agentic Node Runtime

Target tag: `v0.3-local-agentic-node-runtime`.

Target outcome: every non-user Entangle node can be configured as a real
coding-agent entity while Entangle remains the graph, identity, policy,
artifact, wiki, and communication runtime around that engine.

This milestone is the approved post-L2 insertion before Local Reliability. It
must not turn Entangle into an OpenCode or Claude Code fork. The coding engine
is pluggable per node; Entangle owns node identity, graph topology, Nostr
coordination, policy, artifact bindings, runtime context, and inspection.

Incremental features:

1. Runtime contracts:
   - catalog-level agent engine profiles;
   - graph and node-level agent runtime selection;
   - effective runtime context that exposes the resolved engine profile;
   - validator checks for unknown or contradictory runtime bindings.
2. OpenCode adapter:
   - first production-quality coding-agent adapter;
   - per-node server/process lifecycle;
   - session prompt injection from Entangle A2A messages;
   - bounded event, status, diff, permission, and artifact harvesting;
   - explicit failure evidence when OpenCode is unavailable or misconfigured.
3. Policy bridge:
   - Entangle policy decides which node may read, write, execute, publish,
     request permissions, mutate graph state, or talk to peers;
   - engine-native permission prompts are mapped into Entangle approvals where
     possible;
   - engine subagents remain internal implementation detail unless surfaced as
     Entangle nodes by explicit configuration.
4. Node workspace model:
   - per-node source workspace;
   - per-node engine state workspace;
   - git artifact workspace and publication flow;
   - wiki/memory repository workspace, with migration from file-backed memory
     only when repository semantics are implemented safely.
5. Node communication:
   - inbound Entangle messages become engine prompts with graph, peer,
     artifact, policy, and memory context;
   - outbound engine results can create artifacts, commits, handoffs, approval
     requests, and conversation lifecycle changes through runner-owned
     boundaries;
   - the host and Studio can inspect the node's runtime and conversation state
     without owning engine internals.
6. CLI and Studio visibility:
   - show effective agent runtime mode/profile per node;
   - expose OpenCode availability, last engine session, status, and failure
     evidence;
   - keep configuration editable through graph/node surfaces rather than
     hidden environment-only state.

Exit criteria:

- a local graph can run at least one non-user node with OpenCode as its coding
  engine and can explicitly disable or reconfigure other nodes without falling
  back to legacy one-turn inference;
- the OpenCode-backed node can receive an Entangle task, operate in its
  per-node workspace, materialize an artifact, and emit a graph-valid response
  or handoff;
- policy and approval gates prevent unauthorized filesystem, git, publication,
  and peer-communication actions;
- Studio and CLI show which engine each node uses and enough runtime evidence
  to debug failures;
- provider-specific engine protocol details do not leak into graph, host API,
  or A2A contracts.

### L4: Local Reliability

Target tag: `v0.4-local-reliability`.

Target outcome: Entangle Local is robust enough for repeated technical use.

Incremental features:

1. Local doctor:
   - one command checks Node, pnpm, Docker, Compose, relay, Gitea, host,
     Studio, runner image, and model secret readiness;
   - machine-readable and human-readable output.
2. Local repair:
   - repair stale local runtime state where safe;
   - detect old Gitea profile state;
   - recommend destructive reset only explicitly.
3. Backup and restore:
   - export local state bundle;
   - restore local state bundle;
   - document what is included and excluded.
4. Upgrade path:
   - version local state layout;
   - migration notes between Local releases;
   - compatibility checks before startup.
5. Diagnostics:
   - guided degraded-runtime explanation;
   - event trace shortcuts;
   - local logs collection bundle.

Exit criteria:

- repeated start/stop/restart cycles are documented and tested;
- local state can be backed up and restored;
- common local drift is diagnosed without reading raw files;
- repair behavior is conservative and never silently destroys user work.

### L5: Entangle Local GA

Target tag: `v1.0-local`.

Target outcome: Entangle Local is a complete local/developer product.

Required capabilities:

- polished local install path;
- stable Docker Compose profile;
- Studio local workbench;
- serious CLI;
- package scaffold, validate, import, and inspect;
- graph templates, validation, mutation, diff, import, and export;
- session launch, timeline, trace, approval, turn, artifact, and memory
  inspection;
- local git artifact workflow with preview and history;
- local relay and local Gitea integration;
- model provider setup guidance;
- doctor, repair, backup, restore, and upgrade notes;
- demo assets and tutorials;
- clear non-goals versus Cloud and Enterprise;
- regression smoke suite for Local.

Local GA exit criteria:

- a technical user can use Entangle Local without reading source code;
- the product can survive repeated local use and upgrades;
- Local remains useful even after Cloud and Enterprise exist;
- Cloud development can begin without stealing Local closure work.

## Product 2: Entangle Cloud

Cloud work starts only after L5 is accepted.

### C0: Cloud Start Gate

Target outcome: confirm the team is allowed to leave Local as the active
product and begin managed production work.

Checks:

- Local GA exit criteria are met;
- Local state and production state boundaries are documented;
- reusable contracts are stable enough to carry forward;
- product positioning distinguishes Local from Cloud.

### C1: Cloud Foundation

Target outcome: build production foundations.

Incremental features:

- PostgreSQL source of truth;
- migrations;
- repository layer behind host/control-plane state;
- users, workspaces, environments, memberships;
- local development auth plus OIDC-ready model;
- production authorization checks on mutating endpoints;
- structured audit log;
- request ids;
- idempotency keys for retryable mutations;
- cursor pagination;
- OpenAPI contract generation or drift checks.

Exit criteria:

- no unauthenticated mutating endpoint exists in the production profile;
- tenant/workspace context is enforced for tenant-scoped operations;
- audit records exist for all core mutations;
- Local still works as a local product.

### C2: Governed Execution MVP

Target outcome: a workspace user can launch, monitor, approve, and inspect a
governed AI session in a production-style environment.

Incremental features:

- session launch API and UI;
- graph revision selection;
- input and artifact attachment;
- production executor abstraction;
- scoped runtime context and secrets;
- sandbox profile;
- model gateway;
- minimal tool gateway;
- object-storage artifact service;
- artifact metadata and lineage;
- approval inbox;
- session timeline;
- trace and failure evidence.

Exit criteria:

- first governed session can complete in a new workspace;
- reviewer can approve or reject with context;
- unauthorized artifact read is denied;
- MVP E2E suite passes.

### C3: Cloud Private Beta

Target outcome: design partners can run real workflows with support.

Incremental features:

- onboarding templates;
- graph validation UX;
- graph revision diff;
- package promotion;
- search v1;
- notifications v1;
- Slack and GitHub/GitLab or Gitea integrations;
- cost dashboard v1;
- backup and restore drills;
- staging environment;
- support runbooks.

Exit criteria:

- 3 to 5 design partners can run workflows;
- median time to first successful run is under 60 minutes;
- critical workflow success rate is above 95 percent in beta;
- no known critical or high security issue remains.

### C4: Cloud Production GA

Target outcome: paid customers can be onboarded into the managed SaaS.

Incremental features:

- billing and entitlements;
- plan limits;
- SLO dashboards;
- alerting;
- incident runbooks;
- production backup and restore;
- security review;
- GDPR export and deletion basics;
- SOC 2 Type I readiness work;
- customer onboarding flow.

Exit criteria:

- production readiness review passes;
- billing and entitlement checks work;
- support can onboard ordinary customers without engineering intervention;
- pen test findings are remediated or formally accepted.

### C5: Cloud Scale

Target outcome: expand the managed platform after production launch.

Incremental features:

- advanced policy simulation;
- analytics v2;
- richer connector framework;
- private package catalog;
- package evaluation suites;
- replay and regression workflows;
- cost optimization and model routing;
- advanced artifact publication workflows.

## Product 3: Entangle Enterprise

Entangle Enterprise work starts only after the Cloud core is production
stable enough to package.

### E0: Enterprise Start Gate

Checks:

- Cloud production core is stable;
- control-plane migrations are repeatable;
- deployment dependencies are explicit;
- support model for customer-operated installs is accepted.

### E1: Enterprise Install Alpha

Target outcome: install the production core in a customer-like environment.

Incremental features:

- Helm chart alpha;
- Kubernetes namespace model;
- external PostgreSQL mode;
- external object storage mode;
- external secret manager mode;
- OIDC integration;
- ingress/TLS documentation;
- installation preflight.

Exit criteria:

- internal team can install and run a basic governed session in a fresh
  cluster;
- uninstall and reinstall paths are documented;
- dependency requirements are explicit.

### E2: Enterprise Beta

Target outcome: design partners can run self-hosted pilots.

Incremental features:

- SAML;
- SCIM;
- enterprise RBAC/ABAC hardening;
- SIEM/log export;
- audit export;
- backup and restore;
- upgrade and rollback;
- network policy guidance;
- customer runbooks.

Exit criteria:

- at least one design partner can operate a pilot;
- backup/restore drill passes;
- upgrade drill passes;
- security review for self-host scope passes.

### E3: Enterprise GA

Target outcome: supported production self-host product.

Incremental features:

- supported Helm chart;
- Terraform examples;
- compatibility matrix;
- release notes and migration policy;
- production monitoring guide;
- support bundle;
- incident and escalation process;
- enterprise audit package.

Exit criteria:

- customer-operated production install is supportable;
- RPO/RTO targets are validated for supported topology;
- support can diagnose issues from bundles and runbooks.

### E4: Enterprise Complete

Target outcome: regulated-enterprise maturity.

Incremental features:

- air-gapped install bundle;
- HA reference architecture;
- multi-region guidance where justified;
- customer-managed keys;
- tamper-evident audit option;
- advanced retention;
- data residency controls;
- ISO 27001 and SOC 2 Type II readiness support.

## Cross-Product Epics

These epics span products but must stay aligned to the active product.

### Contracts

Owners:

- `packages/types`;
- `packages/validator`;
- generated OpenAPI/client artifacts once introduced.

Rules:

- primary contracts remain machine-readable;
- validators own semantic correctness;
- generated artifacts are derivative;
- local contracts must not be broken casually for Cloud;
- Cloud contracts must not make Local unusable.

### Control Plane

Current owner:

- `services/host`.

Evolution:

- Local keeps a local host profile;
- Cloud introduces production persistence and tenant-aware modules behind the
  control-plane facade;
- Enterprise packages the production control plane with customer-operated
  dependencies.

### Runner And Execution

Rules:

- runner-local lifecycle mutation remains runner-owned;
- host observes and reconciles;
- provider logic stays behind `packages/agent-engine`;
- Local uses local runners;
- Cloud introduces production sandbox/scheduler abstractions;
- Enterprise packages the production executor model for customer clusters.

### Artifacts

Evolution:

- Local: git-backed local artifact workspace and local Gitea integration;
- Cloud: object-storage artifact service with metadata, lineage, permissions,
  previews, and publication records;
- Enterprise: same artifact service over customer-managed storage options.

### Studio

Evolution:

- Local: local workbench;
- Cloud: multi-user operations console;
- Enterprise: same console with customer-operated identity and infrastructure
  constraints.

Rules:

- Studio never owns control-plane truth;
- every mutation uses host/API boundaries;
- product-specific UX should be additive, not forked.

### CLI

Evolution:

- Local: developer/operator CLI;
- Cloud: authenticated automation CLI;
- Enterprise: install, diagnostics, backup, support, and upgrade CLI
  extensions.

## Quality Gates

### Gate L1: Local Baseline

- `pnpm verify` passes;
- local preflight passes or blocker is recorded;
- strongest feasible smoke passes or is explicitly deferred;
- release note does not overclaim production readiness.

### Gate L5: Local GA

- local install path is documented and repeatable;
- demo assets work on a fresh machine;
- Studio and CLI cover core local workflows;
- doctor, backup, restore, and upgrade notes exist;
- Local regression smoke passes.

### Gate C1: Cloud Foundation

- PostgreSQL migrations run cleanly;
- auth is required for production mutations;
- tenant/workspace authorization tests pass;
- audit writes are tested;
- OpenAPI/API drift is checked.

### Gate C2: Governed Execution MVP

- E2E session workflow passes;
- approval gate workflow passes;
- artifact lineage workflow passes;
- unauthorized access denial passes;
- model/provider failure evidence is inspectable.

### Gate C4: Cloud GA

- production readiness review passes;
- billing and entitlements work;
- SLO dashboards and alerts are active;
- pen test is remediated or formally accepted;
- customer onboarding is supportable.

### Gate E3: Enterprise GA

- supported install and upgrade paths exist;
- external dependency modes are tested;
- backup/restore drill passes;
- support bundle works;
- customer-operated runbooks exist.

## Immediate Plan

L1, L1.5, and L2 release closure are complete. The current target is L3
Agentic Node Runtime, not Local GA.

L1.5 shipped:

- canonical demo package, graph, and model-stub catalog assets now live under
  `examples/local-preview/`;
- `pnpm ops:demo-local-preview` starts the Local profile and runs the preview
  runtime path through the same host, runner, relay, model-stub, and
  Gitea/git-backed artifact flow as the runtime smoke;
- `pnpm ops:demo-local-preview:reset` is the explicit reset path for preview
  state.

Remaining implementation sequence:

1. Build L3 Agentic Node Runtime.
   - Keep Entangle as the node/graph/policy/artifact/wiki runtime.
   - Integrate OpenCode as the first serious coding-agent engine per node.
   - Do not expose the old one-turn model adapter as a node runtime profile.
2. Build L4 Local Reliability.
   - Add local doctor.
   - Add conservative repair.
   - Add backup/restore and state-version checks.
   - Add logs collection and repeated-use validation.
3. Cut L5 Local GA.
   - Run clean-state validation.
   - Align docs, README, release notes, roadmap, and website claims.
   - Make limitations explicit.
   - Tag GA only after all gates pass.

Correct L1 statement:

> Entangle v0.1 is a local operator baseline for graph-native AI
> organizations. It proves host, runner, transport, artifact handoff, approval
> lifecycle, Studio, and CLI locally. It is the first step toward Entangle
> Local, not a production multi-tenant platform.

## Completion Forecast

Assuming disciplined sequencing:

| Product | Milestone | Target |
| --- | --- | --- |
| Local | L1 local operator baseline | late April 2026 |
| Local | L1.5 local operator preview | early May 2026 |
| Local | L2 local workbench | May 2026 |
| Local | L3 agentic node runtime | May to June 2026 |
| Local | L4 local reliability | June 2026 |
| Local | L5 Local GA | June to July 2026 |
| Cloud | C1 cloud foundation | June to July 2026 |
| Cloud | C2 governed execution MVP | July to August 2026 |
| Cloud | C3 private beta | September 2026 |
| Cloud | C4 production GA | October to November 2026 |
| Enterprise | E1 self-hosted alpha | after Cloud GA planning gate |
| Enterprise | E3 enterprise GA | late 2026 to early 2027 |

This forecast must be revised after each gate using repository evidence.

## Explicit Non-Goals Before Local GA

- No Cloud implementation track.
- No PostgreSQL migration as active product work.
- No production tenancy claim.
- No enterprise SSO.
- No billing.
- No Kubernetes production install.
- No compliance claim.

Preparatory design notes are allowed only if they do not delay Local.

## Highest-Risk Areas

1. Local product sprawl:
   Local can absorb endless "nice to have" features. The release train must
   prioritize install, demo, workbench, reliability, and docs before polish.
2. Production leakage:
   Cloud abstractions must not make Local harder to complete.
3. Persistence migration:
   production PostgreSQL work will be large and must wait for Local GA.
4. Identity and authorization:
   bootstrap token semantics must not be mistaken for production identity.
5. Sandbox execution:
   Docker local lifecycle is useful but not production isolation.
6. Artifact governance:
   git handoff is strong locally; Cloud and Enterprise need an artifact service.

## Immediate Next Slice

The next implementation slice should remain L1 release closure.

Recommended order:

1. Finish any active approval/session guard work.
2. Re-run focused runner and validator tests.
3. Run `pnpm verify`.
4. Add the R1 release note.
5. Run local preflight and strongest feasible smoke.
6. Update the R1 ledger with actual command results.
7. Tag L1 only when the ledger exit criteria are met.

Only after L1 should the project start L1.5 Local Operator Preview work.
