# Host API and Reconciliation Specification

This document defines the first serious API surface and reconciliation model for
`entangle-host`.

The goal is to make the host boundary implementable as a real control plane
rather than a vague service placeholder.

## Design rule

The host API should be:

- explicit;
- deployment-profile aware;
- stable enough for Studio, CLI, and tests to build against;
- centered on desired state, observed state, and validation-backed mutation.

It must not degrade into:

- UI-owned hidden actions;
- shell-script orchestration outside the product boundary;
- duplicated mutation logic across multiple clients.

## 1. Trust boundary

For the first serious implementation, the host API should be treated as a local
operator boundary.

That means:

- it is not the public multi-tenant internet-facing control plane;
- it is trusted by the local operator and local product surfaces;
- Studio, CLI, and tests are first-class clients of the same boundary.

This simplifies the first implementation without weakening the architectural
model.

The current implementation now includes an optional bootstrap operator-token
guard. When `ENTANGLE_HOST_OPERATOR_TOKEN` is set, host HTTP routes require
`Authorization: Bearer <token>`, and the event stream validates the same token
before starting. Protected mutation requests emit typed
`host.operator_request.completed` security events that record only non-secret
request metadata, normalized bootstrap operator role, and final response
status. Token-protected Hosts also enforce the bootstrap `viewer` role as
read-only. This is a local hardening and auditability step, not the final
enterprise identity or authorization model.

Canonical request and response DTO schemas for this API should live in
`packages/types`, while semantic checks and reconciler behavior remain owned by
`packages/validator` and `services/host`.

## 2. Recommended transport

Recommended first transport shape:

- local HTTP API for request-response control operations;
- local WebSocket stream for events, traces, health, and reconciliation status.

Alternative transports such as IPC can still be viable later, but HTTP +
WebSocket is the best first compromise because it is:

- easy to inspect;
- easy to script;
- easy to bind from web and CLI clients;
- compatible with a future remote-host boundary if needed.

## 3. Core host-managed objects

The host API should expose or operate on at least these object classes.

### Deployment resource catalog

The active registry of relay, git service, and model endpoint profiles.

### Package source

A locally admitted package origin such as:

- a validated host-visible `local_path`; or
- an imported `local_archive` materialized into host-managed package storage.

The canonical model should keep both forms, but the first implemented host
slice may support `local_path` admission first and defer `local_archive`
materialization until archive import tooling exists.

### Applied graph revision

The desired graph revision and associated defaults currently chosen by the
operator.

The current implementation now also exposes:

- revision-history listing through `GET /v1/graph/revisions`; and
- revision-detail inspection through `GET /v1/graph/revisions/{revisionId}`.

### Applied node binding

The graph-local node binding plus effective runtime and resource references.

### Runtime instance

The concrete runner instance for a node.

### Validation run

A structured set of findings produced before or during apply.

### Event stream

Host-side operational events, runtime status changes, and session trace events.

## 4. Desired state versus observed state

The host should explicitly separate:

### Desired state

- active deployment resource catalog version;
- applied graph revision;
- admitted package sources;
- node bindings that should exist;
- nodes that should be running.

### Observed state

- package sources actually present;
- latest validation status;
- runtime instances actually running;
- container or process health;
- effective revision and binding currently mounted in each runtime;
- last known runtime errors.
- runtime-backend identity and runtime handles when known;
- persisted reconciliation summary for health and debugging.

Reconciliation is the process of converging observed state toward desired state.

## 5. Reconciliation loop

The host should run a continuous reconciliation loop.

Recommended stages:

1. load desired state;
2. inspect current observed state;
3. detect drift;
4. compute required actions;
5. apply actions in dependency order;
6. emit structured events;
7. repeat or await the next mutation trigger.

### Typical drift classes

- node should be running but no runtime exists;
- runtime exists with stale graph revision;
- runtime exists with stale runtime-context materialization;
- runtime exists with stale resource bindings;
- package source is missing or invalid after admission;
- resource profile changed and dependent nodes need restart or rebind;
- runtime failed repeatedly and is now degraded.

## 6. Mutation contract

Every serious host mutation should follow the same pattern:

1. receive request;
2. normalize request;
3. validate request and affected objects;
4. reject or accept explicitly;
5. if accepted, write a new desired-state revision;
6. trigger reconciliation;
7. emit mutation and reconciliation events.

