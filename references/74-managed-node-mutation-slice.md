# Managed Node Mutation Slice

This document records the implementation batch that completed the first
resource-oriented managed-node mutation surface through `entangle-host`.

The goal of this slice was to add real create, replace, and delete behavior on
top of the previously completed applied-node inspection boundary, without
introducing a second source of truth outside the graph.

## What this slice changed

The system now has:

- canonical managed-node mutation DTOs in `packages/types`;
- typed `node.binding.updated` host events;
- host state helpers that mutate the active graph and produce a new graph
  revision rather than maintaining a parallel node store;
- `POST /v1/nodes`;
- `PATCH /v1/nodes/{nodeId}`;
- `DELETE /v1/nodes/{nodeId}`;
- shared `packages/host-client` support for create, replace, and delete;
- CLI support for `host nodes add`, `host nodes replace`, and
  `host nodes delete`;
- tests covering create, replace, delete, conflict handling, and host-client
  error semantics.

## 1. Scope of the resource

The managed-node mutation surface is intentionally scoped to **non-user nodes**
only.

That preserves the model introduced by the applied-node inspection slice:

- user nodes remain part of the graph;
- managed node routes operate on runtime-bearing host-managed nodes;
- user-node graph membership still remains available through full graph
  mutation, not this narrower surface.

This avoids an awkward half-state where node mutation routes could target nodes
that the host does not materialize as runtimes.

## 2. Mutation semantics

The surface now behaves as follows.

### `POST /v1/nodes`

Creates a new managed node by appending a full normalized non-user node binding
to the active graph.

Rules:

- an active graph revision must already exist;
- the incoming `nodeId` must be unused across the entire graph, including user
  nodes;
- the candidate graph is validated before apply;
- successful creation produces a new graph revision and a `node.binding.updated`
  event with `mutationKind: "created"`.

### `PATCH /v1/nodes/{nodeId}`

Performs **full replacement** of the mutable managed-node binding identified by
the path parameter.

Rules:

- the `nodeId` is not renamable through this surface;
- the request body is a full normalized replacement document, not a merge-patch
  payload;
- omitted optional fields therefore reset to their normalized defaults;
- successful replacement produces a new graph revision and a
  `node.binding.updated` event with `mutationKind: "replaced"`.

This explicit full-replacement rule is preferable to an implicit merge because
it keeps defaulting and reset behavior deterministic.

### `DELETE /v1/nodes/{nodeId}`

Deletes one managed node from the active graph.

Rules:

- an active graph revision must already exist;
- the node must exist as a managed non-user node;
- deletion is **rejected** if any graph edge still references that node;
- successful deletion produces a new graph revision and a
  `node.binding.updated` event with `mutationKind: "deleted"`.

Rejecting edge-connected deletions is deliberate. The host should not silently
rewrite topology by cascading edge removal behind the operator's back.

## 3. Error and validation semantics

This slice preserves the host's distinction between invalid candidates and
conflicting state.

Validation-backed `400` responses:

- malformed request bodies;
- graph-validation failures after mutation candidate assembly.

Structured `409` conflict responses:

- no active graph revision exists;
- the node id already exists on create;
- deletion is blocked by referencing edges.

Structured `404` responses:

- the requested managed node does not exist for get, replace, or delete.

This keeps the API usable from Studio, CLI, and tests without collapsing all
negative outcomes into one generic failure class.

## 4. Graph-source-of-truth preservation

The most important design constraint in this slice was preserving the graph as
the single source of truth.

The implementation now:

- mutates graph nodes only by constructing a new graph candidate;
- validates that full candidate through the existing graph validator;
- applies the resulting graph through the same revision-producing host path
  used by `PUT /v1/graph`;
- derives applied node inspections from the post-apply reconciliation pass.

It does **not**:

- maintain a parallel mutable node-binding store as primary truth;
- let Studio or CLI own node mutation logic locally;
- bypass reconciliation when node resources change.

## 5. Event widening

This slice widened the host event model with:

- `node.binding.updated`

The event carries:

- `graphId`
- `activeRevisionId`
- `nodeId`
- `mutationKind`

This makes node-level control-plane mutations observable without forcing
consumers to infer them indirectly from `graph.revision.applied` alone.

## 6. Quality work in this slice

The post-implementation audit surfaced one real client bug:

- `createNode()` and `replaceNode()` in `packages/host-client` originally
  accepted all error statuses while still trying to parse a node-mutation DTO,
  which would have broken on `409` host conflict bodies.

The fix was to narrow accepted error statuses to `400` only, preserving normal
structured host-error throwing for `404` and `409`.

The same audit also tightened the state semantics so that:

- successful create/replace mutations cannot silently return `node: undefined`;
- duplicate `nodeId` detection covers collisions with user nodes, not only with
  existing managed nodes.

## 7. Verification

This slice was closed only after:

- targeted `types`, `host-client`, and `host` tests passed;
- the host integration tests covered create, replace, delete, conflict, and
  event behavior;
- full `pnpm verify` passed;
- `git diff --check` passed.

## 8. What remains next

This slice does **not** complete host control-plane mutation coverage.

Still remaining after this batch:

- edge resource mutation surfaces;
- runtime restart surface;
- richer reconciliation and restart semantics;
- deeper Studio use of the completed node mutation surface.

## 9. Why this slice matters

Before this batch, node inspection existed but node mutation still depended on
full graph replacement.

After this batch, Entangle has:

- a host-owned managed-node mutation surface;
- typed control-plane events for node-level mutation outcomes;
- a cleaner client boundary for Studio and CLI;
- and a more complete path toward fully resource-oriented host control-plane
  management.
