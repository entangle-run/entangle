# API Specification

## API Style

External API: REST over JSON with OpenAPI 3.1.

Real-time API: Server-Sent Events for simple event streams and WebSocket for bidirectional operational channels.

Internal API: ConnectRPC or gRPC for service-to-service contracts.

## API Principles

- Every request is authenticated except explicit public health endpoints.
- Every tenant-scoped request is authorized against workspace and environment context.
- Every mutating request is idempotency-key aware where retries are expected.
- Every response includes request ID.
- Errors use a stable structured format.
- Pagination is cursor-based.
- API versioning is path-based: `/v1`.

## Authentication

Supported methods:

- Browser session cookie for web console.
- OAuth/OIDC bearer token for user API access.
- API key for automation, exchanged for short-lived token where possible.
- Workload identity tokens for internal services.

Required headers:

```http
Authorization: Bearer <token>
X-LatticeOps-Workspace: <workspace_id>
X-Idempotency-Key: <key for retryable mutations>
```

## Authorization

Authorization evaluates:

- Actor identity.
- Workspace membership.
- Role.
- Environment.
- Resource type and action.
- Data classification.
- Graph and node policy.
- Approval state.

Denied requests return `403` with a safe missing-permission code.

## Error Format

```json
{
  "error": {
    "code": "graph.validation_failed",
    "message": "Graph revision failed validation.",
    "requestId": "req_01h...",
    "details": [
      {
        "path": "nodes.worker.resources.model",
        "reason": "Required model endpoint binding is missing."
      }
    ]
  }
}
```

## Pagination

Request:

```http
GET /v1/sessions?limit=50&cursor=eyJjcmVhdGVkQXQiOiI..."
```

Response:

```json
{
  "items": [],
  "nextCursor": "eyJjcmVhdGVkQXQiOiI..."
}
```

## Core Endpoints

### Workspaces

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/workspaces` | List accessible workspaces. |
| POST | `/v1/workspaces` | Create workspace. |
| GET | `/v1/workspaces/{workspaceId}` | Get workspace. |
| PATCH | `/v1/workspaces/{workspaceId}` | Update workspace. |
| GET | `/v1/workspaces/{workspaceId}/members` | List members. |
| POST | `/v1/workspaces/{workspaceId}/invites` | Invite member. |

### Packages

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/packages` | List packages. |
| POST | `/v1/packages` | Create package entry. |
| GET | `/v1/packages/{packageId}` | Get package. |
| POST | `/v1/packages/{packageId}/versions` | Ingest version. |
| GET | `/v1/packages/{packageId}/versions/{version}` | Get version. |
| POST | `/v1/packages/{packageId}/versions/{version}/promote` | Promote version. |
| POST | `/v1/packages/{packageId}/versions/{version}/validate` | Validate version. |

### Graphs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/graphs` | List graphs. |
| POST | `/v1/graphs` | Create graph. |
| GET | `/v1/graphs/{graphId}` | Get graph. |
| POST | `/v1/graphs/{graphId}/drafts` | Create draft revision. |
| PATCH | `/v1/graphs/{graphId}/drafts/{draftId}` | Update draft. |
| POST | `/v1/graphs/{graphId}/validate` | Validate draft or revision. |
| POST | `/v1/graphs/{graphId}/revisions/{revisionId}/publish` | Publish revision. |
| GET | `/v1/graphs/{graphId}/revisions/{revisionId}/diff` | Compare revisions. |

### Sessions

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/sessions` | List sessions. |
| POST | `/v1/sessions` | Launch session. |
| GET | `/v1/sessions/{sessionId}` | Get session. |
| POST | `/v1/sessions/{sessionId}/cancel` | Cancel session. |
| POST | `/v1/sessions/{sessionId}/retry` | Retry failed session. |
| POST | `/v1/sessions/{sessionId}/replay` | Replay session. |
| GET | `/v1/sessions/{sessionId}/events` | Stream or list events. |

### Artifacts

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/artifacts` | List artifacts. |
| POST | `/v1/artifacts` | Create artifact metadata. |
| GET | `/v1/artifacts/{artifactId}` | Get artifact. |
| POST | `/v1/artifacts/{artifactId}/versions` | Upload version. |
| GET | `/v1/artifacts/{artifactId}/versions/{versionId}/download` | Download version. |
| POST | `/v1/artifacts/{artifactId}/publish` | Publish externally. |
| GET | `/v1/artifacts/{artifactId}/lineage` | Get lineage. |

