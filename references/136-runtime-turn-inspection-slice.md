# Runtime Turn Inspection Slice

## Purpose

Expose persisted runner turns as host-owned runtime resources.

Before this slice, `runner.turn.updated` events exposed bounded turn summaries
through the host event stream, but operators and automation did not have a
direct list/detail route for the underlying `RunnerTurnRecord` objects. That
made deeper audit workflows depend on event history or direct runner-state file
inspection.

## Implemented behavior

- Added shared runtime turn DTOs:
  - `RuntimeTurnListResponse`
  - `RuntimeTurnInspectionResponse`
- Added host routes:
  - `GET /v1/runtimes/{nodeId}/turns`
  - `GET /v1/runtimes/{nodeId}/turns/{turnId}`
- Runtime turn reads use the same runtime-context realizability checks as
  artifact reads.
- Missing runtimes return structured `404 not_found` responses.
- Unrealizable runtime contexts return structured `409 conflict` responses.
- Missing turn ids return structured `404 not_found` responses.
- Added shared host-client methods:
  - `listRuntimeTurns(nodeId)`
  - `getRuntimeTurn(nodeId, turnId)`
- Added CLI commands:
  - `entangle host runtimes turns <nodeId>`
  - `entangle host runtimes turn <nodeId> <turnId>`

## Design notes

Events remain the live trace surface. Runtime turn routes are the durable
inspection surface for workflows that need the current persisted turn records
directly, including engine outcome, artifact linkage, trigger kind, phase, and
memory synthesis outcome.

The host still owns the boundary. Clients do not read runner-local files or
reconstruct turn state from event payloads.

## Verification

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/cli typecheck`

