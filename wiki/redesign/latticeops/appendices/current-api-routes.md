# Current Entangle API Surface

## Scope

This appendix reconstructs the current host API surface from repository code and client usage. Exact route implementation details may vary by handler, but the categories and operations are visible in the host and host-client code.

## API Style

Fact: current host API is REST-like JSON plus WebSocket events.

Fact: CLI and Studio both call host-facing operations.

## Route Categories

| Category | Current Capabilities |
| --- | --- |
| Status | Host status and health-style information. |
| Events | Host event listing and WebSocket stream. |
| Resource catalog | Read and update resources such as transports, artifacts, model endpoints, and git hosts. |
| Package sources | Configure sources for package admission. |
| Packages | Admit and inspect packages and package versions. |
| External principals | Register and inspect external principal identities. |
| Graph | Get and mutate graph revision state. |
| Nodes | Add, patch, and remove graph nodes. |
| Edges | Add, patch, and remove graph edges. |
| Runtimes | Desired/observed runtime state, start/stop/reconcile behavior. |
| Sessions | List and inspect sessions, turns, conversations, artifacts, and events. |
| Recovery | Recovery policy, history, and retry/reconciliation findings. |

## Product Interpretation

The existing API surface is broad enough to support a serious operations client. The issue is not lack of basic endpoints; the issue is production hardening:

- Authentication.
- Authorization.
- Tenant context.
- API versioning.
- Rate limits.
- Idempotency.
- OpenAPI contract generation.
- Audit guarantees.
- Error standardization.

## Redesign Mapping

| Entangle Surface | LatticeOps Equivalent |
| --- | --- |
| Host status | `/v1/status`, operational dashboards. |
| Host events | Session/runtime event streams with OpenTelemetry trace links. |
| Resource catalog | Model, tool, artifact, integration, memory, transport resources. |
| Package admission | Package registry with scans, approvals, promotion. |
| Graph revision | Graph drafts, validation, published revisions, diff. |
| Runtime desired state | Runtime orchestrator and sandboxed executor lifecycle. |
| Sessions | Durable workflow-backed sessions with timeline, artifacts, approvals, traces. |
| Recovery | Replay, retry, incident, and recovery workflows. |
