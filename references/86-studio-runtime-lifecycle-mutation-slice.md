# Studio Runtime Lifecycle Mutation Slice

## Goal

Add the first bounded mutation flow to Studio by letting the operator start,
stop, and restart the selected runtime through existing host-owned lifecycle
surfaces.

Before this slice, Studio could:

- inspect runtime recovery state;
- inspect broader runtime trace state; and
- follow live host events.

It still could not perform even the smallest real control-plane mutation from
the visual operator surface.

## Decisions frozen in this slice

### Studio remains a thin mutation client

Studio does not own runtime orchestration rules.

It only calls existing host-client methods:

- `startRuntime`
- `stopRuntime`
- `restartRuntime`

and then refreshes selected runtime state from the host.

### Runtime action enablement follows host-visible desired state

The UI does not guess action availability from observed state alone.

The button policy now follows the same stable rule exposed by the host:

- `start` is enabled only when `desiredState === "stopped"`
- `stop` is enabled only when `desiredState === "running"`
- `restart` is enabled only when `desiredState === "running"`

This keeps button semantics aligned with the host lifecycle model and avoids
UI-level heuristics.

### Client mutation state must stay explicit and local

Studio now carries explicit local mutation state for:

- the pending lifecycle action; and
- the last lifecycle mutation error.

That state is purely presentational. It does not replace host-owned truth.

## Implemented changes

### Studio lifecycle helpers

Added a dedicated helper module for:

- determining whether start/stop/restart are enabled for the selected runtime;
- formatting deterministic button labels for pending lifecycle actions.

### Studio selected-runtime surface

The selected-runtime panel now exposes:

- `Refresh`
- `Start`
- `Restart`
- `Stop`

Buttons are disabled according to host-visible desired state and while another
lifecycle mutation is already pending.

### Mutation execution

Studio now:

1. calls the corresponding host-client mutation method;
2. refreshes selected runtime state from the host; and
3. surfaces mutation errors explicitly without inventing a client-side runtime
   state machine.

## Verification

The slice closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests;
- full `pnpm verify`;
- `git diff --check`.

## Result

Studio is no longer inspection-only for runtime lifecycle. It now has a first
real bounded control-plane mutation flow while staying host-first and
contract-driven.

The next best Studio slice is still bounded:

- graph/package mutation flows on top of the existing host node/edge/package
  surfaces; or
- deeper artifact/session inspection only where the existing host read models
  give real operator value.
