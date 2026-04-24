# Studio Runtime Artifact Inspection Slice

## Goal

Deepen the selected-runtime surface in Studio by exposing the host-owned runtime
artifact read model, rather than limiting the operator to live trace events
only.

Before this slice, Studio already had:

- recovery inspection;
- broader selected-runtime trace inspection; and
- bounded runtime lifecycle mutations.

What it still lacked was direct visibility into the persisted artifact records
already exposed by `GET /v1/runtimes/{nodeId}/artifacts`.

## Decisions frozen in this slice

### Artifact inspection stays host-backed

Studio does not infer artifact state from live events alone.

It reads persisted artifact records through the existing host surface and uses
live trace only as a signal to refresh the selected-runtime detail view when a
new artifact trace event arrives for the selected node.

### Selected-runtime refresh should degrade partially, not catastrophically

The selected-runtime detail refresh now reads:

- host status;
- runtime list;
- recovery inspection; and
- runtime artifact inspection

through one coordinated path.

The implementation now tolerates partial failure by updating the surfaces that
did succeed and surfacing panel-specific errors for the parts that failed,
instead of dropping the whole selected-runtime panel on a single artifact-read
failure.

### Artifact presentation remains deterministic

Studio formats artifacts through small pure helpers for:

- stable reverse-chronological ordering;
- concise label generation from backend and artifact kind;
- lifecycle/publication/retrieval state summaries; and
- backend-specific locator summaries.

This keeps artifact presentation explicit and testable.

## Implemented changes

### Studio artifact helpers

Added a dedicated artifact-inspection helper module for sorting and formatting
runtime artifact records.

### Selected-runtime detail widening

The selected-runtime panel now includes a `Runtime Artifacts` section showing:

- artifact id, backend, and kind;
- last update time;
- lifecycle/publication/retrieval state summary; and
- locator summary.

### Refresh-path hardening

The selected-runtime refresh path now uses partial-failure handling so a failed
artifact or recovery read does not prevent Studio from updating host status and
runtime inspection when those succeed.

## Verification

The slice closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests;
- full `pnpm verify`;
- `git diff --check`.

## Result

Studio now exposes both:

- the live trace of what a runtime is doing; and
- the persisted artifact records representing what that runtime has actually
  produced.

The next best Studio slice is now narrower:

- session inspection on top of the host-owned session read model; or
- bounded package/graph mutation flows on top of the already implemented host
  mutation surfaces.
