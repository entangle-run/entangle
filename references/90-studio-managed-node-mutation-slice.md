# Studio Managed Node Mutation Slice

## Summary

Completed the next bounded Studio mutation slice by exposing host-owned
managed-node mutation flows on top of the already implemented
`entangle-host` managed-node resource surface.

Studio now supports:

- selecting managed nodes directly from the runtime chip grid, the live graph,
  or a dedicated managed-node list;
- creating a managed node through `POST /v1/nodes`;
- replacing a managed node through `PATCH /v1/nodes/{nodeId}`;
- deleting a managed node through `DELETE /v1/nodes/{nodeId}`.

This closes the second real topology-mutation loop in Studio without adding
client-owned graph mutation logic.

## Design decisions frozen in this slice

### Studio remains host-driven for node mutation

Studio assembles bounded request documents and delegates all canonical work to
the host:

- full candidate graph assembly;
- full graph validation;
- revision apply;
- reconciliation;
- typed event emission.

Studio does not attempt to locally validate managed-node graph consequences
beyond obvious input completeness.

### Node editing is intentionally bounded

This slice exposes only the managed-node fields that carry immediate operator
value:

- `nodeId` on create;
- `displayName`;
- `nodeKind`;
- `packageSourceRef`.

It does **not** expose the full node-binding surface yet.

Instead:

- create uses safe defaults for `resourceBindings` and `autonomy`;
- replace preserves the existing hidden `resourceBindings` and `autonomy`
  values already stored in the graph.

That avoids silently resetting operational bindings while still making Studio a
real mutation surface.

### Package-source selection is host-backed

Studio now reads admitted package sources from the host so that node creation
and replacement do not rely on free-form package ids.

This keeps package binding aligned with the canonical host-owned package-source
inventory.

## Implemented changes

### Pure helper module for managed-node editing

Added a dedicated helper module for:

- deterministic managed-node sorting;
- deterministic package-source sorting and option formatting;
- draft creation and hydration;
- create/replace request building while preserving hidden bindings;
- concise list formatting.

### Managed-node editor

Studio now exposes a `Managed Node Editor` with:

- create mode;
- replace mode for the selected node;
- delete for the selected node;
- deterministic reset to a fresh draft.

### Selection alignment

Explicit managed-node selection now keeps Studio internally coherent:

- selecting a runtime chip also selects the corresponding managed node;
- clicking a managed node in the graph selects it for mutation;
- the editor and runtime inspector stay aligned for explicit node selection.

### Package-source read widening

The Studio overview path now also reads the admitted package-source surface.

This remains partial-failure-aware:

- host status, graph inspection, and runtime list still define overview
  liveness;
- package-source load failure degrades only the managed-node editor, not the
  entire Studio surface.

## Verification

This slice was closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests, including the new pure managed-node
  helper tests;
- full `pnpm verify`;
- `git diff --check`.

## Outcome

Studio now supports bounded graph mutation for both:

- edges; and
- managed nodes.

The next best Studio mutation slice is now:

1. bounded package-source admission;
2. only then, deeper session drilldown or more specialized operator surfaces.
