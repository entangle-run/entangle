# Runtime Artifact Restore Slice

Date: 2026-04-26.

## Superseded Boundary

This Host-mediated same-machine restore surface has been superseded by
`336-host-artifact-restore-promotion-removal-slice.md`. Public Host, CLI, and
Studio surfaces no longer restore artifacts by writing runner-local workspaces;
future restore behavior must be runner-owned protocol behavior.

## Purpose

This slice adds the first safe restore path for git-backed runtime artifacts in
Entangle.

The goal is not broad artifact replay automation yet. The goal is an audited
operator and control-plane surface that can materialize a recorded git artifact
back into a node-local restore workspace without reading runner-local files
directly or overwriting existing work by default.

## Implemented Scope

- Added shared host API contracts for runtime artifact restore requests,
  restore records, and restore responses.
- Added `POST /v1/runtimes/{nodeId}/artifacts/{artifactId}/restore` on the
  host.
- Added `restoreRuntimeArtifact` to the shared host client.
- Added `entangle host runtimes artifact-restore <nodeId> <artifactId>` to the
  CLI with `--restore-id`, `--overwrite`, `--requested-by`, `--reason`, and
  `--summary`.
- Added shared host-client and CLI summary helpers for restore status.
- Persisted restore attempt records under `runtimeRoot/artifact-restores`,
  using the requested restore id as the primary file name.
- Restored git-backed artifact contents into
  `artifactWorkspaceRoot/restores/{restoreId}`.
- Kept restore safe by default: existing restore targets return an
  `unavailable` restore record unless the caller opts into overwrite.
- Used a temporary restore directory and final rename so failed restores do not
  leave a partially published target directory.
- Streamed restored git blobs to disk instead of loading restored file content
  into process memory.

## Boundaries

- Only git-backed artifacts are supported in this slice.
- The restore target is an artifact workspace restore directory, not the live
  source workspace.
- Restore is an explicit operator/host operation; engines do not directly
  mutate restore targets.
- Unsupported artifact backends, unsafe paths, missing local git state, missing
  commits, and existing non-overwrite targets return structured
  `unavailable` restore records instead of widening filesystem access.

## Remaining Work

- Policy-gated restore permissions for node/operator roles.
- Full replay semantics that can promote a restored artifact into a source
  workspace or memory repository through an approval-gated workflow.
- Richer restore-history filtering and audit export.
- Restore/replay behavior for wiki and future non-git artifact backends.
- Backup/restore coordination for wiki repositories and artifact restore
  records.
