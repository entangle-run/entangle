# Studio Graph Edge Mutation Slice

## Summary

Completed the first bounded graph-mutation slice in Studio by exposing
host-owned edge mutation flows on top of the already implemented
`entangle-host` edge resource surface.

Studio now supports:

- selecting graph edges directly from the live topology or the edge list;
- creating a new edge through the host `POST /v1/edges` boundary;
- replacing an existing edge through `PATCH /v1/edges/{edgeId}`;
- deleting an existing edge through `DELETE /v1/edges/{edgeId}`.

This closes the first real topology-mutation loop in Studio without letting the
frontend become a second source of truth.

## Design decisions frozen in this slice

### Studio remains a client of the host

Studio does not validate or apply graph candidates locally.

It only:

- assembles bounded request documents;
- sends them through `packages/host-client`;
- surfaces host validation failures and host conflicts;
- refreshes canonical graph/runtime inspection after successful mutation.

The host remains solely responsible for:

- candidate graph assembly;
- full graph validation;
- revision apply;
- reconciliation;
- event emission.

### Edge editing is intentionally bounded

This slice exposes only the topological and operational fields that give clear
operator value immediately:

- `edgeId` on create;
- `fromNodeId`;
- `toNodeId`;
- `relation`;
- `enabled`.

It deliberately does **not** expose free-form transport editing yet.

Instead:

- create uses the canonical default transport profile;
- replace preserves the current edge transport data already stored in the graph.

This avoids a half-designed transport editor that would encourage accidental
policy destruction.

### Validation errors remain host-authored

When the host returns a validation-backed `400`, Studio surfaces the summarized
validation report instead of inventing its own speculative pre-validation.

This keeps error semantics consistent across:

- Studio;
- CLI; and
- any other future client.

## Implemented changes

### Pure helper module for edge editing

Added dedicated Studio helpers for:

- deterministic edge sorting;
- edge list formatting;
- draft creation from the current graph;
- draft hydration from an existing edge;
- request building for create/replace;
- validation-report summarization.

This keeps `App.tsx` from accumulating host-shaped mutation logic inline.

### Live graph edge selection

Studio can now select an edge from:

- the rendered React Flow topology; or
- the explicit graph-edge list below the canvas.

The selected edge becomes the canonical source for the current edge editor
draft.

### Bounded edge editor

Studio now exposes an `Edge Editor` surface with:

- create mode;
- replace mode for the selected edge;
- delete for the selected edge;
- deterministic reset to a new-edge draft.

### Mutation refresh behavior

After a successful edge mutation, Studio refreshes the host-backed overview so
that:

- graph topology;
- runtime list; and
- active revision metadata

all remain canonical.

## Verification

This slice was closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests, including the new pure edge-mutation
  helper tests;
- full `pnpm verify`;
- `git diff --check`.

## Outcome

Studio is no longer read-only on graph structure.

It now performs one bounded but real class of topology mutation through the
same host-owned control-plane boundary used by CLI and tests.

The next best Studio mutation slices are now:

1. bounded managed-node mutation;
2. bounded package-source admission;
3. only then, any deeper graph-transport editing where the current design
   corpus actually justifies it.
