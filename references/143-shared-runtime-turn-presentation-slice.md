# Shared Runtime Turn Presentation Slice

## Purpose

Keep visual and headless runtime-turn inspection aligned over the same
host-client presentation boundary.

Before this slice, Studio had local helper functions for persisted runner-turn
labels, status strings, artifact summaries, and detail lines. The CLI could
inspect the same host-backed turn records, but only as raw JSON. That created
unnecessary drift risk between the operator surfaces.

## Implemented behavior

- Added shared runtime-turn presentation helpers to `packages/host-client`.
- Studio now reuses those helpers through a thin local re-export.
- Added CLI runtime-turn summary projection.
- Added `--summary` to:
  - `entangle host runtimes turn <nodeId> <turnId>`
  - `entangle host runtimes turns <nodeId>`
- List summary output sorts turns by most recent update first, matching the
  Studio presentation order.

## Boundary decisions

The host API remains unchanged. The new behavior is presentation-only and sits
above the existing host-backed persisted runner-turn read surface.

The shared helper formats normalized runner-turn records. It does not create a
new CLI-only DTO, and it does not move runtime truth into Studio or the CLI.

## Verification

- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/cli test`
