# Studio and CLI Runtime Recovery Inspection Slice

## Goal

Close the first real operator-facing consumption slice on top of the already
implemented host-owned runtime recovery model.

Before this slice, Entangle already had:

- host-owned runtime recovery history inspection;
- explicit recovery policy and recovery-controller records;
- durable recovery-oriented host events;
- shared host-client support for event listing and WebSocket subscription;
- CLI support for recovery reads and recovery-policy mutation.

What it still lacked was a coherent client-side inspection layer that made
those host capabilities meaningfully usable without dropping to raw files or
hand-written event filtering.

## Decisions frozen in this slice

### Recovery inspection stays host-first

Neither Studio nor CLI infer recovery state locally.

They consume:

- host recovery inspection reads;
- host event records;
- shared host-client filtering helpers.

This preserves the rule that the host remains the only owner of recovery truth,
while clients remain inspection and control surfaces.

### Event filtering should be shared, not duplicated per client

Recovery-oriented event filtering is implemented once in
`packages/host-client`, then reused by both:

- `entangle-cli`; and
- `entangle-studio`.

This avoids parallel filtering logic drifting across operator surfaces.

### Studio must not reconnect its event stream on selection changes

The first pass of the Studio slice was functionally correct but still
re-subscribed to the host event stream when the selected runtime changed.

The slice was only closed after tightening this behavior so the WebSocket
subscription remains stable and the runtime selection changes only affect local
inspection state, not transport lifecycle.

## Implemented changes

### Shared inspection helpers

Added reusable event-inspection helpers to `packages/host-client`:

- `HostEventFilter`
- `hostEventMatchesFilter(...)`
- `filterHostEvents(...)`
- `runtimeRecoveryEventTypePrefixes`

These are now the canonical client-side helpers for recovery-oriented host
event inspection.

### CLI widening

`entangle-cli` now provides:

- `host events list`
- `host events watch`

with shared filtering over:

- category;
- node id;
- arbitrary event-type prefixes;
- a recovery-only preset.

This turns the CLI into a real recovery/event inspection surface instead of a
pure mutation and polling client.

### Studio widening

`entangle-studio` now consumes the host event stream and exposes a real runtime
recovery inspector with:

- runtime selection;
- recovery policy display;
- recovery-controller display;
- recovery history display;
- live recovery-event display;
- event-stream connection state.

The Studio graph remains host-backed, and runtime recovery inspection is
layered on top of the same host-owned state model instead of inventing a
client-side shadow model.

### Tests and tooling

The slice widened:

- `packages/host-client` tests for shared event filtering;
- CLI tests for event-filter construction;
- Studio tests for recovery-inspection helpers;
- workspace test and lint wiring so the new package-local tests participate in
  the same typed quality gates as the rest of the monorepo.

## Verification

The slice was closed only after:

- targeted `@entangle/host-client` tests;
- targeted `@entangle/cli` tests;
- targeted `@entangle/studio` tests;
- targeted `@entangle/studio` lint and typecheck;
- full `pnpm verify`;
- `git diff --check`.

## Result

Entangle now has its first serious operator-facing recovery inspection path on
top of the already implemented host recovery model.

The remaining gap in this area is no longer “make recovery usable from
clients”. It is narrower:

- widen host events further into conversation-, approval-, and artifact-oriented
  classes;
- deepen Studio into broader runtime and operator workflows on top of those
  host capabilities;
- continue CLI parity where it adds real headless operational value.