This applies to:

- node admission;
- edge creation and edit;
- graph default changes;
- deployment resource catalog changes;
- runtime lifecycle requests.

## 7. API design stance

The API should be resource-oriented and explicit rather than RPC-shaped around
UI gestures.

That means clients should talk in terms of:

- package sources;
- graph revisions;
- node bindings;
- runtimes;
- validations;
- events.

The host may still expose action endpoints where needed, but those actions
should be grounded in these resources.

## 8. Recommended HTTP surface

The exact route names may evolve, but the first serious API should cover at
least the following surfaces. The earliest implemented slice may only realize a
strict subset, but that subset should align with the same resource model rather
than inventing a temporary API.

### 8.1 Catalog

- `GET /v1/catalog`
- `PUT /v1/catalog`
- `POST /v1/catalog/validate`

Purpose:

- inspect and update the deployment resource catalog;
- validate relay, git service, and model endpoint profiles before apply.

### 8.2 Package sources

- `GET /v1/package-sources`
- `POST /v1/package-sources/admit`
- `GET /v1/package-sources/{packageSourceId}`
- `DELETE /v1/package-sources/{packageSourceId}`

Purpose:

- admit host-visible local package folders or imported local archives;
- inspect normalized package metadata;
- remove unused package sources.

Admission requests should not rely on browser-local directory handles as the
canonical source identifier. Studio may use a convenience file-picker flow, but
the host should persist a normalized package-source record such as `local_path`
or host-managed imported archive storage.

### 8.2.1 External principals

- `GET /v1/external-principals`
- `GET /v1/external-principals/{principalId}`
- `PUT /v1/external-principals/{principalId}`
- `DELETE /v1/external-principals/{principalId}`

Purpose:

- persist backend-facing principal bindings such as git principals;
- expose those bindings to Studio, CLI, and tests through the host boundary;
- keep credential references and attribution profiles out of package sources and
  out of ad hoc runtime-only configuration.
- remove unused principal bindings while rejecting deletion when the active
  graph still resolves the principal through node-local or graph-default
  bindings.

### 8.3 Graph and revision state

- `GET /v1/graph`
- `PUT /v1/graph`
- `GET /v1/graph/revisions`
- `GET /v1/graph/revisions/{revisionId}`
- `POST /v1/graph/validate`

Purpose:

- inspect current desired graph;
- inspect revision history;
- validate proposed graph mutations.

The current implementation now covers all five routes in this subsection.

### 8.4 Node bindings

- `GET /v1/nodes`
- `POST /v1/nodes`
- `GET /v1/nodes/{nodeId}`
- `PATCH /v1/nodes/{nodeId}`
- `DELETE /v1/nodes/{nodeId}`

Purpose:

- create or update graph-local node bindings;
- bind packages, resources, and principals to nodes.

The current implementation now covers:

- `GET /v1/nodes`
- `POST /v1/nodes`
- `GET /v1/nodes/{nodeId}`
- `PATCH /v1/nodes/{nodeId}`
- `DELETE /v1/nodes/{nodeId}`

The current node-mutation semantics are:

- `POST` creates a new managed non-user node in the active graph;
- `PATCH` performs full normalized replacement of a managed node binding
  without renaming `nodeId`;
- `DELETE` rejects removal while graph edges still reference the node.

### 8.5 Edges

- `GET /v1/edges`
- `POST /v1/edges`
- `PATCH /v1/edges/{edgeId}`
- `DELETE /v1/edges/{edgeId}`

Purpose:

- manage topology and policy edges with full validation.

The current implementation now covers all four routes in this subsection.

The current edge-mutation semantics are:

- `POST` creates a new edge in the active graph;
- `PATCH` performs full normalized replacement of an edge without renaming
  `edgeId`;
- `DELETE` removes the edge from the active graph;
- invalid edge endpoints remain validation failures, not implicit node
  creation or resource conflicts.

### 8.6 Sessions

- `GET /v1/sessions`
- `GET /v1/sessions/{sessionId}`

Purpose:

- inspect persisted runner session state through a host-owned read model;
- expose aggregated session summaries plus per-node session detail without
  requiring Studio or CLI to read runner files directly;
- provide the stable inspection boundary that future host event widening for
  session and runner activity should build upon.

