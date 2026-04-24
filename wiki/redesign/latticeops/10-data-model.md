# Data Model

## Data Model Goals

The data model must preserve graph-native semantics while supporting enterprise requirements: tenancy, audit, revision history, policy, artifact lineage, cost attribution, and recovery.

## Core Entities

| Entity | Purpose |
| --- | --- |
| Tenant | Legal and billing boundary. |
| Workspace | Operational boundary inside tenant. |
| Environment | Development, staging, production, or custom boundary. |
| User | Human identity. |
| Group | IdP or local group. |
| Membership | User role in workspace. |
| AgentPackage | Reusable agent definition. |
| PackageVersion | Immutable package content and manifest. |
| Graph | Logical AI organization. |
| GraphRevision | Immutable graph version. |
| Node | Human, agent, service, approval group, or external system within a graph revision. |
| Edge | Authority, delegation, review, escalation, or communication path. |
| ResourceBinding | Node or graph binding to model, tool, memory, transport, artifact, or integration resource. |
| Policy | Authorization, data, model, tool, approval, and runtime policy. |
| Session | Execution instance launched against a graph revision. |
| Turn | Unit of agent or human interaction within a session. |
| Artifact | Durable work product or reference. |
| ArtifactVersion | Immutable artifact content version. |
| ApprovalRequest | Human decision gate. |
| RuntimeInstance | Execution environment for a node or session. |
| ModelCall | Model invocation metadata, cost, and policy result. |
| ToolCall | Tool invocation metadata and result. |
| MemoryEntry | Scoped memory with provenance and retention. |
| AuditLog | Append-only security and governance event. |
| OutboxEvent | Reliable event publication from database transaction. |
| Integration | External system connector. |
| SecretReference | Pointer to secret manager entry, never secret value. |
| UsageRecord | Metering and analytics event. |

## Relationships

- A tenant has many workspaces.
- A workspace has many environments, users, groups, packages, graphs, sessions, policies, and integrations.
- A package has many immutable versions.
- A graph has many immutable revisions.
- A graph revision has many nodes and edges.
- A node may reference one package version.
- A node has many resource bindings.
- A session references one graph revision.
- A session has many turns, artifacts, approvals, model calls, tool calls, runtime instances, and events.
- Artifacts have many versions and lineage links.
- Memory entries reference source sessions, artifacts, or turns.
- Audit logs reference actors and target resources.

## Schema Sketch

```sql
create table tenants (
  id uuid primary key,
  name text not null,
  plan text not null,
  created_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  name text not null,
  slug text not null,
  region text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table package_versions (
  id uuid primary key,
  tenant_id uuid not null,
  workspace_id uuid not null references workspaces(id),
  package_name text not null,
  version text not null,
  manifest jsonb not null,
  source jsonb not null,
  digest text not null,
  validation_status text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, package_name, version)
);

create table graph_revisions (
  id uuid primary key,
  tenant_id uuid not null,
  workspace_id uuid not null references workspaces(id),
  graph_id uuid not null,
  revision integer not null,
  status text not null,
  spec jsonb not null,
  validation_status text not null,
  created_by uuid not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (graph_id, revision)
);

create table sessions (
  id uuid primary key,
  tenant_id uuid not null,
  workspace_id uuid not null references workspaces(id),
  environment_id uuid not null,
  graph_revision_id uuid not null references graph_revisions(id),
  initiator_user_id uuid,
  target_node_id text,
  status text not null,
  priority text not null,
  budget_cents integer,
  deadline_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table artifacts (
  id uuid primary key,
  tenant_id uuid not null,
  workspace_id uuid not null references workspaces(id),
  session_id uuid references sessions(id),
  name text not null,
  artifact_type text not null,
  classification text not null,
  current_version_id uuid,
  created_by_actor jsonb not null,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key,
  tenant_id uuid not null,
  workspace_id uuid,
  actor_type text not null,
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  decision jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
```

## Multi-Tenancy

Rules:

- Every tenant-scoped table includes `tenant_id`.
- Application authorization always includes tenant and workspace context.
- PostgreSQL row-level security is enabled for tenant-scoped tables.
- Object storage keys include tenant and workspace prefixes.
- Search documents include tenant, workspace, ACL, and data classification fields.
- Event bus subjects include tenant-safe partitioning without leaking names.

## Indexing Strategy

Primary indexes:

- `(tenant_id, workspace_id)` on all tenant-scoped operational tables.
- `(workspace_id, status, created_at desc)` for sessions.
- `(workspace_id, graph_id, revision)` for graph revisions.
- `(workspace_id, package_name, version)` for package versions.
- `(session_id, created_at)` for turns and events.
- `(artifact_id, version)` for artifact versions.
- `(tenant_id, action, created_at desc)` for audit logs.

Special indexes:

- GIN indexes on JSONB manifests/specs for validation and search support.
- Vector index on memory embeddings with tenant and policy filters.
- Partial indexes for pending approvals and active runtimes.
- Time partitioning for audit logs, usage records, model calls, tool calls, and session events.

## Audit Logs

Audit log principles:

- Append-only.
- Include actor, action, target, authorization decision, request ID, trace ID, timestamp, source IP, and relevant policy version.
- Store secret references, never secret values.
- Exportable for compliance.
- Retention configurable by plan and policy.

## Migration Strategy

- Use versioned migrations for PostgreSQL schema.
- Use expand-and-contract migrations for zero-downtime deployments.
- Version JSONB manifest schemas separately from database schema.
- Provide migration checks in CI and deployment preflight.
- Maintain backward-compatible readers for active sessions during rolling deploys.

## Backup And Recovery

Requirements:

- Point-in-time recovery for PostgreSQL.
- Object storage versioning and lifecycle rules.
- Search index rebuild from source of truth.
- Event bus replay where configured.
- Regular restore drills.
- Tenant-level export for enterprise customers.

Recovery targets:

- MVP: RPO 15 minutes, RTO 4 hours.
- Production enterprise: RPO 5 minutes, RTO 1 hour for critical tiers.

## Data Retention

Default retention:

- Audit logs: 1 year for team plans, configurable for enterprise.
- Operational logs: 30 to 90 days.
- Traces: 30 days by default, longer for compliance tiers.
- Artifacts: until deleted or policy expires.
- Memory: explicit retention policy with review and deletion support.

## Data Classification

Supported classes:

- Public.
- Internal.
- Confidential.
- Restricted.
- Regulated.

Classification affects:

- Model provider eligibility.
- Tool access.
- Artifact sharing.
- Search visibility.
- Approval gates.
- Retention.
- Export controls.
