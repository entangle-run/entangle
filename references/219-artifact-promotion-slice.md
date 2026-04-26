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
- Added persisted promotion-history inspection through
  `GET /v1/runtimes/{nodeId}/artifact-promotions`,
  `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/promotions`, shared
  host-client methods, and `entangle host runtimes artifact-promotions`.
- Added Studio promotion controls in selected artifact detail. Studio selects
  the latest restored artifact workspace, requires an explicit approval id,
  keeps overwrite disabled by default, and posts through the shared host client.
- Added Studio promotion-history presentation in selected artifact detail so
  operators can inspect recent promotion attempts next to restore history.
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

## Remaining Work

- Wiki restore/promotion behavior.
- Direct source-history replay is covered separately in
  `references/221-source-history-replay-slice.md`; future merge/reconcile
  replay behavior remains open.
- Richer operator guidance for creating the exact scoped approval.

## Verification

Targeted and workspace verification passed:

```bash
pnpm --filter @entangle/host-client test -- --runInBand
pnpm --filter @entangle/host test -- --runInBand
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli test -- --runInBand
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio test -- --runInBand
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio build
CI=1 TURBO_DAEMON=false pnpm verify
```
