# Canonical Type System

This document defines the core types that should be treated as architecturally stable.

## Design rule

If a type defined here is wrong, the whole system will need structural rewrites later. These types should therefore be designed for the full product, even if the hackathon build supports only restricted value profiles.

## 1. AgentPackage

Portable storage-level representation of an agent.

### Required fields

| Field | Type | Meaning |
| --- | --- | --- |
| `agent_package_version` | string | Version of the package schema |
| `agent_template_id` | string | Stable template identifier |
| `name` | string | Human-readable package name |
| `description` | string | Short semantic description |
| `compatible_entangle_version` | string | Entangle compatibility constraint |
| `default_capabilities` | string[] | Capability identifiers |
| `entry_files` | object | Paths to system prompt, capabilities, runtime config |

### Semantics

- portable across machines;
- not graph-specific;
- may be imported, exported, or versioned independently;
- must be valid without embedding secrets.

## 2. NodeInstance

Graph-local binding of an agent package.

### Required fields

| Field | Type | Meaning |
| --- | --- | --- |
| `graph_id` | string | Graph identity |
| `node_id` | string | Stable graph-local node id |
| `pubkey` | string | Nostr public key used by this runtime node |
| `agent_template_id` | string | Package/template identity |
| `display_name` | string | Human-facing graph label |
| `node_kind` | enum | `user`, `supervisor`, `worker`, `executor`, `reviewer`, `router`, `memory`, `service` |
| `role_in_graph` | string | Functional role in this graph |
| `visibility_mode` | enum | `local`, `neighborhood`, `full` |
| `autonomy_level` | enum | `manual`, `bounded`, `autonomous` |
| `artifact_backend_profile` | string[] | Supported artifact backends |

### Optional fields

- graph-local prompt addendum
- local policy labels
- secret references
- package source descriptor

## 3. Edge

Canonical relationship object between two node instances.

### Required fields

| Field | Type | Meaning |
| --- | --- | --- |
| `edge_id` | string | Stable edge identifier |
| `graph_id` | string | Parent graph |
| `source_node_id` | string | Initiating side for the canonical relation |
| `target_node_id` | string | Receiving side for the canonical relation |
| `relation_type` | enum | Relation semantic |
| `initiator_policy` | enum | `source_only`, `target_only`, `bidirectional` |
| `transport_policy` | object | Transport contract |
| `approval_policy` | object | Transition and approval behavior |
| `message_policy` | object | Allowed message classes and constraints |
| `state` | enum | `enabled`, `disabled`, `throttled` |

### Relation type candidates

- `supervises`
- `delegates_to`
- `reports_to`
- `peer_collaborates_with`
- `reviews`
- `consults`
- `routes_to`
- `escalates_to`

## 4. GraphSpec

Static topology definition.

### Required fields

| Field | Type | Meaning |
| --- | --- | --- |
| `graph_id` | string | Stable graph identifier |
| `name` | string | Human-facing graph name |
| `description` | string | Purpose of the organization |
| `owner_pubkey` | string | Owner or primary operator |
| `entrypoints` | string[] | Node ids exposed to the user |
| `nodes` | string[] or embedded refs | Node membership |
| `edges` | string[] or embedded refs | Edge membership |
| `policy_profile` | string | Named policy profile |
| `artifact_backend_defaults` | string[] | Defaults for graph-wide work substrate |

## 5. TransportPolicy

This type should be general now, even if the hackathon runtime supports only a restricted profile.

### Canonical fields

| Field | Type | Meaning |
| --- | --- | --- |
| `mode` | enum | `bidirectional_shared_set`, `directional`, `custom` |
| `shared_relays` | string[] | Used when mode is symmetric |
| `source_to_target` | object | Directional transport settings |
| `target_to_source` | object | Reverse directional settings |
| `channel` | string | Logical interaction channel |

### Hackathon profile

Support only:

- `mode = bidirectional_shared_set`
- one shared relay set
- one logical channel

## 6. ApprovalPolicy

Approval and acknowledgment behavior for work transitions.

### Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `requires_ack` | boolean | Whether receiver must acknowledge |
| `requires_confirmation_before_execution` | boolean | Whether work may begin immediately |
| `requires_confirmation_before_response` | boolean | Whether outbound response is gated |
| `approver_node_ids` | string[] | Nodes allowed to approve |
| `timeout_seconds` | number | Optional approval timeout |

## 7. RuntimeProjection

Materialized local context injected into a node workspace by the runner.

### Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `node_instance` | object | Current node instance |
| `direct_peers` | object[] | Peer projections derived from edges |
| `reachable_nodes` | object[] | Optional future path hints |
| `active_edge_policies` | object[] | Relevant edge policies |
| `relay_context` | object | Effective relay configuration |
| `approval_context` | object | Effective approval context |
| `artifact_context` | object | Artifact backend mounts and references |

## 8. Session

Session is the unit of execution across the graph.

### Required fields

| Field | Type | Meaning |
| --- | --- | --- |
| `session_id` | string | Stable execution id |
| `graph_id` | string | Graph used for execution |
| `entrypoint_node_id` | string | Entry node chosen by the user |
| `originating_user_node_id` | string | User node |
| `intent` | string | Human-facing summary of work |
| `status` | enum | Session lifecycle state |
| `trace_id` | string | Correlation id |

## 9. ArtifactRef

Pointer to work product or durable state.

### Required fields

| Field | Type | Meaning |
| --- | --- | --- |
| `artifact_id` | string | Artifact identifier |
| `backend` | enum | `git`, `wiki`, `local_file`, later others |
| `locator` | object | Backend-specific address |
| `created_by_node_id` | string | Owner/creator |
| `session_id` | string | Session context |
| `task_id` | string or null | Task linkage |

### Git locator example

```json
{
  "backend": "git",
  "locator": {
    "remote": "gitea://entangle/demo",
    "repo": "demo-workspace",
    "branch": "worker-a/refactor-1",
    "commit": "abc123"
  }
}
```
