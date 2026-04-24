# Studio Runtime Session Inspection Slice

## Goal

Expose the host-owned session read model in Studio for the selected runtime,
instead of leaving session visibility implicit in live trace events only.

Before this slice, Studio already showed:

- runtime recovery state;
- broader runtime trace;
- runtime lifecycle actions; and
- persisted runtime artifacts.

What it still lacked was an explicit session summary surface grounded in
`GET /v1/sessions`.

## Decisions frozen in this slice

### Session inspection stays summary-oriented for now

This slice does not add full session drilldown in Studio.

It consumes only the host-owned session summary list and filters it for the
selected runtime. That keeps the slice bounded while still giving the operator
real visibility into session-level work.

### Selected-runtime refresh continues to degrade partially

The selected-runtime detail refresh now covers:

- host status;
- runtime list;
- recovery inspection;
- runtime artifact inspection; and
- session summaries.

Panel-specific failures remain isolated instead of collapsing the entire
selected-runtime surface.

### Session presentation should remain deterministic

Studio formats session summaries through pure helpers for:

- filtering sessions that involve the selected runtime;
- deterministic reverse-chronological ordering; and
- concise label/detail formatting from node status and trace ids.

## Implemented changes

### Studio session helpers

Added a dedicated helper module for filtering and formatting host session
summaries relevant to one runtime.

### Selected-runtime session panel

Studio now exposes a `Runtime Sessions` panel showing, for the selected
runtime:

- session id;
- selected-runtime session status;
- node status summary; and
- trace ids.

### Refresh-path widening

The selected-runtime refresh path now includes host session summaries and
refreshes them again when a `session.updated` event arrives for the selected
runtime.

## Verification

The slice closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests;
- full `pnpm verify`;
- `git diff --check`.

## Result

Studio now exposes the main host-backed read surfaces that matter for one
runtime:

- recovery;
- live trace;
- artifacts; and
- session summaries.

The next best Studio slice is now clearer than before:

- bounded package/graph mutation flows on top of the already implemented host
  mutation surfaces.
