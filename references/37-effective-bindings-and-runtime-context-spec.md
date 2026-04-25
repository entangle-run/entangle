# Effective Bindings and Runtime Context Specification

This document defines how Entangle should transform graph bindings, deployment
resources, and secret references into the effective runtime context consumed by
a running node.

The goal is to make runner execution deterministic, auditable, and independent
from ad hoc host-side implicit logic.

## Design rule

The runner should receive resolved and validated runtime context, not raw
unresolved authoring objects.

That means:

- packages remain portable and graph-agnostic;
- graph and deployment objects remain the source of truth;
- the host resolves effective bindings;
- the runner consumes derived context plus separate secrets.

## 1. Binding layers

Entangle should distinguish between four layers.

### 1. Template package

Portable package content.

### 2. Graph-local node binding

The node's role, visibility, autonomy, policies, and explicit binding refs.

### 3. Effective binding

The resolved combination of:

- package source;
- graph defaults;
- node overrides;
- deployment resource catalog;
- external principal bindings;
- secret references;
- runtime backend profile.

### 4. Runtime context

The injected, runner-facing operational context materialized on disk plus
secret mounts or env vars.

## 2. NodeResourceBindings

Each node should be able to declare resource bindings by reference.

Recommended conceptual fields:

- `relay_profile_refs`
- `primary_relay_profile_ref`
- `git_service_refs`
- `primary_git_service_ref`
- `model_endpoint_profile_ref`
- `external_principal_refs`

The graph may define defaults for some or all of these.

## 3. Effective binding resolution

The host should resolve effective bindings using this precedence:

1. node-local explicit binding
2. graph default
3. deployment default

This resolution should happen before the runner starts.

The runner should not be responsible for merging graph and deployment defaults
at runtime.

## 4. EffectiveNodeBinding

The host should build a derived effective binding object for each runnable node.

Recommended fields:

| Field | Meaning |
| --- | --- |
| `binding_id` | Stable effective binding id |
| `graph_revision_id` | Graph revision used |
| `node_id` | Bound node |
| `package_source_id` | Selected package source |
| `resource_bindings` | Resolved resource refs |
| `external_principals` | Resolved principal bindings |
| `runtime_backend_profile` | Backend profile used for execution |
| `workspace_layout_version` | Runtime workspace layout version |
| `projection_version` | Runtime context format version |

This is a host-derived object, not a hand-authored source artifact.

## 5. Effective resource context

The runner needs more than ids. It needs resolved, non-secret operational
context.

Recommended effective context partitions:

### Relay context

- relay profiles available to this node;
- which relay set is primary;
- per-edge effective communication surfaces when relevant;
- channel names and transport mode interpretation.

### Artifact context

- available artifact backends;
- git services available to this node;
- primary git service and namespace hints;
- workspace mount locations;
- publish/read capability hints.

### Model context

- resolved model endpoint profile id;
- engine adapter kind;
- base URL;
- default model id if any;
- capability labels or provider hints;
- auth mode hint, without secret material.

### Approval and policy context

- approval requirements;
- autonomy bounds;
- runtime safety constraints;
- response gating rules.

## 6. Runtime-injected file set

The runtime workspace should include a stable injected context surface.

Recommended injected files:

- `node-instance.json`
- `effective-binding.json`
- `graph-context.json`
- `peers.json`
- `policies.json`
- `relay-context.json`
- `artifact-context.json`
- `model-context.json`
- `approval-context.json`

These files are all derived.

They are not package truth and should never be edited manually as the source of
truth.

## 7. Secret delivery rule

The injected files must not contain raw secrets.

In particular:

- no Nostr private key in injected JSON;
- no git private key in injected JSON;
- no provider API key in injected JSON.

Secrets should arrive through:

- mounted files;
- environment variables;
- secret-store materialization;
- later other secret adapters.

The injected JSON should carry only:

- references;
- profile ids;
- non-secret operational metadata.

The current implementation now also carries explicit non-secret
`identityContext` metadata for runner authorship while keeping the secret key
delivery separate.

