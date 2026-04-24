# Technical Architecture

## Architecture Goals

LatticeOps must support production AI operations at enterprise scale while preserving the original graph-native insight.

Goals:

- Strong tenant isolation.
- Secure execution boundaries.
- Durable workflow and session state.
- Policy-driven access to models, tools, memory, and artifacts.
- Complete auditability.
- Horizontal scalability.
- Cloud and self-host deployment.
- Pluggable providers and integrations.

## System Architecture

See [diagrams/latticeops-system.mmd](diagrams/latticeops-system.mmd).

Major components:

- Web Console.
- Public API Gateway.
- Control Plane API.
- Graph Service.
- Package Registry Service.
- Session Service.
- Runtime Orchestrator.
- Executor Workers.
- Model and Tool Gateway.
- Artifact Service.
- Policy Service.
- Identity Service.
- Observability Pipeline.
- Notification Service.
- Integration Service.
- PostgreSQL.
- Object Storage.
- Redis.
- Event Bus.
- Workflow Engine.
- Search Index.

## Frontend Architecture

Frontend choice: Next.js with React and TypeScript.

Structure:

```text
apps/web/
  app/
    (auth)/
    (workspace)/
      overview/
      sessions/
      graphs/
      packages/
      artifacts/
      approvals/
      observability/
      integrations/
      analytics/
      admin/
  components/
    graph/
    trace/
    artifacts/
    policy/
    tables/
    forms/
  lib/
    api/
    auth/
    permissions/
    telemetry/
```

Patterns:

- Server-side session validation.
- Client-side data fetching for live operational state.
- React Flow or equivalent for graph canvas.
- Component library backed by design tokens.
- Feature modules aligned to product domains.
- OpenAPI-generated typed client.
- Accessibility testing in CI.

## Backend Architecture

Backend services:

| Service | Responsibility |
| --- | --- |
| API Gateway | Auth termination, request routing, rate limits, request IDs. |
| Control Plane API | Public REST API, authorization, workspace context, orchestration facade. |
| Graph Service | Graph drafts, revisions, validation, topology policy simulation. |
| Package Registry | Package ingestion, validation, versioning, scans, promotion. |
| Session Service | Session lifecycle, task intake, event timelines, cancellation. |
| Runtime Orchestrator | Schedules executor work, manages runtime desired/observed state. |
| Executor Worker | Runs agent code in sandbox with scoped context. |
| Model Gateway | Provider routing, model policy, token/cost telemetry. |
| Tool Gateway | Tool invocation, schema enforcement, audit, connector access. |
| Artifact Service | Artifact metadata, blobs, lineage, previews, publication. |
| Policy Service | RBAC/ABAC decisions, OPA/Cedar policies, approval gates. |
| Identity Service | SSO, SCIM, users, groups, service identities. |
| Notification Service | In-app, email, Slack, Teams, PagerDuty, webhook notifications. |
| Integration Service | External connector lifecycle and webhooks. |
| Analytics Service | Metrics aggregation, usage, cost, and KPI reporting. |

Architecture style:

- Modular monolith for MVP where possible, with hard module boundaries.
- Extract services only when scale, security, or team ownership requires it.
- Event-driven integration between modules through an outbox and event bus.
- Durable workflows for long-running sessions and approval waits.

## Database Design

Primary store: PostgreSQL.

Responsibilities:

- Workspaces, users, roles, teams.
- Packages and graph revisions.
- Runtime state.
- Sessions, events, approvals, artifacts, audit logs.
- Policy metadata.
- Integration metadata.
- Usage and cost records.

Design:

- Every tenant-scoped table includes `tenant_id`.
- Row-level security enforced where possible.
- Immutable revision tables for packages and graphs.
- Append-only audit log.
- Outbox table for event bus publishing.
- JSONB for versioned manifests and runtime context where flexibility is needed.

## API Design

External API: REST over JSON with OpenAPI.

Rationale:

- Easy for enterprise users, CLI, integrations, and SDKs.
- Clear resource semantics for graphs, packages, sessions, artifacts, approvals, and policies.
- Strong generated clients.

Real-time API:

- WebSocket or Server-Sent Events for session events, runtime updates, notifications, and logs.

Internal API:

- ConnectRPC or gRPC for service-to-service calls where strict contracts and streaming are useful.

## Authentication And Authorization

Authentication:

- OIDC for interactive users.
- SAML for enterprise SSO.
- SCIM for provisioning.
- API keys for automation.
- Workload identity for internal services.
- Short-lived executor credentials.

Authorization:

- RBAC for common roles.
- ABAC for resource, environment, data class, graph, and action-specific rules.
- Policy engine for sensitive actions.
- Approval gates for high-risk operations.

## Background Processing

Use a workflow engine for long-running stateful operations:

- Session execution.
- Approval waits.
- Package ingestion.
- Artifact publication.
- Integration webhooks.
- Retention and deletion jobs.
- Cost aggregation.
- Replay and evaluation runs.

Use a job queue for short asynchronous tasks:

- Search indexing.
- Notification delivery.
- Preview rendering.
- Malware scanning.

## Caching

Redis responsibilities:

- Short-lived API cache.
- Distributed locks where needed.
- Session presence.
- Rate limiting counters.
- Idempotency records.
- WebSocket fan-out assistance.

Cache rules:

- Never cache authorization decisions without a short TTL and policy version key.
- Never use cache as source of truth for sessions, artifacts, approvals, or audit.

## Search Systems

Use OpenSearch or Elasticsearch for:

- Sessions.
- Artifacts.
- Logs.
- Audit events.
- Package metadata.
- Graph metadata.

Use pgvector initially for memory and semantic retrieval, with a later option to move to a specialized vector database if scale requires it.

## Observability

Instrumentation:

- OpenTelemetry traces across frontend, API, services, workflows, executors, gateways, and connectors.
- Prometheus metrics.
- Structured logs with trace IDs.
- Audit log separate from operational logs.

Dashboards:

- Control plane health.
- Session success rate.
- Executor queue latency.
- Model cost and latency.
- Tool error rate.
- Approval latency.
- Artifact publication failures.
- Tenant usage and limits.

## Scalability

Scale dimensions:

- API replicas scale horizontally.
- Executor pools scale by queue depth and runtime class.
- Event consumers scale by partition key.
- Search and analytics scale independently.
- Artifact storage scales through object storage.
- PostgreSQL scales first vertically, then with read replicas and partitioning.

Partition keys:

- Tenant ID.
- Workspace environment.
- Session ID.
- Graph ID.

## Security Architecture

Security controls:

- Zero-trust service-to-service authentication.
- Tenant isolation in database and object storage paths.
- Sandboxed executor environments.
- Egress control and tool allowlists.
- Secret manager integration.
- Signed event envelopes for cross-boundary messages.
- Immutable audit log.
- Policy-as-code with testable rules.
- Data classification and redaction pipeline.

## Transport Strategy

Internal transport:

- Event bus for asynchronous internal events.
- RPC for internal synchronous requests.

External/federated transport:

- Signed message envelopes using Ed25519/JWS/DID-compatible identities.
- Nostr adapter available for decentralized or relay-compatible deployments.

Decision: keep signed messaging as a concept, but do not make Nostr the only internal production transport.

## Deployment Architecture

Managed cloud:

- Kubernetes.
- Managed PostgreSQL.
- Managed Redis.
- Managed object storage.
- Managed search or self-operated OpenSearch.
- Workflow engine cluster.
- Dedicated executor node pools.

Self-host:

- Helm charts.
- Terraform modules.
- External dependency modes for existing PostgreSQL, object storage, identity provider, and secret manager.
- Air-gapped package installation option.
