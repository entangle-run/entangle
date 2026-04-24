# Repository Analysis

## Scope And Method

This analysis is based on the repository contents available at analysis time. It included project documentation, wiki files, reference notes, package manifests, TypeScript source, tests, deployment files, CI configuration, and current non-secret local runtime state under `.entangle`.

Fact means directly visible in repository evidence. Interpretation means inferred from repository structure and documented intent. Assumption means the repository did not contain enough evidence to prove the claim.

## Repository Structure

Fact: the repository is a pnpm and Turborepo monorepo targeting Node 22 and TypeScript.

```text
entangle/
  apps/
    cli/
    studio/
  deploy/
  packages/
    agent-engine/
    host-client/
    package-scaffold/
    types/
    validator/
  services/
    host/
    runner/
  references/
  resources/
  wiki/
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
```

## Module Inventory

| Module | Responsibility | Evidence |
| --- | --- | --- |
| `packages/types` | Shared Zod schemas and TypeScript types for graph, runtime context, host API, resources, artifacts, A2A, sessions, recovery, reconciliation, focused memory. | Source and tests under `packages/types/src`. |
| `packages/validator` | Semantic validators for package manifests, graph specs, resource catalogs, artifact references, A2A payloads, and runtime state transitions. | `packages/validator/src/*`. |
| `packages/host-client` | Typed HTTP and WebSocket client for host API, event filtering, runtime trace helpers. | `packages/host-client/src/index.ts`. |
| `packages/agent-engine` | Provider-neutral engine contract with Anthropic implementation, tool loop support, and stub engine. | `packages/agent-engine/src/*`. |
| `packages/package-scaffold` | Scaffolds new agent packages from defaults. | `packages/package-scaffold/src/index.ts`. |
| `services/host` | Fastify control-plane service for graph, catalog, packages, runtime desired/observed state, sessions, recovery, Gitea provisioning, Docker/memory backends, host events. | `services/host/src/*`. |
| `services/runner` | Per-node runtime process with Nostr transport, model execution, artifact handoff, git backend, memory synthesis, turn/session state. | `services/runner/src/*`. |
| `apps/cli` | Commander CLI for offline validation, package creation, graph inspection, and host operations. | `apps/cli/src/index.ts`. |
| `apps/studio` | React/Vite visual client for host status, graph, packages, nodes, edges, runtime lifecycle, sessions, artifacts, and live events. | `apps/studio/src/App.tsx`, `apps/studio/src/App.css`. |
| `deploy` | Dockerfiles and local Docker Compose topology for host, studio, runner image, strfry relay, and Gitea. | `deploy/docker-compose.local.yml`, `deploy/*.Dockerfile`. |

## Current Architecture Overview

Fact: Entangle is built as a local control plane plus execution runtime:

1. Operators use the CLI or Studio to call the host API.
2. The host persists desired and observed state under `.entangle`.
3. The host validates packages, resources, graph definitions, and runtime transitions.
4. A reconciliation loop starts or stops runner instances using memory or Docker runtime backends.
5. Runners load effective runtime context from the host or a file.
6. Runners communicate through Nostr relays and exchange A2A envelopes.
7. Runners use artifacts, model engines, and memory state to produce work.
8. Host events and session records expose runtime visibility to CLI and Studio.

Interpretation: the architecture is intentionally not a single centralized orchestrator. The host owns control-plane state, while runners own node-local execution behavior. This separation is directionally strong and should be preserved.

## Responsibilities And Boundaries

### Shared Contracts

Fact: `packages/types` defines the core vocabulary. It contains schemas for:

- Agent packages.
- Graph specs and edges.
- Node instances and runtime context.
- Resource catalog entries.
- Transport profiles.
- A2A envelopes.
- Artifact references and records.
- Sessions, turns, conversations, memory, recovery, and reconciliation.

Interpretation: this is the strongest part of the implementation. The repository treats contracts as first-class artifacts and avoids burying product semantics inside service-specific code.

### Validation

Fact: `packages/validator` provides structural and semantic validation beyond basic Zod parsing. It validates graph package references, resource bindings, transition rules, artifact references, A2A messages, and resource catalog consistency.

Interpretation: validation is a meaningful quality guard and should expand before the system grows more runtime features.

### Host Control Plane

Fact: `services/host` is a Fastify service with WebSocket events. It manages:

- Status and health.
- Resource catalog.
- Package sources and package admission.
- External principals.
- Graph revisions.
- Node and edge mutation.
- Runtime desired and observed state.
- Reconciliation and recovery policy.
- Session records, turns, artifacts, conversations, and host event logs.
- Optional Docker-backed runtime launch.
- Optional Gitea provisioning.

Fact: host persistence is JSON-file based. The state root defaults to `.entangle`.

