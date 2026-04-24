# Builtin Session-State Tool Slice

## Summary

This slice closes two related gaps in the runner tool surface:

- builtin tool ids are now a frozen machine-readable contract instead of
  arbitrary strings accepted by the package tool catalog;
- the builtin tool surface now includes a bounded local-session inspection tool
  that lets a node reason over its own persisted session, conversation, turn,
  and related artifact state without widening into arbitrary filesystem reads.

## What changed

### 1. Builtin tool ids are now canonical

The shared types layer now exports a dedicated builtin tool contract:

- `inspect_artifact_input`
- `inspect_memory_ref`
- `inspect_session_state`

`PackageToolCatalog` no longer accepts arbitrary `builtinToolId` values. A
package that references an unsupported builtin tool now fails at contract
validation time instead of surviving until runtime.

### 2. The runner now exposes `inspect_session_state`

The new builtin tool is intentionally narrow:

- it may only inspect the current session;
- it accepts only bounded numeric widening knobs:
  - `maxRecentTurns` in the range `1..10`
  - `maxArtifacts` in the range `1..20`
- it never reads arbitrary state paths from the tool request;
- it uses runner-owned state-store reads rather than ad hoc filesystem logic.

The tool returns a bounded structured snapshot containing:

- current session summary;
- session conversation summaries;
- recent turn summaries;
- related artifact summaries;
- deterministic counts for the full related set before per-section slicing.

### 3. The returned data is summarized, not raw-dumped

The tool does not dump full internal records blindly. It returns a bounded
projection that is useful for reasoning while preserving control over payload
size and semantics:

- turn summaries include normalized engine-outcome hints rather than raw
  execution internals;
- artifact summaries expose lifecycle-oriented state, not full materialization
  metadata;
- session inspection remains scoped to the runner's current session only.

## Why this slice matters

Before this change, the runtime could inspect:

- inbound artifact content;
- bounded memory references.

But it still lacked a first-party way to inspect its own current session state
through the same internal tool loop. That made the builtin tool surface
asymmetric: the model could reason over inputs and memory, but not over the
runner's own persisted progress without depending on future wider host or UI
surfaces.

This slice fixes that while keeping the surface bounded and runtime-local.

## Explicit non-goals

This slice does **not**:

- expose arbitrary session lookup across the whole runtime;
- expose approvals or unrelated sessions by id;
- dump raw JSON files into tool responses;
- widen into arbitrary state mutation;
- add a broad general-purpose filesystem inspection tool.

## Validation and quality gates

The slice was only closed after:

- widening `types` tests to reject unsupported builtin tool ids;
- widening runner tool-executor tests for:
  - successful bounded session-state inspection;
  - invalid widening attempts;
  - missing local session state;
- re-running targeted package tests and lint;
- re-running `pnpm verify`;
- confirming `git diff --check` is clean.

## Resulting state

The builtin tool surface is now both:

- **stricter** at the contract boundary;
- **more useful** for bounded runtime reasoning.

The next best move is to build richer model-guided memory maintenance or
working-context synthesis on top of this now stronger runtime-local inspection
surface, rather than widening the builtin tool catalog arbitrarily.