### Approvals

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/approvals` | List approval requests. |
| GET | `/v1/approvals/{approvalId}` | Get approval detail. |
| POST | `/v1/approvals/{approvalId}/decide` | Approve, reject, request changes, or escalate. |

### Runtimes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/runtimes` | List runtime instances. |
| GET | `/v1/runtimes/{runtimeId}` | Get runtime. |
| POST | `/v1/runtimes/{runtimeId}/start` | Start runtime. |
| POST | `/v1/runtimes/{runtimeId}/stop` | Stop runtime. |
| GET | `/v1/runtimes/{runtimeId}/logs` | Stream logs. |
| GET | `/v1/runtimes/{runtimeId}/events` | Stream events. |

### Policies

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/policies` | List policies. |
| POST | `/v1/policies` | Create policy. |
| PATCH | `/v1/policies/{policyId}` | Update policy. |
| POST | `/v1/policies/{policyId}/simulate` | Simulate policy. |
| POST | `/v1/policies/{policyId}/test` | Run policy tests. |

### Integrations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/integrations` | List integrations. |
| POST | `/v1/integrations/{provider}/install` | Install provider. |
| POST | `/v1/integrations/{integrationId}/test` | Test integration. |
| DELETE | `/v1/integrations/{integrationId}` | Remove integration. |

### Search

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/search` | Search across allowed resources. |

### Analytics

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/analytics/overview` | Workspace KPI summary. |
| GET | `/v1/analytics/costs` | Cost breakdown. |
| GET | `/v1/analytics/quality` | Quality and success metrics. |

## Request And Response Examples

### Launch Session

Request:

```http
POST /v1/sessions
Content-Type: application/json
Authorization: Bearer <token>
X-LatticeOps-Workspace: wsp_123
X-Idempotency-Key: launch-2026-04-24-001
```

```json
{
  "environmentId": "env_prod",
  "graphRevisionId": "grv_01hx",
  "targetNodeId": "worker-research",
  "input": {
    "type": "research_brief",
    "prompt": "Prepare a vendor comparison for SOC 2 evidence automation."
  },
  "attachments": [
    { "artifactId": "art_01aa" }
  ],
  "budget": {
    "maxCostCents": 1500,
    "maxRuntimeSeconds": 1800
  },
  "approvalPolicy": "standard"
}
```

Response:

```json
{
  "id": "ses_01hy",
  "status": "queued",
  "graphRevisionId": "grv_01hx",
  "targetNodeId": "worker-research",
  "createdAt": "2026-04-24T10:12:00Z",
  "links": {
    "events": "/v1/sessions/ses_01hy/events",
    "artifacts": "/v1/artifacts?sessionId=ses_01hy"
  }
}
```

### Approval Decision

Request:

```json
{
  "decision": "approved",
  "comment": "Approved for publication to the internal Confluence space.",
  "conditions": ["Do not include customer names in the summary."]
}
```

Response:

```json
{
  "id": "apr_01hz",
  "status": "approved",
  "decidedBy": "usr_01ab",
  "decidedAt": "2026-04-24T10:18:00Z"
}
```

## Event Stream

Endpoint:

```http
GET /v1/sessions/{sessionId}/events/stream
Accept: text/event-stream
```

Event example:

```json
{
  "id": "evt_01",
  "type": "model.call.completed",
  "sessionId": "ses_01hy",
  "nodeId": "worker-research",
  "timestamp": "2026-04-24T10:13:22Z",
  "summary": "Model call completed",
  "traceId": "trc_abc",
  "costCents": 42
}
```

## Versioning

- Public API uses `/v1` path versioning.
- Breaking changes require a new path version.
- Additive fields are allowed in minor releases.
- Deprecated fields include sunset metadata in OpenAPI and response headers.
- Webhook events use independent event schema versions.

## Webhooks

Webhook events:

- `session.created`
- `session.completed`
- `session.failed`
- `approval.requested`
- `approval.decided`
- `artifact.created`
- `artifact.published`
- `runtime.degraded`
- `policy.violation`

Security:

- HMAC signature.
- Timestamp tolerance.
- Replay protection.
- Delivery retries with exponential backoff.