Interpretation: the host is the correct conceptual boundary, but the current persistence and security model are local-development grade.

### Runner Runtime

Fact: `services/runner` loads runtime context, joins a Nostr relay, validates A2A messages, runs model turns, manages session state, records artifact activity, and updates focused memory.

Fact: the runner supports built-in tools such as artifact input inspection, memory reference inspection, and session state inspection.

Fact: the runner contains git artifact backend behavior for materializing and retrieving artifacts.

Interpretation: runners are already treated as independent actor runtimes rather than mere function calls. That is essential for an AI organization runtime.

### Agent Engine

Fact: `packages/agent-engine` exposes an engine abstraction and implements an Anthropic adapter. An `openai_compatible` provider type exists in shared schemas, but the implementation path is not present and throws as unsupported.

Interpretation: provider abstraction is present but still thin. A production product needs a full model gateway and provider routing layer.

### CLI

Fact: the CLI supports offline validation, package initialization, graph inspection, and host-bound operations for catalog, packages, principals, graph, nodes, edges, runtimes, sessions, and events.

Interpretation: CLI parity with the host API is a strength. It allows headless operations and CI automation.

### Studio

Fact: Studio is a Vite React app using React 19 and React Flow. It calls the host API directly and displays host state, graph topology, package admission, runtime controls, sessions, artifacts, recovery details, and live events.

Fact: Studio currently has a large `App.tsx` file and a sizeable app-level CSS file. There is no visible route-level architecture or authentication boundary.

Interpretation: Studio validates the product direction, but it should be rebuilt as a modular operations console before becoming a long-lived frontend.

## Feature And Behavior Map

| Feature | Current Behavior | Maturity |
| --- | --- | --- |
| Package contracts | Agent package schema, scaffold, validation, admission. | Good baseline. |
| Graph topology | Nodes, edges, revisions, validation, Studio graph view. | Good baseline. |
| Runtime context | Effective runtime context derived from package, node, graph, resources. | Strong direction. |
| Runtime lifecycle | Desired/observed states, memory backend, Docker backend, reconciliation. | Early but useful. |
| Messaging | Nostr relay transport and A2A envelope validation. | Directional, policy incomplete. |
| Sessions | Session, conversation, turn, artifact, and event records. | Useful baseline. |
| Artifact handoff | Git-first artifact materialization and retrieval. | Narrow but conceptually correct. |
| Memory | Deterministic and optional model-guided focused memory synthesis. | Early but important. |
| Studio operations | Graph, packages, nodes, edges, runtime controls, sessions, events. | Functional local client. |
| CLI operations | Broad command coverage over host API. | Strong headless surface. |
| Deployment | Local Docker Compose with host, studio, Gitea, strfry, runner image. | Local-only profile. |

## Data Flows

### Package Admission To Runtime

1. Operator configures package source or submits package content.
2. Host validates and stores package version immutably.
3. Graph nodes bind to package references and resource bindings.
4. Host derives effective runtime context.
5. Operator sets runtime desired state.
6. Reconciliation starts or stops runtime through memory or Docker backend.
7. Observed runtime state and findings are stored and emitted.

### Agent Message To Artifact Output

1. A runner receives an A2A envelope over Nostr.
2. The runner validates destination and payload structure.
3. The runner loads current session, conversation, artifact, and memory context.
4. The agent engine runs the model turn with tool support.
5. Artifact inputs may be inspected and outputs may be written through the artifact backend.
6. Focused memory may be updated.
7. Session state and host event records are updated.
8. A response can be emitted back through the transport.

### Studio And CLI Control

1. Studio or CLI calls host HTTP endpoints.
2. Host mutates local state and appends events.
3. Studio subscribes to WebSocket events and polls selected resources.
4. CLI can stream events and inspect sessions headlessly.

## API Analysis

Fact: the host API is REST-like JSON plus WebSocket events. The client package exposes typed methods for status, events, resource catalog, package sources, packages, graph revision, nodes, edges, runtimes, sessions, recovery, external principals, and task launching surfaces.

Fact: there is no visible authentication middleware or role enforcement in host setup.

Interpretation: the current API is useful for a local control plane, but it should not be exposed beyond a trusted development boundary without authentication, authorization, rate limiting, and audit semantics.

## Frontend Architecture

Fact: Studio is a single Vite application with direct host API calls, React Flow graph rendering, and local component state.

Strengths:

- It uses live host state, not mocked demos.
- It exposes graph and runtime visibility.
- It provides package and runtime operations that align with the control plane.

Limitations:

