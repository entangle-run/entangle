# Artifact Promotion Slice

Date: 2026-04-26.

## Purpose

This slice adds the first approval-gated promotion path from a restored runtime
artifact into a node source workspace.

Safe restore already materialized git-backed artifacts into
`artifactWorkspaceRoot/restores/{restoreId}`. This slice adds the next bounded
step: an operator can promote a specific successful restore into the source
workspace only with an approved, operation/resource-scoped approval.

## Implemented Scope

- Added shared host API contracts for artifact promotion requests, records, and
  responses.
- Added `POST /v1/runtimes/{nodeId}/artifacts/{artifactId}/promote`.
- Added `promoteRuntimeArtifact` to the shared host client.
- Added `entangle host runtimes artifact-promote <nodeId> <artifactId>` to the
  CLI with `--restore-id`, `--approval-id`, `--overwrite`, `--promoted-by`,
  `--promotion-id`, `--reason`, and `--summary`.
- Required an approved `source_application` approval scoped to resource
  `artifact:{artifactId}|{restoreId}` before promotion can write into the
  source workspace.
- Persisted promotion attempts under `runtimeRoot/artifact-promotions`.
- Copied only files from an existing successful restore workspace into the
  node source workspace, preserving source workspace root boundaries.
- Rejected symlinks, non-file restore entries, unsafe relative paths, missing
  source workspaces, and existing target files unless overwrite is explicitly
  requested.

## Boundaries

- This is a source-workspace promotion path, not a full replay engine.
- Promotion does not create source-history commits by itself. The source
  workspace mutation remains visible to later source-change harvesting.
- Promotion does not target wiki repositories yet.
- Promotion is not automatic and does not bypass approvals.
- Studio does not yet expose promotion controls.

## Remaining Work

- Studio promotion controls and promotion-history inspection.
- Wiki restore/promotion behavior.
- Replay/promotion flows that create source-history entries directly when the
  policy model calls for that.
- Richer operator guidance for creating the exact scoped approval.
