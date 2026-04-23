# Applied Node Inspection Slice

This document records the implementation batch that introduced the first
resource-oriented node surface through `entangle-host`.

The goal of this slice was not to implement node mutation yet. The goal was to
make the host's already-persisted applied node bindings inspectable through
stable shared contracts, host routes, the shared client, and the CLI.

## What this slice changed

The system now has:

- typed node-inspection DTOs in `packages/types`;
- host-state helpers that expose applied non-user node inspections;
- `GET /v1/nodes`;
- `GET /v1/nodes/{nodeId}`;
- shared host-client support for node listing and node detail;
- CLI support for `host nodes list` and `host nodes get`;
- tests covering node inspection parsing and host integration behavior.

## 1. Scope of the surface

This first node surface is intentionally scoped to **applied non-user node
bindings**.

That matches the current host materialization model:

- user nodes remain part of the graph;
- non-user nodes are the host-managed runtime-bearing nodes;
- the host already persists effective bindings for those non-user nodes during
  reconciliation.

The new surface therefore exposes what the host actually owns today instead of
pretending node mutation is already complete.

## 2. Shared contracts

`packages/types` now owns:

- `NodeInspectionResponse`
- `NodeListResponse`

Each node inspection currently includes:

- the effective applied node binding; and
- the paired runtime inspection summary.

This keeps the first node surface grounded in control-plane truth instead of a
UI-specific projection.

## 3. Host-state integration

`services/host` now derives node inspections from the same reconciliation pass
that already produces runtime inspections.

That means:

- node inspection stays aligned with current effective binding resolution;
- no shadow node state model was introduced;
- the host does not require a second independent projection pipeline just to
  answer node inspection requests.

## 4. Host boundary

`entangle-host` now exposes:

- `GET /v1/nodes`
- `GET /v1/nodes/{nodeId}`

Missing node ids return the same structured host error surface already used by
other host resources.

This is the first stable node-oriented resource surface that Studio and CLI can
build on later.

## 5. Shared clients

`packages/host-client` now exposes:

- `listNodes()`
- `getNode(nodeId)`

`apps/cli` now exposes:

- `host nodes list`
- `host nodes get <nodeId>`

This keeps the node surface host-first and shared rather than baking direct
HTTP logic into each client.

## 6. Quality work in this slice

The first audit pass exposed two real issues:

- the new types fixture for node inspection used an invalid abbreviated
  `sha256:` content digest;
- the new host integration test used an `expect.stringContaining(...)` matcher
  in a way that tripped strict ESLint typing rules.

Both were corrected before closing the slice.

## 7. Verification

The slice was closed only after:

- targeted `types`, `host-client`, and `host` gates passed;
- full `pnpm verify` passed;
- `git diff --check` passed.

## 8. What remains next

This slice does **not** complete resource-oriented node management.

Still remaining after this batch:

- node mutation surfaces;
- edge resource surfaces;
- runtime restart surfaces;
- richer reconciliation and failure diagnostics;
- Studio usage of the new node surface.

## 9. Why this slice matters

Before this batch, applied node bindings existed only as host-internal desired
state and runtime context inputs.

After this batch, Entangle has:

- a stable node-inspection contract;
- a host-owned node resource surface;
- shared client access for CLI and future Studio use;
- and a cleaner path toward later node mutation without inventing a new read
  model later.
