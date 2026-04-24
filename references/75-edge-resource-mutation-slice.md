# Edge Resource Mutation Slice

## Summary

Completed the next host control-plane resource slice by adding graph-backed edge
inspection and mutation surfaces through `entangle-host`, the shared
`host-client`, and the CLI.

The implemented surface is:

- `GET /v1/edges`
- `POST /v1/edges`
- `PATCH /v1/edges/{edgeId}`
- `DELETE /v1/edges/{edgeId}`

This slice preserves the same architectural rule already established for
managed nodes:

- the graph remains the single source of truth;
- edge mutations are applied by building a candidate graph revision,
  validating it, and only then applying it;
- clients do not own topology mutation logic;
- invalid graph candidates return validation-backed `400` responses, while
  resource conflicts return explicit `404` or `409` host errors.

## Semantics frozen by this slice

### Resource model

- edges are first-class host resources, but they are still graph-backed;
- there is no parallel edge store outside the active graph revision;
- edge list inspection is intentionally read-only and returns the canonical edge
  objects from the active graph.

### Mutation semantics

- `POST /v1/edges` creates a new edge in the active graph;
- `PATCH /v1/edges/{edgeId}` performs full normalized replacement of the edge
  without renaming `edgeId`;
- `DELETE /v1/edges/{edgeId}` removes the edge from the active graph;
- no mutation performs implicit node creation;
- no mutation performs implicit cascade deletes;
- unknown edge endpoints remain validation failures, not mutation conflicts.

### Conflict versus validation behavior

- missing active graph revision -> `409 conflict`
- duplicate `edgeId` on create -> `409 conflict`
- missing `edgeId` on replace/delete -> `404 not_found`
- structurally invalid request body -> `400 bad_request`
- semantically invalid candidate graph -> `400` with typed validation report

This keeps host semantics aligned with the already established node-mutation
boundary.

## Event surface

This slice also adds a typed control-plane event:

- `edge.updated`

with:

- `graphId`
- `activeRevisionId`
- `edgeId`
- `mutationKind: created | replaced | deleted`

That event is now part of the shared host event contract rather than a
host-local ad hoc payload.

## Validation stance

Edge mutations deliberately reuse full graph validation rather than a
narrow edge-only validator. That is the correct design because an edge mutation
can change:

- graph topology validity;
- relay-route realizability;
- edge endpoint existence;
- effective transport and resource constraints.

The host therefore continues to validate the whole candidate graph before
apply, while the mutation API still exposes resource-oriented conflict
semantics at the HTTP boundary.

## Testing and verification

This slice was closed only after:

- typed contract coverage for the new host event and edge request defaults;
- host-client tests for edge list/mutation responses and conflict formatting;
- host integration tests for:
  - edge creation;
  - edge replacement;
  - edge deletion;
  - invalid edge candidates;
  - event emission;
- full workspace verification through `pnpm verify`;
- diff hygiene through `git diff --check`.

## Outcome

The host control plane now has:

- graph inspection and revision history;
- managed node inspection and mutation;
- edge inspection and mutation;
- runtime inspection and desired-state mutation;
- shared event streaming.

The next best host-control-plane slices are now:

1. runtime restart surface;
2. richer reconciliation and degraded-state semantics;
3. deeper host event widening into session and runner activity.