- No auth or multi-tenant workspace model.
- No route-level information architecture.
- Large monolithic component makes feature evolution risky.
- No visible automated browser tests.
- Accessibility and responsive behavior are not verifiably covered.
- Browser CORS may be an issue because Studio and host run on different local ports and the host does not visibly register a CORS plugin.

## Backend Architecture

Strengths:

- Host and runner are separated cleanly.
- Shared schemas reduce drift.
- Validators catch semantic errors before runtime.
- The host has a reconciliation model rather than one-off imperative starts.
- Runner owns local turn/session behavior.

Limitations:

- Filesystem JSON state lacks transactional guarantees, concurrency control across hosts, query capabilities, migrations, and durable indexing.
- Docker socket mounting gives broad host-level privilege.
- No visible auth, RBAC, ABAC, tenant isolation, or service identity model.
- Provider support is limited.
- Edge transport policy does not appear fully enforced at runtime sender authorization level.

## Database And Data Usage

Fact: there is no conventional database schema. Persistent state is local file state under `.entangle`, including desired state, observed runtime state, graph/catalog/package information, events, and sessions.

Fact: current non-secret local state shows a graph named `team-alpha` with `user-main`, `worker-it`, and a delegation edge. The observed worker runtime is stopped and degraded due missing model endpoint credential.

Interpretation: the local state model is appropriate for bootstrap and demos, but production needs a relational store, event log, audit log, indexing, migrations, backups, and tenant isolation.

## External Services And Integrations

Current integrations include:

- Nostr relay through strfry for signed coordination messaging.
- Gitea for git artifact hosting and provisioning experiments.
- Anthropic model endpoint support through `packages/agent-engine`.
- Docker Engine for local runner container lifecycle.
- Git CLI for artifact backend behavior.

Assumption: there may be planned support for additional providers and artifact backends, but the repository evidence shows these as future or partial capabilities.

## Configuration, Environments, And Build

Fact: package scripts include `build`, `lint`, `typecheck`, `test`, and `verify`.

Fact: TypeScript settings are strict: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and isolated modules.

Fact: CI runs install, lint, typecheck, test, and build on Node 22 with pnpm.

Fact: Docker Compose includes host, studio, runner image profile, strfry, Gitea, and volumes.

Limitations:

- Compose is local-development oriented.
- strfry image is referenced with `latest`, which weakens reproducibility.
- Health checks and production-grade secrets management are not visible.
- Docker socket mount is high risk outside trusted local development.

## Testing Strategy

Fact: the repository contains broad unit and service tests across types, validator, host-client, agent-engine, host, runner, CLI, and scaffold packages.

Strengths:

- Contract tests are present.
- Host and runner behavior is tested at useful seams.
- CI runs lint, typecheck, tests, and build.

Gaps:

- No visible end-to-end tests across host, runner, relay, artifact backend, and Studio.
- No browser automation for Studio workflows.
- No security tests for auth because auth is not present.
- No performance, load, or chaos tests.
- Coverage is not visibly enforced in CI.

## Security Practices

Positive signals:

- Secret-like material is ignored from git.
- Runtime identities are separated from portable packages.
- Nostr signing is part of the conceptual model.
- Resource bindings and runtime context reduce implicit ambient access.

Risks:

- Host API is unauthenticated.
- Docker socket mount grants broad control of the host machine.
- Secrets are file-mounted and environment-injected, without Vault/KMS rotation or audit.
- Relay auth is local and permissive.
- Edge policy enforcement appears incomplete at runtime.
- No multi-tenant isolation boundary exists.
- No visible rate limiting or abuse controls.

## Observability

Current observability includes:

- Fastify logging.
- Host event records.
- Runtime state and reconciliation findings.
- Session, turn, and artifact records.
- Studio live event display.

Missing production observability:

- OpenTelemetry traces.
- Metrics and alerting.
- Centralized structured logs.
- Error budgets and SLOs.
- Distributed trace correlation from user task to model call to artifact output.
- Cost telemetry by tenant, graph, node, model, and session.

## Technical Debt And Limitations

High-priority technical debt:

1. Missing authentication and authorization on the host API.
2. Filesystem JSON state as the source of truth.
3. Monolithic Studio implementation.
4. Incomplete runtime policy enforcement for graph edges and senders.
5. Docker socket production risk.
6. Limited artifact backend behavior.
7. Partial provider abstraction.
8. Lack of multi-tenancy and enterprise identity.
9. Lack of production observability.
10. Local-only deployment topology.

## Overall Assessment

Entangle is an unusually serious early-stage foundation for graph-native AI organizations. It has stronger conceptual boundaries than most demo multi-agent systems. Its largest gap is not imagination or architecture; it is productionization. The redesign should keep the graph and artifact-first ideas, but rebuild persistence, identity, security, observability, UI modularity, and execution infrastructure around enterprise operations requirements.
