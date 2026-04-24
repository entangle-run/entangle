# Technology Stack

## Decision Framework

For each major technology choice, this document identifies the selected option, alternatives, trade-offs, and revisit triggers.

## Frontend

Selected: Next.js, React, TypeScript, React Flow, TanStack Query, Playwright, Storybook.

Justification:

- React and TypeScript align with the existing repository skill base.
- Next.js supports authenticated enterprise app shells, server-rendered routes, and clear routing.
- React Flow is a mature fit for graph composition.
- TanStack Query handles operational API state and live refresh patterns well.

Alternatives:

- Vite SPA: simpler, but weaker for routed enterprise console and auth boundaries.
- SvelteKit: productive, but less aligned with existing React graph tooling and hiring pool.
- Angular: strong enterprise structure, but heavier migration from current Studio.

Trade-offs:

- Next.js adds framework complexity.
- Graph-heavy screens still require careful client-side architecture.

Revisit when:

- The product becomes embedded primarily inside another platform.
- Real-time canvas needs exceed React Flow capabilities.

## Backend Language And Framework

Selected: Go for production control plane services; TypeScript SDKs and runner adapters; Python runner SDK where ML ecosystem integrations require it.

Justification:

- Go is strong for concurrent network services, operational tooling, static binaries, and Kubernetes-native infrastructure.
- TypeScript remains ideal for frontend, SDKs, package schemas, and developer-facing tooling.
- Python support is necessary for AI/ML ecosystem compatibility.

Alternatives:

- TypeScript everywhere: fastest from current repo, but weaker for high-concurrency operational services.
- Kotlin/JVM: excellent enterprise backend choice, but heavier runtime and slower iteration for this context.
- Rust: high performance and safety, but slower product development and harder hiring.

Trade-offs:

- Multi-language stack increases build and tooling complexity.
- Contract generation becomes mandatory.

Revisit when:

- The team cannot support multi-language ownership.
- TypeScript service maturity becomes sufficient for all operational needs.

## Primary Database

Selected: PostgreSQL.

Justification:

- Strong relational integrity for tenants, graphs, sessions, approvals, artifacts, and audit.
- JSONB supports versioned manifests and flexible runtime context.
- RLS supports tenant isolation.
- Mature operations, backups, migrations, and managed offerings.

Alternatives:

- CockroachDB: stronger distributed SQL story, more operational complexity.
- MongoDB: flexible documents, weaker relational guarantees for this domain.
- DynamoDB: scalable, but harder for graph/session/ad-hoc audit queries.

Trade-offs:

- Requires partitioning and indexing discipline at scale.
- Multi-region active-active is not trivial.

Revisit when:

- Single-region relational architecture becomes a global latency bottleneck.
- Audit/event volume requires dedicated analytical store separation.

## Cache

Selected: Redis.

Justification:

- Mature for rate limits, short-lived cache, locks, presence, and idempotency.
- Easy managed cloud availability.

Alternatives:

- Memcached: simpler but less versatile.
- KeyDB/Valkey: possible Redis-compatible alternatives depending on licensing and operations posture.

Trade-offs:

- Cache consistency must be carefully managed.
- Redis should not become a hidden source of truth.

Revisit when:

- Redis licensing or managed service constraints become problematic.

## Queue And Event Bus

Selected: NATS JetStream for MVP and self-host simplicity; Kafka-compatible option for high-volume enterprise deployments.

Justification:

- NATS is lightweight, operationally approachable, and fits control-plane events.
- JetStream gives persistence, replay, and consumer groups.
- Kafka can be offered later for customers with existing data platforms and very high event volume.

Alternatives:

- Kafka only: powerful but operationally heavier.
- RabbitMQ: strong queue semantics but less ideal for event streaming and replay.
- Cloud-native queues: simple but increase vendor lock-in.

Trade-offs:

- NATS ecosystem is smaller than Kafka for analytics pipelines.

Revisit when:

- Event volumes or data platform integration require Kafka as first-class.

## Workflow Engine

Selected: Temporal.

Justification:

- Durable long-running workflows map well to sessions, approvals, retries, cancellations, and publication tasks.
- Prevents ad hoc state machines from spreading across services.

Alternatives:

- Cadence: similar lineage, less momentum.
- Step Functions: strong on AWS, vendor-specific.
- Custom workflow engine: not justified.

Trade-offs:

- Temporal adds operational and conceptual complexity.
- Developers must learn deterministic workflow patterns.

Revisit when:

- Product scope avoids long-running workflows, which is unlikely.

## Search Engine

Selected: OpenSearch.

Justification:

