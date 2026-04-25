# Session Event Approval Status Counts Slice

## Purpose

Keep runtime trace events aligned with the widened host session read model.

After session inspection started exposing `approvalStatusCounts`, the
`session.updated` trace event still carried only conversation lifecycle counts.
That meant the selected-runtime trace could lose approval-state context that
was visible in the session detail panel.

## Implemented Behavior

`session.updated` host events now include optional `approvalStatusCounts`.

During host activity synchronization, `entangle-host` now:

- groups runner-local `ApprovalRecord` files by `sessionId`;
- derives approval lifecycle counts for each session event;
- includes those counts in the session observation fingerprint;
- emits a new `session.updated` event when approval lifecycle counts change,
  even if the `SessionRecord` itself did not otherwise change.

This keeps approval trace events and session trace events complementary:

- `approval.trace.event` records the approval item lifecycle;
- `session.updated` records the session-level approval status aggregate.

## Client Presentation

Shared runtime-trace presentation in `packages/host-client` now renders:

- recorded approval count;
- approval lifecycle status summary.

Studio consumes that shared presentation through the existing runtime trace
helper boundary, so the visual trace panel stays aligned with CLI and
host-client output.

## Boundary Decisions

- The host still derives read-only events from runner-owned state.
- The event contract carries bounded counts, not approval details or decision
  authority.
- Approval lifecycle mutation remains a future explicit approval workflow
  concern.

## Tests

Coverage now asserts:

- the typed `session.updated` event accepts approval status counts;
- host event synchronization emits approval counts and updates the session
  event when approval status changes;
- shared runtime-trace presentation includes approval status detail lines;
- Studio's runtime trace helper exposes the same detail lines.

## Result

Runtime trace inspection now preserves the same approval-state signal as the
session read model, closing another operator-observability mismatch without
widening mutation authority.
