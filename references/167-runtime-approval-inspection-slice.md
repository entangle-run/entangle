# Runtime Approval Inspection Slice

## Purpose

This slice closes the gap between session-level approval counters and
operator-actionable approval evidence.

Before this slice, host session summaries and `session.updated` events could
show that approval records existed and how many were pending, approved, or
terminal. Operators still had to infer the actual approval ids, approvers,
requester, conversation, and reason from runner-local files or trace events.

## Implemented behavior

- `packages/types` now defines typed host API responses for runtime approval
  lists and item inspection.
- `entangle-host` now exposes:
  - `GET /v1/runtimes/{nodeId}/approvals`
  - `GET /v1/runtimes/{nodeId}/approvals/{approvalId}`
- The host reads persisted runner-local `ApprovalRecord` files from the
  runtime root and validates them through the canonical schema.
- The routes keep the same runtime-context availability behavior used by
  persisted turn and artifact inspection.
- Missing approval ids return a structured `not_found` host error.
- `packages/host-client` now supports the new routes and owns shared
  approval presentation helpers for sorting, filtering, labels, status text,
  and bounded detail lines.
- The CLI now exposes:
  - `host runtimes approvals <nodeId>`
  - `host runtimes approval <nodeId> <approvalId>`
  - `--summary` projection for compact operator output
  - filters for status, session id, conversation id, requesting node, and
    approver node
- Studio now shows a selected-runtime approval panel and can drill into one
  selected approval through the same host-client boundary.

## Boundary decisions

- The host remains read-only for approval records in this slice.
- Approval mutation authority remains inside the runner/runtime boundary until
  a dedicated approval decision protocol is implemented.
- Studio and CLI do not synthesize approval truth; they consume validated host
  responses and shared host-client presentation helpers.
- Session counters remain aggregate diagnostics. The new approval surface is
  the operator drilldown path for concrete records.

## Validation

Coverage was added for:

- typed approval list and inspection response schemas;
- host list, item, and missing-item approval routes;
- host-client route parsing;
- shared approval presentation sorting, filtering, and detail formatting;
- CLI approval summary projection;
- Studio approval inspection helper wiring.

Targeted tests and repository typecheck passed for the touched scope.

## Result

Entangle now has a coherent read-only approval observability chain:

1. runner persists approval records;
2. host exposes validated approval records;
3. session summaries and events expose approval lifecycle counts;
4. CLI and Studio can drill into concrete approval records without reading
   runtime-local files directly.
