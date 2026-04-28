# External Session Cancellation Slice

Date: 2026-04-26.

## Superseded Delivery Boundary

The public cancellation API and runner cancellation semantics from this slice
remain valid, but the primary delivery path has been superseded by
`337-federated-session-cancellation-control-slice.md`. Host now publishes a
signed `runtime.session.cancel` control command to accepted federated
assignments when available; Host-written `runtimeRoot/session-cancellations`
records are fallback compatibility only.

## Purpose

This slice closes the first Entangle external cancellation bridge for
agentic node turns.

Cancellation is modeled as a host-written runtime intent, not as an ad hoc
process signal. The host persists a node-scoped cancellation record, the runner
observes it through the shared runtime state, and active engine work receives a
standard abort signal.

## Implementation

- Added runtime-local `SessionCancellationRequestRecord` contracts and host API
  request/response DTOs.
- Added `POST /v1/sessions/{sessionId}/cancel` for persisted aggregate
  sessions.
- Added `POST /v1/runtimes/{nodeId}/sessions/{sessionId}/cancel` for
  runtime-bound cancellation, including queued sessions that have not yet been
  materialized by the runner.
- Added shared host-client `cancelSession` and `cancelRuntimeSession` methods.
- Added `entangle host sessions cancel` with optional node targeting and compact
  summary output.
- Added Studio selected-session cancellation controls that derive cancellable
  node ids from host-backed session inspection and request aggregate
  cancellation through the shared host client.
- Added Studio event-refresh handling for `session.cancellation.requested` so
  cancellation requests initiated by CLI or other host clients refresh overview
  and selected-runtime state through the normal event stream path.
- Extended the generic agent engine boundary with optional `AbortSignal`
  propagation.
- Added a `cancelled` engine stop reason, cancellation failure classification,
  and runner `cancelled` phase.
- Added runner polling for runtime-local cancellation requests while the service
  is idle and while a turn is active.
- Added OpenCode adapter cancellation handling that terminates the child process
  with `SIGTERM` and returns classified cancellation evidence.

## Runtime Semantics

The host writes cancellation requests under:

```text
{runtimeRoot}/session-cancellations/{cancellationId}.json
```

The runner observes `requested` records for its own node id. For an idle or
approval-waiting session it withdraws pending approvals, expires open
conversations, clears active/waiting ids, transitions the session to
`cancelled`, and marks the request `observed`.

For an active turn, the runner aborts the active engine controller. The
OpenCode adapter kills the active process, the runner records the turn with
`phase: "cancelled"` and `engineOutcome.stopReason: "cancelled"`, and the
session transitions to `cancelled`.

Studio uses the same host boundary as the CLI. The selected-session detail view
shows the non-terminal nodes that can still be cancelled and posts an aggregate
session cancellation request scoped to those node ids.

## Boundaries

This is intentionally not an OpenCode-specific control plane. OpenCode is only
the first adapter to honor the generic engine abort signal. Future attached
server or other engine adapters should consume the same cancellation option.

The slice does not implement post-approval engine resumption, live OpenCode
permission approval mapping, or richer live engine lifecycle controls. Those
remain separate L3 tasks.

## Verification

Targeted verification passed:

```bash
pnpm --filter @entangle/types test -- --runInBand
pnpm --filter @entangle/runner test -- --runInBand
pnpm --filter @entangle/host-client test -- --runInBand
pnpm --filter @entangle/host test -- --runInBand
pnpm --filter @entangle/studio test -- --runInBand
pnpm --filter @entangle/agent-engine typecheck
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio build
CI=1 TURBO_DAEMON=false pnpm verify
```
