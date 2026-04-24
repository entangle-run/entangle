# Security And Compliance

## Security Philosophy

LatticeOps must assume agents can make mistakes, tools can be dangerous, prompts can be adversarial, and enterprise data can be sensitive. Security must be built into identity, policy, execution, data, integrations, and audit from the beginning.

## Threat Model

### Assets

- Customer data.
- Prompts and model responses.
- Artifacts.
- Agent packages.
- Secrets and credentials.
- Graph policies and runtime context.
- Audit logs.
- Billing and usage data.

### Actors

- Legitimate users.
- Malicious insiders.
- Compromised user accounts.
- Compromised agent packages.
- External attackers.
- Malicious external integrations.
- Misbehaving model or tool outputs.

### Primary Threats

- Unauthorized cross-tenant data access.
- Agent tool misuse.
- Prompt injection leading to data exfiltration.
- Secret leakage through logs or model prompts.
- Sandbox escape.
- External connector abuse.
- Approval bypass.
- Audit log tampering.
- Supply-chain compromise in packages or containers.
- Denial of service through session floods or expensive model calls.

## Data Protection

Controls:

- TLS for all network traffic.
- Encryption at rest for PostgreSQL, object storage, search, and backups.
- Tenant-scoped object storage prefixes and database rows.
- Data classification labels on artifacts, memory, and sessions.
- Redaction pipeline for logs and traces.
- Configurable retention policies.
- Deletion workflows for legal and privacy requests.

Prohibited:

- Storing secret values in database records, logs, traces, prompts, or artifacts.
- Sending restricted data to providers not approved for that classification.
- Allowing agents to access workspace-wide artifacts without explicit scope.

## Authentication Risks And Controls

Risks:

- Account takeover.
- Weak enterprise SSO configuration.
- Long-lived API keys leaked.
- Service tokens reused across tenants.

Controls:

- OIDC/SAML SSO.
- MFA enforcement.
- SCIM deprovisioning.
- Short-lived tokens.
- API key rotation and scopes.
- Workload identity for services.
- Emergency access with strict audit.
- Session timeout and device/session management.

## Authorization

Use layered authorization:

- RBAC for broad workspace roles.
- ABAC for environment, data class, graph, node, action, and resource conditions.
- Policy-as-code for sensitive execution and publication decisions.
- Approval gates for high-risk operations.

Every authorization decision should record:

- Actor.
- Action.
- Target.
- Policy version.
- Decision.
- Trace/request ID.

## API Protection

Controls:

- Auth required for all mutating endpoints.
- Rate limits by tenant, user, API key, and IP.
- Idempotency keys for retryable mutations.
- Request size limits.
- Schema validation at boundaries.
- Webhook signature verification.
- CSRF protection for browser sessions.
- CORS allowlist.
- Structured errors that do not leak restricted data.

## Runtime And Sandbox Security

Controls:

- Isolated executor pods or microVMs.
- No Docker socket in production executors.
- Least-privilege service accounts.
- Network egress policy.
- Read-only root filesystem where possible.
- Resource limits.
- Ephemeral credentials.
- Tool allowlists.
- Container image scanning and signing.
- Runtime seccomp/AppArmor profiles.

## Model And Tool Security

Controls:

- Model gateway prevents direct provider credential access by agents.
- Tool gateway validates schemas and permissions.
- Prompt injection defenses for connector outputs.
- Sensitive data policy before model calls.
- Output filtering for restricted publication.
- Tool call audit.
- Budget enforcement.

## Secrets Management

Requirements:

- Use cloud KMS, Vault, or customer-managed secret manager.
- Store only secret references in application database.
- Rotate provider, integration, and executor credentials.
- Inject secrets just in time into scoped execution context.
- Redact secrets from logs, traces, errors, and artifacts.

## Auditability

Audit events:

- Login and SSO changes.
- Workspace and role changes.
- Package admission and promotion.
- Graph publication.
- Policy changes.
- Secret reference changes.
- Session launch, cancel, retry, replay.
- Approval decisions.
- Artifact publication and deletion.
- Integration installation and scope changes.
- Runtime security findings.

Audit log requirements:

- Append-only.
- Tamper-evident storage option for enterprise.
- Exportable.
- Retention configurable.

## Compliance

Initial compliance targets:

- GDPR readiness.
- SOC 2 Type I, then Type II.
- ISO 27001 readiness later.

GDPR requirements:

- Data processing inventory.
- Data subject request workflows.
- Deletion and export support.
- Regional data controls.
- Processor/subprocessor documentation.

SOC 2 requirements:

- Access controls.
- Change management.
- Incident response.
- Vendor management.
- Monitoring.
- Backup and recovery.
- Security training.

## Secure Development Lifecycle

- Threat model for major features.
- Security design review for auth, policy, runtime, integrations, and artifacts.
- Dependency and container scanning.
- Secret scanning.
- Code review with security checklist.
- Penetration test before production.
- Vulnerability disclosure process.
- Incident response runbooks.

## Security Recommendations From Entangle Analysis

Keep:

- Signed message concept.
- Host-owned runtime identities.
- Resource binding separation.
- Artifact provenance.

Rebuild:

- Host API security.
- Persistence layer.
- Runtime authorization enforcement.
- Secret management.
- Production executor isolation.
- Observability and audit exports.
