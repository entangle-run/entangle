# Immutable Package Store Refinement

This document records the refinement that replaced per-node package copies with
an immutable host-managed package store plus workspace-facing package surfaces.

The goal is to make package materialization consistent with the rest of
Entangle's control-plane design:

- immutable inputs;
- mutable node state separated cleanly;
- reproducible runtime workspaces;
- lower duplication across active nodes.

## Why the previous approach was not final-form

The repository had already moved away from linking a node workspace directly to
an arbitrary admitted source path outside host state.

That was good, but the replacement still copied package contents into each
node's `workspace/package/` directory.

That approach has real costs:

- duplicated storage for every active node using the same package;
- weaker recovery semantics because the workspace copy becomes a quasi-source of
  truth;
- less disciplined separation between immutable package content and mutable node
  state;
- more expensive runtime materialization work during reconciliation.

## Final recommendation

Entangle should treat admitted package contents as immutable host-managed store
objects and expose those contents into a node workspace through a host-managed
package surface.

For the current local profile, that means:

- hash admitted package contents deterministically;
- materialize them once into a package store under `.entangle/host/imports`;
- persist that materialization on the package-source record;
- expose the package into `workspaces/<node_id>/package/` as a host-managed
  link to the immutable store object.

## Current implementation

The host now:

- computes a deterministic SHA-256 digest of admitted local package contents;
- materializes package contents into an immutable store object under
  `.entangle/host/imports/packages/store/<content-address>/package/`;
- records the materialization metadata on `PackageSourceRecord`;
- resolves manifests and runtime package roots from the materialized store;
- exposes the package inside the node workspace as a host-managed package
  surface backed by that immutable store object.

## Why this is better

This refinement improves several properties at once:

- **deduplication**: multiple nodes can reuse the same package content without
  each owning a private full copy;
- **recovery**: host-managed immutable package objects survive independently of
  ephemeral workspace state;
- **clarity**: immutable package content and mutable node state are no longer
  blurred together;
- **backend portability**: runtime backends now reason about one stable package
  object plus one node workspace, instead of assuming package copies inside each
  workspace.

## Relationship to package sources

The package-source record still preserves package origin information, such as a
`local_path`.

But the canonical runtime package root is now the host-managed materialization,
not the original external path.

This is the correct split:

- origin metadata explains where the package came from;
- immutable store metadata explains what exact content was admitted;
- runtime workspace surfaces explain how one node consumes that content.
