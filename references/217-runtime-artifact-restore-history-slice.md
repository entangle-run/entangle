# Runtime Artifact Restore History Slice

Date: 2026-04-26.

## Superseded Boundary

This Host-mediated restore history surface has been superseded by
`336-host-artifact-restore-promotion-removal-slice.md`. Public Host APIs no
longer expose restore history records created from Host workspace mutations.

## Purpose

This slice closes the first audit-read surface for runtime artifact restore
attempts in Entangle.

Restore is intentionally modeled as an auditable operation, not only as a
latest action response. Operators need to inspect successful and unavailable
restore attempts after the original request has completed, including retries
that reused the same requested restore id.

## Implemented Scope

- Added `RuntimeArtifactRestoreListResponse` to the shared host API
  contracts.
- Added `GET /v1/runtimes/{nodeId}/artifact-restores` for node-wide restore
  history.
- Added `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/restores` for
  artifact-scoped restore history.
- Added shared host-client methods for both restore-history routes.
- Added `entangle host runtimes artifact-restores <nodeId>` to the CLI with
  optional `--artifact-id` filtering and `--summary` projection.
- Added CLI summary projection for persisted restore records.
- Added Studio selected-artifact restore-history loading and display in the
  artifact restore panel.
- Changed restore-record persistence so repeated attempts with the same
  requested `restoreId` allocate distinct audit-record files instead of
  overwriting the previous attempt.

## Boundaries

- Restore history is read-only in this slice.
- The history records describe restore attempts into artifact restore
  directories. They do not yet provide approval-gated replay or promotion into
  source or wiki workspaces.
- Studio intentionally shows only a compact recent-attempt list in the
  selected-artifact panel. Richer filtering, export, and node-wide history
  panels remain later UX work.
- Restore history remains local runtime state and is covered by general local
  backup. Dedicated cross-node or remote publication of restore audit records
  is later work.

## Remaining Work

- Policy-gated restore permissions for node/operator roles.
- Approval-gated replay or promotion from restored artifacts into source,
  wiki, or future artifact backends.
- Richer Studio restore-history filters and node-wide restore audit panels.
- Backup/restore and publication semantics specifically for wiki repositories
  and restore audit records.
