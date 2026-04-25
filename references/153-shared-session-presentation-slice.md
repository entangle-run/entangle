# Shared Session Presentation Slice

## Purpose

Keep visual and headless session inspection aligned over the same host-client
presentation boundary.

Before this slice, Studio owned local helper functions for session labels,
active-work detail strings, per-node session drilldown, and trace id
collection. The CLI could inspect the same host-backed session records, but
only as raw JSON. That created avoidable drift after active-work fields became
first-class on `HostSessionSummary`.

## Implemented behavior

- Added shared host-session presentation helpers to `packages/host-client`.
- Studio now reuses those helpers through a thin local re-export.
- Added CLI session summary projection helpers.
- Added `--summary` to:
  - `entangle host sessions list`
  - `entangle host sessions get <sessionId>`
- List summary output sorts sessions by most recent update first, matching the
  host and Studio presentation order.

## Boundary decisions

The host API remains unchanged. The new behavior is presentation-only and sits
above the existing host-backed session read surface.

The shared helper formats normalized host session DTOs. It does not create
client-owned session state, and it does not move lifecycle authority into
Studio or the CLI.

## Verification

- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/studio test`

## Result

Headless operators can now ask for compact session summaries that expose
active conversations, pending approvals, root artifacts, node status, trace
ids, and latest message type without hand-parsing the full host JSON payload.
