# Graph Revision History Inspection Slice

This document records the implementation batch that promoted persisted graph
revisions from a host-internal file detail into a first canonical inspection
surface.

The goal of this slice was not to complete all control-plane mutation APIs.
The goal was to make graph revision history inspectable through the host
boundary, shared client, and CLI without requiring direct filesystem reads.

## What this slice changed

The host now owns:

- typed graph-revision DTO contracts in `packages/types`;
- canonical persistence of active-revision metadata and typed revision records;
- backward-compatible reading of older raw graph-snapshot revision files;
- HTTP revision-history listing through `GET /v1/graph/revisions`;
- HTTP revision inspection through `GET /v1/graph/revisions/{revisionId}`;
- shared host-client support for listing and fetching revision history;
- CLI support for revision listing and inspection;
- tests that cover revision apply, listing, inspection, and missing-revision
  failure semantics.

## 1. Typed revision contracts

The canonical machine-readable graph-revision contracts now include:

- `ActiveGraphRevisionRecord`
- `GraphRevisionRecord`
- `GraphRevisionMetadata`
- `GraphRevisionInspectionResponse`
- `GraphRevisionListResponse`

These contracts are owned by `packages/types`, not by `services/host`.

This removes the previous ad hoc local shape for active revision metadata and
aligns persisted graph-history inspection with the rest of the host DTO model.

## 2. Host-state integration

The host now persists graph revisions as typed records under the desired graph
revision root instead of writing only the raw `GraphSpec` snapshot.

New writes now include:

- `revisionId`
- `appliedAt`
- the full `graph`

The active graph pointer is now also persisted through a canonical typed record
instead of a host-local untyped JSON blob.

## 3. Backward compatibility

This slice had to preserve older Entangle state already written by earlier host
versions.

The host now supports two persisted revision-file forms when reading history:

- the new typed `GraphRevisionRecord` form;
- older raw `GraphSpec` snapshots.

When reading a legacy snapshot, the host synthesizes inspection metadata from:

- the active revision record when the inspected revision is current; or
- the file modification time when the revision is historical but lacks explicit
  `appliedAt` metadata.

This keeps local host state readable across the storage-contract transition
without freezing the host on an older persistence shape.

## 4. Host boundary

`entangle-host` now exposes:

- `GET /v1/graph/revisions`
- `GET /v1/graph/revisions/{revisionId}`

The list route returns typed metadata ordered by newest `appliedAt` first, then
`revisionId`.

The inspection route returns:

- the persisted graph snapshot;
- typed revision metadata;
- whether the revision is currently active.

Missing revision ids return the same structured host error surface already used
elsewhere instead of a raw file-level failure.

## 5. Shared clients

`packages/host-client` now exposes:

- `listGraphRevisions()`
- `getGraphRevision(revisionId)`

`apps/cli` now exposes:

- `host graph revisions list`
- `host graph revisions get <revisionId>`

This keeps graph-history inspection shared across terminal and future Studio
surfaces instead of creating one-off direct host calls in each client.

## 6. Quality work in this slice

The first pass of this slice surfaced two real issues during audit:

- host integration tests around revision parsing were not explicit enough for
  the repository's strict ESLint rules;
- the host still had one stale direct JSON parse path for active graph revision
  metadata.

Both were corrected before closing the slice:

- integration tests now parse response bodies through `unknown` before shared
  schema validation;
- host-state readers now consistently use the typed active-revision helper.

## 7. Verification

The slice was closed only after:

- targeted `types`, `host-client`, and `host` tests passed;
- `pnpm verify` passed;
- `git diff --check` passed.

## 8. What remains next

This slice does not complete host-side graph mutation or full control-plane
coverage.

Still remaining after this batch:

- node resource mutation surfaces;
- edge resource mutation surfaces;
- richer reconciliation diagnostics and restart policies;
- deeper Studio consumption of revision and runtime state.

## 9. Why this slice matters

Before this batch, graph revision history existed on disk but not as a stable
product surface.

After this batch, Entangle has:

- typed graph-revision persistence;
- backward-compatible history inspection;
- stable host routes for revision listing and detail;
- shared client access for CLI and future Studio use;
- and a cleaner control-plane boundary that no longer requires filesystem
  inspection to understand graph history.