The current implementation also now resolves host-managed external principals
into effective runtime context instead of leaving git-facing identity entirely
implicit.

## 8. Relay context semantics

`relay-context.json` should describe what the runner can actually use.

Recommended fields:

- `primary_relay_profile_id`
- `relay_profiles`
- `default_publish_relays`
- `default_subscribe_relays`
- `edge_routes`

Where `edge_routes` may contain peer-specific derived routes such as:

- peer node id
- peer Nostr public key when the peer is a host-managed non-user runtime node;
- direction
- channel
- publish relay set
- subscribe relay set

This lets the runner avoid recomputing transport compatibility at send time.
The runtime context must not synthesize public keys for user nodes until the
product has a real user-identity binding; those routes may remain addressable
by node id while `peerPubkey` is absent.

## 9. Artifact context semantics

`artifact-context.json` should describe the artifact surfaces available to the
node.

Recommended fields:

- `backends`
- `git_services`
- `git_principals`
- `primary_git_service_id`
- `primary_git_principal_ref`
- `default_namespace`
- `workspace_mounts`
- `publication_constraints`

`primary_git_principal_ref` and `default_namespace` should only be populated
when the host can resolve them deterministically. The runtime should not invent
fallback identity or namespace choices by taking the "first" git principal or
the "first" git service when multiple candidates remain.

This allows the runner to:

- know where collaborative work should be pushed;
- know which git services are readable or writable;
- keep artifact references stable and explicit.

## 10. Model context semantics

`model-context.json` should describe the effective inference surface for the
node.

Recommended fields:

- `model_profile_id`
- `adapter_kind`
- `base_url`
- `default_model`
- `capability_labels`
- `provider_notes`

This allows the runner to select the correct engine adapter and provider wiring
without hardcoding a product-wide provider.

## 11. Workspace materialization semantics

Effective bindings should also determine the runtime workspace shape.

The host should materialize:

- read-only package source;
- writable memory surface;
- writable artifact workspace;
- injected context directory;
- secret mounts;
- runtime state directory.

These surfaces should be versioned enough that host and runner can detect stale
or incompatible materializations.

## 12. Rebinding and restart rules

If any of these change materially:

- graph revision;

## 13. Current implemented slice

The current repository implementation realizes the first serious subset of this
specification as:

- one injected `effective-runtime-context.json` per node;
- one desired effective-binding record per non-user node;
- resolved external principal bindings materialized into effective bindings and
  artifact runtime context;
- workspace partitions for `package/`, `memory/`, `workspace/`, `runtime/`,
  and `injected/`;
- a package link from workspace `package/` to the admitted package source for
  `local_path` packages;
- seeded writable memory copied from the package template on first
  materialization;
- non-secret relay, git, and model context delivered through injected JSON.

The current slice intentionally does not yet split the injected surface into
multiple files such as `relay-context.json`, `artifact-context.json`, or
`model-context.json`. The single-file form is acceptable for the current phase
because the contract is already versioned and test-backed, and can still be
split later without changing the host-owned semantic model.
- node resource bindings;
- relevant graph defaults;
- deployment resource catalog;
- external principal binding;
- workspace layout version;

the host should decide whether the node needs:

- projection refresh only;
- soft restart;
- full runtime recreation.

The runner should not silently continue forever against stale context if the
effective binding is no longer current.

## 13. Hackathon profile

The hackathon should use a heavily restricted but still canonical profile:

- one relay profile shared by all nodes;
- one git service profile shared by all nodes;
- one model endpoint profile shared by all nodes;
- one engine adapter;
- one effective binding shape;
- one runtime workspace layout version.

This remains the same architecture because the restrictions live in the active
profile, not in the type system.

## 14. Rejected anti-patterns

Reject these directions:

- runner recomputing graph defaults and deployment merges on its own;
- injecting raw secrets into structured context files;
- storing only raw URLs in node bindings without resource ids;
- letting package content encode deployment-specific relay, git, or model
  endpoints as if they were portable truth;
- treating the effective runtime context as informal host internals rather than
  a versioned contract.