The current implementation now covers both routes in this subsection.

### 8.7 Runtime lifecycle

- `GET /v1/runtimes`
- `GET /v1/runtimes/{nodeId}`
- `GET /v1/runtimes/{nodeId}/context`
- `GET /v1/runtimes/{nodeId}/turns`
- `GET /v1/runtimes/{nodeId}/turns/{turnId}`
- `GET /v1/runtimes/{nodeId}/artifacts`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/preview`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/history`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/diff`
- `POST /v1/runtimes/{nodeId}/start`
- `POST /v1/runtimes/{nodeId}/stop`
- `POST /v1/runtimes/{nodeId}/restart`

## 9. Current implemented slice

The current repository implementation now concretely includes:

- `GET /v1/host/status`
- `GET/PUT /v1/catalog`
- `POST /v1/catalog/validate`
- `GET /v1/package-sources`
- `GET /v1/package-sources/{packageSourceId}`
- `POST /v1/package-sources/admit`
- `GET /v1/external-principals`
- `GET /v1/external-principals/{principalId}`
- `PUT /v1/external-principals/{principalId}`
- `DELETE /v1/external-principals/{principalId}`
- `GET /v1/graph`
- `PUT /v1/graph`
- `GET /v1/graph/revisions`
- `GET /v1/graph/revisions/{revisionId}`
- `POST /v1/graph/validate`
- `GET /v1/nodes`
- `POST /v1/nodes`
- `GET /v1/nodes/{nodeId}`
- `PATCH /v1/nodes/{nodeId}`
- `DELETE /v1/nodes/{nodeId}`
- `GET /v1/edges`
- `POST /v1/edges`
- `PATCH /v1/edges/{edgeId}`
- `DELETE /v1/edges/{edgeId}`
- `GET /v1/sessions`
- `GET /v1/sessions/{sessionId}`
- `GET /v1/runtimes`
- `GET /v1/runtimes/{nodeId}`
- `GET /v1/runtimes/{nodeId}/context`
- `GET /v1/runtimes/{nodeId}/turns`
- `GET /v1/runtimes/{nodeId}/turns/{turnId}`
- `GET /v1/runtimes/{nodeId}/artifacts`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/preview`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/history`
- `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/diff`
- `GET /v1/runtimes/{nodeId}/recovery`
- `PUT /v1/runtimes/{nodeId}/recovery-policy`
- `GET /v1/events`
- `POST /v1/runtimes/{nodeId}/start`
- `POST /v1/runtimes/{nodeId}/stop`
- `POST /v1/runtimes/{nodeId}/restart`

The currently missing runtime lifecycle elements are:

- `DELETE /v1/runtimes/{nodeId}`

Purpose:

- inspect and influence runner lifecycle without bypassing desired-state truth.

The current implementation also exposes:

- per-runtime backend kind;
- runtime handles when the backend reports them;
- runtime status messages suitable for Studio and CLI;
- per-runtime reconciliation state and finding codes derived from canonical
  runtime inspection state rather than from a separate host-only heuristic
  model;
- restart-generation-backed lifecycle inspection and typed
  `runtime.restart.requested` events;
- read-only persisted runner-turn collection and item inspection for active
  runtimes;
- read-only persisted artifact collection, item, bounded preview, bounded git
  history, and bounded git diff inspection for active runtimes;
- read-only persisted runtime recovery-history inspection through
  `GET /v1/runtimes/{nodeId}/recovery`, with durable per-node records and
  canonicalized fingerprint-based deduplication;
- explicit host-owned recovery policy mutation through
  `PUT /v1/runtimes/{nodeId}/recovery-policy`;
- persisted recovery-policy records plus observed recovery-controller state,
  both exposed through the runtime recovery inspection surface;
- bounded automatic `restart_on_failure` recovery owned by the host control
  plane rather than by the runner, with durable exhaustion accounting anchored
  in stable failure fingerprints;
- typed `runtime.recovery_policy.updated` events for recovery-policy mutation;
- typed `runtime.recovery.attempted` and `runtime.recovery.exhausted` events
  for bounded automatic recovery progress;
- typed `runtime.recovery.recorded` events for durable recovery snapshots;
- typed `runtime.recovery_controller.updated` events for meaningful
  recovery-controller state transitions;
- host-managed external principal inspection and mutation;
- host-level reconciliation status via `GET /v1/host/status`;
- richer host-level reconciliation counters for blocked, degraded,
  transitioning, and total issue counts;
- typed host-event inspection through `GET /v1/events`;
- live host-event streaming over WebSocket upgrade on `GET /v1/events`;
- typed control-plane `edge.updated` events for graph-backed edge mutations;
- host-derived `session.updated` events over persisted runner session state;
- host-derived `runner.turn.updated` events over persisted runner turn state,
  with durable deduplication anchored in observed host state rather than
  transient in-memory replay state.

### 8.7 Validation and dry-run

- `POST /v1/validate/package`
- `POST /v1/validate/graph`
- `POST /v1/validate/binding`
- `POST /v1/validate/deployment`

Purpose:

- enable Studio, CLI, and CI-like flows to validate without mutating state.

### 8.8 Trace inspection and future widening

- `GET /v1/sessions/{sessionId}/trace`

Purpose:

- widen the now-implemented session-inspection boundary into deeper trace
  inspection without collapsing trace semantics into the first session-summary
  slice.

## 10. Recommended WebSocket event stream

The current repository now implements the first serious version of this
boundary:

- `GET /v1/events` upgraded to WebSocket

The implemented event classes currently include:

- `host.operator_request.completed`
- `catalog.updated`
- `package_source.admitted`
- `package_source.deleted`
- `external_principal.updated`
- `external_principal.deleted`
- `graph.revision.applied`
- `node.binding.updated`
- `edge.updated`
- `runtime.desired_state.changed`
- `runtime.restart.requested`
- `runtime.recovery_policy.updated`
- `runtime.recovery.attempted`
- `runtime.recovery.exhausted`
- `runtime.recovery.recorded`
- `runtime.recovery_controller.updated`
- `runtime.observed_state.changed`
- `session.updated`
- `runner.turn.updated`
- `conversation.trace.event`
- `approval.trace.event`
- `artifact.trace.event`
- `host.reconciliation.completed`

The current `host.reconciliation.completed` event now carries richer aggregate
reconciliation metadata, including blocked, degraded, transitioning, and
issue-count summaries.

The broader target surface should continue to widen from there.

Event classes should include at least:

- `catalog.updated`
- `package_source.admitted`
- `validation.completed`
- `graph.revision.applied`
- `node.binding.updated`
- `runtime.state.changed`
- `runtime.health.changed`
- `session.trace.event`
- `host.reconciliation.started`
- `host.reconciliation.completed`
- `host.reconciliation.failed`

The event payloads should carry:

- stable ids;
- timestamps;
- revision references;
- node or session references when relevant;
- machine-readable state deltas where appropriate.

## 11. Idempotency and concurrency stance

The first implementation does not need distributed transactions, but it should
still be disciplined.

Recommended rules:

- resource updates should replace whole normalized objects or use explicit
  patches;
- write requests should accept an optional precondition such as the expected
  current revision id;
- repeated lifecycle actions such as `start` or `stop` should be idempotent
  where practical;
- failed mutations must not leave graph truth half-written.

## 12. Validation-before-apply rule

The host should never mutate desired graph or node state blindly.

Every mutation that can affect runtime behavior should pass through:

- shape validation;
- referential validation;
- semantic validation;
- environment validation.

If validation fails:

- the mutation should be rejected;
- findings should be returned to the caller;
- no partial desired-state write should occur.

## 13. Hackathon API subset

The hackathon does not need the full surface above, but it should preserve the
same conceptual boundary.

Recommended minimum subset:

- inspect current graph and runtimes;
- admit a local package source;
- add or update a node binding;
- add or update an edge;
- start, stop, or restart a node runtime;
- retrieve validation findings;
- subscribe to runtime and session events.

This is enough for:

- Studio as a real admin surface;
- a thin CLI if included;
- no frontend-only hidden control paths.

## 13. Rejected anti-patterns

Reject these directions:

- host API that directly mirrors UI widgets instead of system resources;
- mutation paths that skip validation because the caller is "trusted";
- lifecycle actions that mutate runtime state without updating desired state;
- a trace surface only available through browser memory instead of the host;
- treating reconciliation as optional background behavior instead of a core host
  responsibility.
