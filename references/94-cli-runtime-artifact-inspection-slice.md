# CLI Runtime Artifact Inspection Slice

## Summary

Completed the next bounded CLI parity slice by exposing runtime artifact
inspection on top of the already implemented host artifact read surface.

The CLI now supports:

- `host runtimes artifacts <nodeId>`
- `host runtimes artifacts <nodeId> --summary`
- `host runtimes artifact <nodeId> <artifactId> --summary`
- optional local filtering by:
  - `--backend`
  - `--kind`
  - `--lifecycle-state`
  - `--publication-state`
  - `--retrieval-state`

This closes the runtime-artifact parity gap without widening the host API or
turning the CLI into a second control plane.

## Design decisions frozen in this slice

### CLI artifact filtering stays local

The host continues to own the canonical artifact record and list surface.

The CLI fetches the host-owned runtime artifact inventory and then applies
deterministic local filtering over the returned records. That keeps:

- the host API stable and resource-oriented;
- the CLI useful for headless inspection and scripting;
- filtering logic explicit and testable.

### CLI defaults are explicit, not inferred ad hoc

The local CLI filter model now treats missing artifact metadata as explicit
operator-facing defaults:

- missing publication metadata -> `not_requested`
- missing retrieval metadata -> `not_retrieved`

That makes filter behavior deterministic instead of silently excluding artifacts
with absent optional fields.

## Implemented changes

### Runtime artifact command helper

Added a dedicated pure helper module for:

- deterministic runtime artifact sorting by `updatedAt`;
- local filtering by backend, kind, lifecycle state, publication state, and
  retrieval state.

Those command-facing helpers now delegate to shared `packages/host-client`
runtime-artifact presentation helpers so Studio and CLI use the same label,
status, locator, and detail-line vocabulary.

### Runtime artifact CLI surface

Added `host runtimes artifacts <nodeId>` on top of
`GET /v1/runtimes/{nodeId}/artifacts`, returning filtered JSON through the same
thin host-client boundary already used by the rest of the CLI.

## Verification

This slice was closed only after:

- targeted `@entangle/cli` lint;
- targeted `@entangle/cli` typecheck;
- targeted `@entangle/cli` tests, including the new runtime-artifact helper
  tests;
- full `pnpm verify`;
- `git diff --check`.

## Outcome

The next best CLI parity slice is now:

1. stronger automation-oriented JSON and dry-run flows where they add real
   headless operational leverage;
2. only then, further CLI widening where it exposes a host capability that is
   already clearly valuable.
