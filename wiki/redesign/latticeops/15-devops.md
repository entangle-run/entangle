# DevOps And Infrastructure

## DevOps Goals

LatticeOps infrastructure must be reproducible, observable, secure, and cost-aware. It must support managed cloud and self-hosted enterprise deployments without forking product behavior.

## Local Setup

Local developer stack:

- Docker Compose or dev containers.
- PostgreSQL.
- Redis.
- NATS JetStream.
- Object storage emulator such as MinIO.
- Temporal dev server.
- OpenTelemetry collector.
- Web app.
- API service.
- Worker service.
- Synthetic model provider.

Local commands:

- `make dev` starts local stack.
- `make test` runs unit tests.
- `make test-integration` runs dependency-backed tests.
- `make e2e` runs Playwright and API E2E tests.
- `make migrate` applies database migrations.

## Environment Strategy

Environments:

- Local.
- Development.
- Preview per pull request.
- Staging.
- Production.
- Enterprise self-host.

Principles:

- Same container artifacts promote across environments.
- Environment-specific settings live in configuration and secret managers.
- Production changes require migration preflight and rollout plan.
- Preview environments use synthetic data only.

## CI/CD Pipelines

Pull request pipeline:

1. Checkout.
2. Install dependencies.
3. Generate contracts.
4. Lint and format check.
5. Unit tests.
6. Type checks.
7. Migration validation.
8. Security scans.
9. Build containers for changed services.
10. Deploy preview for UI/API changes.

Main pipeline:

1. Full test suite.
2. Integration tests.
3. E2E smoke tests.
4. Container image signing.
5. SBOM generation.
6. Push images.
7. Deploy to development.

Release pipeline:

1. Create release candidate.
2. Deploy to staging.
3. Run full E2E and load subset.
4. Run security regression suite.
5. Manual approval.
6. Progressive production rollout.
7. Post-deploy verification.

## Deployment Process

Managed cloud:

- Kubernetes with Helm charts.
- GitOps deployment through Argo CD.
- Terraform or Pulumi for cloud infrastructure.
- Managed PostgreSQL, Redis, object storage, KMS, and load balancers.
- Dedicated node pools for executors.

Self-host:

- Helm chart with values for external dependencies.
- Terraform examples for AWS, Azure, and GCP.
- Air-gapped image bundle option.
- Preflight checker for cluster, storage, DNS, TLS, and identity configuration.

## Monitoring And Alerting

Metrics:

- API latency and error rate.
- Session launch and completion rate.
- Executor queue depth and runtime failures.
- Workflow failures and retries.
- Model provider latency, errors, and cost.
- Tool call failures.
- Approval latency.
- Artifact storage failures.
- Database latency, locks, and replication lag.
- Search indexing lag.

Alerts:

- API availability breach.
- Session failure spike.
- Executor capacity exhaustion.
- Model provider outage.
- Budget anomaly.
- Audit log write failure.
- Backup failure.
- Search index lag beyond threshold.
- Security policy violation spike.

## Logging

Requirements:

- Structured JSON logs.
- Trace ID, request ID, tenant ID, workspace ID where safe.
- No secrets.
- Sensitive prompt and artifact logs redacted or disabled by policy.
- Log levels standardized.
- Separate audit logs from operational logs.

## Cost Optimization

Controls:

- Autoscale executor pools.
- Scale down idle environments.
- Use spot/preemptible workers for non-critical evaluation workloads.
- Store cold artifacts in lower-cost storage tiers.
- Retain traces and logs by policy tier.
- Attribute model costs to graph, node, session, and tenant.
- Alert on unusual spend.

## Disaster Recovery

Requirements:

- PostgreSQL point-in-time recovery.
- Object storage versioning.
- Infrastructure-as-code rebuild.
- Secrets backup through provider-supported mechanism.
- Search rebuild from database and object storage.
- Regular restore drills.

Targets:

- MVP: RPO 15 minutes, RTO 4 hours.
- Enterprise production: RPO 5 minutes, RTO 1 hour for critical tiers.

## Runbooks

Required runbooks:

- API outage.
- Database failover.
- Executor capacity incident.
- Model provider outage.
- Artifact storage incident.
- Search indexing lag.
- Security incident.
- Customer data deletion request.
- Failed deployment rollback.
- Secret rotation.

## Release Management

- Semantic versioning for self-host releases.
- Release notes with migrations, breaking changes, and security fixes.
- Compatibility matrix for chart, app, database schema, and executor images.
- Deprecation policy for APIs and package manifest schema versions.

## Infrastructure Security

- Private network for databases and internal services.
- mTLS or workload identity for service-to-service calls.
- Network policies for Kubernetes namespaces.
- Least-privilege cloud IAM.
- Image signing and admission control.
- Runtime security monitoring.
- Regular access reviews.

## Operational Ownership

On-call responsibilities:

- Platform team owns infrastructure, deployment, observability, and incident response.
- Backend team owns service-level SLOs.
- Security team owns threat response and vulnerability management.
- Customer success owns customer-facing incident communication with engineering support.