- Suitable for logs, audit search, sessions, artifacts, and operational evidence.
- Self-hostable and cloud-manageable.

Alternatives:

- Elasticsearch: mature but licensing and vendor considerations.
- PostgreSQL full-text search: good for MVP, weaker for large-scale logs/artifacts.
- ClickHouse: excellent analytics, less general search UX.

Trade-offs:

- Search clusters need operational care.
- Authorization-aware search must be designed carefully.

Revisit when:

- Search scale or analytics workload justifies splitting search and analytical storage.

## Storage

Selected: S3-compatible object storage.

Justification:

- Best fit for artifacts, attachments, previews, evidence exports, and package archives.
- Works across cloud and self-host through S3-compatible APIs.

Alternatives:

- Git only: excellent for code artifacts but too narrow.
- Database blobs: not suitable at scale.
- Provider-specific object storage APIs: avoidable lock-in.

Trade-offs:

- Metadata consistency must live in PostgreSQL.
- Object lifecycle policies require governance.

Revisit when:

- Artifact collaboration requires specialized document storage or content-addressed storage.

## Authentication

Selected: OIDC, SAML, SCIM, short-lived API tokens, workload identity.

Justification:

- Enterprise buyers expect SSO and lifecycle management.
- Workload identity prevents long-lived internal secrets.

Alternatives:

- Password-only auth: not acceptable for enterprise.
- Managed auth only: can accelerate cloud version but complicate self-host.

Trade-offs:

- Enterprise identity is complex and must be tested thoroughly.

Revisit when:

- Target market shifts away from enterprise.

## Cloud Provider

Selected: cloud-agnostic Kubernetes-first architecture with AWS as initial managed-cloud reference.

Justification:

- Kubernetes supports self-host and managed cloud.
- AWS has mature managed PostgreSQL, object storage, KMS, IAM, and enterprise reach.

Alternatives:

- AWS-only serverless: faster managed launch, weaker self-host story.
- GCP or Azure first: viable depending on customer base.
- Bare metal first: too costly operationally for initial team.

Trade-offs:

- Kubernetes adds operational complexity.
- Cloud-agnostic choices can slow exploitation of provider-native features.

Revisit when:

- Customer concentration strongly favors another cloud.

## CI/CD

Selected: GitHub Actions, reusable workflows, OpenAPI generation, container builds, security scanning, Terraform or Pulumi, Helm, Argo CD.

Justification:

- Strong ecosystem and straightforward developer workflow.
- GitOps supports auditable infrastructure changes.

Alternatives:

- GitLab CI: excellent if source control standardizes on GitLab.
- Buildkite: strong for complex enterprise pipelines.
- Jenkins: flexible but heavier maintenance.

Trade-offs:

- GitHub Actions runners need careful secret and supply-chain controls.

Revisit when:

- Enterprise customers require another source control and CI standard.

## Monitoring

Selected: OpenTelemetry, Prometheus, Grafana, Loki or equivalent log backend, Tempo or equivalent trace backend, PagerDuty or Opsgenie.

Justification:

- OpenTelemetry keeps instrumentation portable.
- Prometheus and Grafana are standard for Kubernetes operations.

Alternatives:

- Datadog: excellent managed experience, higher cost and vendor lock-in.
- New Relic: similar managed observability trade-offs.
- Cloud-native monitoring only: provider lock-in.

Trade-offs:

- Self-managed observability stack needs operations expertise.

Revisit when:

- Managed cloud offering prioritizes faster operations over portability.

## Runtime Sandbox

Selected: Kubernetes jobs/pods with gVisor or Kata Containers for isolation; Firecracker for higher-risk multi-tenant execution tiers.

Justification:

- Containers are operationally familiar.
- gVisor/Kata improves isolation beyond ordinary containers.
- Firecracker can support stronger tenant separation for untrusted code.

Alternatives:

- Docker socket direct launch: too risky for production.
- Serverless functions: simpler but less flexible for agent runtimes.
- VMs only: strong isolation but slower and more expensive.

Trade-offs:

- Stronger isolation increases cold-start and operational cost.

Revisit when:

- Customer workloads require certified isolation or regulated compute boundaries.

## Policy Engine

Selected: Open Policy Agent for MVP policy-as-code, with optional Cedar evaluation for application permissions if needed.

Justification:

- OPA is mature for infrastructure and application policy decisions.
- Policies can be tested in CI.

Alternatives:

- Custom policy language: not justified.
- Zanzibar-style authorization only: strong relationship auth, weaker general policy gates.

Trade-offs:

- Rego has a learning curve.

Revisit when:

- Relationship-based permissions dominate and require a dedicated authorization graph.
