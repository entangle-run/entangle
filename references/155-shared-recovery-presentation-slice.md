# Shared Recovery Presentation Slice

## Purpose

Keep Studio and headless recovery inspection aligned over the same host-client
presentation boundary.

Before this slice, Studio owned local helper functions for recovery policy
descriptions, recovery-controller descriptions, recovery event labels, and
recovery event filtering. The CLI could inspect host-backed recovery state,
but only as raw JSON.

## Implemented behavior

- Added shared runtime-recovery presentation helpers to `packages/host-client`.
- Studio now reuses those helpers for display and event filtering while keeping
  recovery-policy draft/edit logic local to Studio.
- Added recovery-history record label and detail-line helpers for compact
  operator output.
- Added CLI recovery summary projection.
- Added `--summary` to:
  - `entangle host runtimes recovery <nodeId>`

## Boundary decisions

The host API remains unchanged. The new behavior is presentation-only and sits
above the existing host-backed runtime-recovery read surface.

The shared helper formats normalized recovery DTOs and recovery host events.
It does not infer recovery state locally, and it does not move retry,
controller, or policy authority out of `entangle-host`.

Studio-specific recovery-policy draft validation remains in Studio because it
models editable form state rather than shared host DTO presentation.

## Verification

- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/studio test`

## Result

Visual and headless operators now share the same recovery vocabulary for
policy, controller, event labels, history labels, and history details. The CLI
can emit compact recovery summaries without requiring operators to hand-parse
the full recovery inspection payload.
