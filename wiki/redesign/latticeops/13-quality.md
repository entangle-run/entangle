# Quality Assurance

## Quality Strategy

LatticeOps quality must cover deterministic software behavior and probabilistic AI behavior. Traditional tests verify contracts, services, permissions, and UI. AI-specific evaluations verify output quality, policy compliance, tool behavior, and regressions across model changes.

## Unit Testing

Scope:

- Domain validators.
- Policy helpers.
- Authorization checks.
- Cost calculations.
- Data mappers.
- Provider adapter parsing.
- Artifact lineage operations.

Standards:

- High coverage on pure domain logic.
- Table-driven tests for validators and policies.
- No network dependency in unit tests.

## Integration Testing

Scope:

- API plus PostgreSQL.
- Graph validation plus package registry.
- Session service plus workflow engine.
- Runtime orchestrator plus sandbox scheduler fake.
- Model gateway plus provider mock.
- Artifact service plus object storage emulator.
- Search indexing pipeline.

Standards:

- Use containers for realistic dependencies.
- Reset database per test suite.
- Verify transactional outbox behavior.
- Verify idempotency keys on retryable mutations.

## End-To-End Testing

Core E2E scenarios:

1. Onboard workspace and run first graph.
2. Publish package and instantiate node.
3. Launch session and produce artifact.
4. Trigger approval gate and approve output.
5. Fail model provider and verify fallback or failure evidence.
6. Deny unauthorized artifact read.
7. Export audit evidence.
8. Search for completed session and artifact.

Tools:

- Playwright for browser flows.
- API E2E suite for headless flows.
- Synthetic model provider for deterministic runs.

## AI Evaluation Testing

Scope:

- Agent instruction following.
- Tool selection accuracy.
- Artifact output quality.
- Policy compliance.
- Memory retrieval safety.
- Regression across model versions.

Approach:

- Golden task suites by package.
- Human-reviewed evaluation rubrics for high-value tasks.
- Automated graders where reliable.
- Model/provider change gates before production rollout.

## Performance Testing

Targets for initial production:

- API p95 latency under 300 ms for ordinary reads.
- Session launch p95 under 1 second excluding queue wait.
- Event stream delivery p95 under 2 seconds.
- Graph validation p95 under 2 seconds for common graphs.
- Support 1,000 queued sessions and 100 active executor pods in initial tier.

Tests:

- Load tests for API and event streams.
- Executor scheduling stress tests.
- Artifact upload/download throughput tests.
- Search query latency tests.
- Database index and partition tests.

## Security Testing

Scope:

- Authentication bypass attempts.
- Tenant isolation.
- RBAC/ABAC permissions.
- API rate limits.
- Webhook signature validation.
- Secret redaction.
- Sandbox escape hardening.
- SSRF through tools and connectors.
- Prompt and tool injection scenarios.

Tools:

- SAST.
- Dependency scanning.
- Container scanning.
- IaC scanning.
- DAST for deployed environments.
- Manual penetration testing before production.

## CI Validation

Every pull request:

- Format check.
- Lint.
- Unit tests.
- Type checks.
- OpenAPI generation drift check.
- Migration validation.
- Policy tests.
- Dependency scan.
- Secret scan.
- Container build for changed services.

Main branch:

- Full integration tests.
- E2E smoke tests.
- Container image scan.
- Preview deployment.

Release candidate:

- Full E2E suite.
- Load test subset.
- Security regression suite.
- Backup and restore smoke test.

## Test Data Management

- Use generated synthetic data.
- Do not use customer data in automated tests.
- Keep deterministic fixture packages for agents.
- Maintain malicious fixtures for security tests.
- Redact prompt and artifact samples used in evaluation datasets.

## Quality Gates

Before private beta:

- MVP E2E scenarios pass.
- No known critical or high security findings.
- Tenant isolation tests pass.
- Audit log coverage for mutating actions.
- Backup restore validated.

Before production:

- Pen test completed and remediated.
- Load targets met.
- SLO dashboards active.
- On-call runbooks complete.
- Data retention and deletion workflows tested.

## Residual Risk

AI output quality remains probabilistic. The product must not promise perfect autonomy. It should promise governance, evidence, approvals, and continuous improvement mechanisms.
