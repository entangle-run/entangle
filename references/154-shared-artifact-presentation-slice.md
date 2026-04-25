# Shared Artifact Presentation Slice

## Purpose

Keep visual and headless runtime-artifact inspection aligned over the same
host-client presentation boundary.

Before this slice, Studio owned local helper functions for artifact labels,
status strings, locator summaries, and detail lines. The CLI had local
sorting and filtering helpers and could inspect host-backed artifact records,
but compact operator-oriented output was still unavailable.

## Implemented behavior

- Added shared runtime-artifact presentation helpers to `packages/host-client`.
- Studio now reuses those helpers through a thin local re-export.
- CLI artifact sorting and filtering now reuse the shared host-client helper
  boundary while preserving the existing command-facing names.
- Added compact artifact summary projection for the CLI.
- Added `--summary` to:
  - `entangle host runtimes artifact <nodeId> <artifactId>`
  - `entangle host runtimes artifacts <nodeId>`

## Boundary decisions

The host API remains unchanged. The new behavior is presentation-only and sits
above the existing host-backed runtime-artifact read surface.

The shared helper formats normalized `ArtifactRecord` values. It does not
create a client-owned artifact model, and it does not move artifact truth out
of the runner-owned persisted record surfaced through `entangle-host`.

Filtering remains local to the client side for now. The host continues to
serve canonical runtime artifact records, while operator surfaces can apply
deterministic local filters over backend, artifact kind, lifecycle,
publication, and retrieval state.

## Verification

- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/studio test`

## Result

Headless and visual operators now see the same artifact label, lifecycle,
publication, retrieval, locator, and detail-line vocabulary. The CLI can emit
compact artifact summaries for scripting and quick inspection without
requiring operators to hand-parse full artifact records.
