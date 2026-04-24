# Package Source Deletion Slice

## Status

Implemented.

## Context

The host API specification already included
`DELETE /v1/package-sources/{packageSourceId}` so operators could remove
unused package sources. The implementation could admit and inspect package
sources, including `local_path` and `local_archive`, but it could not retire a
source from desired host state. That left package-source lifecycle management
one-way.

## Decision

`entangle-host` now exposes a typed package-source deletion boundary.

Deletion is intentionally conservative:

- missing package sources return a typed `not_found` host error;
- package sources referenced by nodes in the active graph return a typed
  `conflict` host error with the referencing node ids;
- successful deletion removes the desired package-source record;
- successful deletion removes host-managed imported archive storage for
  `local_archive` sources;
- immutable package-store objects are not deleted because they may be shared by
  other admitted sources with the same content digest;
- successful deletion emits a `package_source.deleted` control-plane event.

## Surfaces

Implemented surfaces:

- host route: `DELETE /v1/package-sources/{packageSourceId}`;
- shared host client: `deletePackageSource(packageSourceId)`;
- CLI: `entangle host package-sources delete <packageSourceId>`;
- CLI dry run:
  `entangle host package-sources delete <packageSourceId> --dry-run`;
- Studio live refresh recognizes `package_source.deleted` as an overview
  refresh event.

## Test Coverage

The slice adds coverage for:

- successful host deletion of an unused package source;
- persisted deletion visibility through subsequent package-source inspection;
- `package_source.deleted` event emission;
- conflict when an active graph node still references the package source;
- shared host-client DELETE request construction and response parsing;
- Studio overview refresh classification for package-source deletion events.

## Follow-Up

Future retention work can add package-store reference counting, operator
garbage-collection commands, archive provenance metadata, and Studio deletion
controls. Those should build on this host-owned deletion boundary rather than
inventing client-owned package state.
