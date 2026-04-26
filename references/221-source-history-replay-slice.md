# Source History Replay Slice

Date: 2026-04-26.

## Purpose

This slice adds the first direct source-history replay path for Entangle.

Before this slice, an operator could apply a source-change candidate into
source history, publish that source history as a git artifact, restore the
artifact, and then promote the restore into the source workspace. That path is
correct but too indirect for the common local repair/replay workflow.

The new path lets the host replay an existing source-history entry directly
into the node source workspace while preserving the same policy boundary:
source-history replay is still a source application operation, not an engine
side effect.

## Implemented Scope

- Added shared host API contracts for source-history replay requests, replay
  records, replay responses, and replay history lists.
- Added `POST /v1/runtimes/{nodeId}/source-history/{sourceHistoryId}/replay`.
- Added `GET /v1/runtimes/{nodeId}/source-history-replays`.
- Added
  `GET /v1/runtimes/{nodeId}/source-history/{sourceHistoryId}/replays`.
- Added `replayRuntimeSourceHistory`,
  `listRuntimeSourceHistoryReplays`, and
  `listRuntimeSourceHistoryReplaysForEntry` to the shared host client.
- Added CLI commands:
  - `entangle host runtimes source-history-replay <nodeId> <sourceHistoryId>`;
  - `entangle host runtimes source-history-replays <nodeId>`.
- Added Studio replay controls and recent replay-attempt presentation in
  selected source-history detail.
- Added `source_history.replayed` host events and runtime trace presentation.
- Persisted replay attempts under `runtimeRoot/source-history-replays`.

## Safety Model

- Replay requires an approved `source_application` approval when the runtime
  source mutation policy requires source application approval.
- The approval resource is `source_history:{sourceHistoryId}`.
- Replay writes to the source workspace only when the current workspace tree
  equals the source-history `baseTree`.
- If the workspace already equals the source-history `headTree`, the replay is
  recorded as `already_in_workspace` without rewriting files.
- If the workspace has diverged from both `baseTree` and `headTree`, the replay
  is recorded as `unavailable` instead of overwriting user work.
- Replay never grants publish rights and never bypasses source-history
  publication policy.

## Boundaries

- This is not a merge engine. Diverged workspaces require a future explicit
  merge/reconcile workflow.
- This does not replace artifact restore/promotion; artifact workflows remain
  the generic artifact handoff path.
- This does not yet replay wiki repositories.
- Studio currently triggers replay with operator attribution, while exact
  approval-id entry remains available through CLI and host-client surfaces.

## Remaining Work

- Wiki restore/promotion behavior.
- Explicit merge/reconcile flow for diverged source workspaces.
- Richer Studio guidance for creating the exact scoped approval.
- Fallback/replication behavior across publication targets.

## Verification

Targeted verification passed:

```bash
pnpm --filter @entangle/types test -- --runInBand
pnpm --filter @entangle/host-client test -- --runInBand
pnpm --filter @entangle/cli test -- --runInBand
pnpm --filter @entangle/studio test -- --runInBand
pnpm --filter @entangle/host test -- --runInBand
```
