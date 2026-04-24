# Studio Package Admission Slice

## Summary

Completed the next bounded Studio mutation slice by exposing host-owned
package-source admission on top of the already implemented package-source
resource surface.

Studio now supports:

- inspecting admitted package sources directly from host state;
- admitting canonical `local_path` package sources through
  `POST /v1/package-sources`;
- admitting canonical `local_archive` package sources through the same host
  boundary;
- keeping package-source read failures partial, so package admission degrades
  without collapsing the wider runtime and graph overview.

This closes the first package-admission loop in Studio without introducing any
browser-owned filesystem abstraction into the canonical operator surface.

## Design decisions frozen in this slice

### Studio remains host-driven for package admission

Studio does not try to discover, parse, or validate packages on its own.

It assembles a bounded admission request and delegates all canonical work to
the host:

- request validation;
- package-source persistence;
- manifest inspection;
- materialization state tracking;
- canonical inventory exposure.

### Admission stays aligned with the package-source contract

The Studio flow is intentionally constrained to the source kinds already owned
by the host contract:

- `local_path`
- `local_archive`

That keeps the UI aligned with the canonical model and avoids experimental
browser-directory semantics that would not survive outside the frontend.

### Package-source reads are partial-failure-aware

Studio already treated package-source reads as secondary to the main overview.
This slice preserves that rule:

- host status, graph inspection, and runtime inspection remain the primary
  liveness surface;
- package-source inspection failure degrades the package-admission and
  managed-node editing surfaces only.

This keeps the operator experience resilient while still surfacing the real
error.

## Implemented changes

### Pure helper module for package admission

Added a dedicated helper module for:

- empty draft creation;
- canonical request building for `local_path` and `local_archive`;
- deterministic package-source sorting;
- operator-facing package-source label and detail formatting.

### Package-source inventory in Studio

Studio now renders the host-admitted package-source inventory in the graph
editor area so operators can inspect the currently available package sources
before using them in managed-node edits.

### Package admission editor

Studio now exposes a bounded `Package Admission` panel with:

- source-kind selection;
- optional explicit package-source id;
- canonical path input for either absolute local paths or local archive paths;
- reset and submit actions;
- explicit mutation and partial-read error feedback.

### Shared managed-node/package-source alignment

The managed-node editor now consumes the same package-source ordering and label
logic through the new shared package-admission helper module instead of
redefining that formatting locally.

## Verification

This slice was closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests, including the new pure package-admission
  helper tests;
- full `pnpm verify`;
- `git diff --check`.

## Outcome

Studio now supports bounded host-owned mutation for:

- graph edges;
- managed nodes;
- package-source admission.

The next best Studio completion slice is now:

1. live event-driven refresh where the host event stream adds real operator
   value beyond manual reload;
2. only then, deeper session drilldown where the current session-summary view
   leaves genuine operator blind spots.
