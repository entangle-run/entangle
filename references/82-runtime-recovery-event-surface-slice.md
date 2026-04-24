# Runtime Recovery Event Surface Slice

## Goal

Widen the host event surface so the already implemented runtime recovery model
is observable through durable host events, not only through polling the runtime
recovery inspection surface.

Before this slice, Entangle already had:

- runtime recovery history inspection;
- explicit host-owned recovery policy records;
- observed recovery-controller state;
- bounded automatic restart-on-failure behavior;
- typed recovery-policy, recovery-attempt, and recovery-exhaustion events.

What it still lacked was a durable event trail for:

- newly recorded recovery snapshots; and
- recovery-controller state transitions themselves.

That gap made the recovery model inspectable, but not yet fully streamable.

## Decisions frozen in this slice

### Recovery observation must remain host-owned

The runner does not emit these recovery events.

The host already owns:

- reconciliation;
- recovery history materialization;
- recovery-controller state transitions.

The new event classes therefore also remain host-owned and are derived from the
same persisted observed-state model.

### Event widening must not create duplicate history semantics

The slice does not introduce a second recovery-history source.

The rule remains:

- recovery history records are the durable truth;
- host events are a typed observation stream derived from that truth.

This keeps event delivery additive instead of turning it into a competing
state store.

### Idle bootstrap state should stay quiet

The first creation of a trivial idle recovery-controller record is not treated
as a meaningful operator event.

Without that rule, the event stream would produce noise on every clean runtime
bootstrap, which would lower the signal quality of the host event boundary.

## Implemented changes

### Shared contracts

Added canonical host-event schemas for:

- `runtime.recovery.recorded`
- `runtime.recovery_controller.updated`

These events now participate in the same typed host-event union used by:

- persisted host event inspection;
- WebSocket event streaming;
- shared host-client parsing;
- test fixtures.

### Host behavior

`entangle-host` now emits:

- `runtime.recovery.recorded`
  when a new durable recovery snapshot is persisted;
- `runtime.recovery_controller.updated`
  when the observed recovery controller changes in a meaningful way.

The implementation also tightened change detection:

- controller-change comparison now ignores volatile timestamp-only drift; and
- the initial trivial `idle` controller record is treated as non-eventful.

### Tests

The slice widened:

- shared typed-event parsing tests in `packages/types`;
- host-client WebSocket event parsing tests;
- host integration tests for:
  - recovery-record emission;
  - controller-state transition emission;
  - non-emission of `runtime.recovery.attempted` under manual policy;
  - exhaustion-state visibility under bounded automatic recovery.

## Verification

The slice was closed only after:

- targeted `@entangle/types` tests;
- targeted `@entangle/host-client` tests;
- targeted `@entangle/host` tests;
- full `pnpm verify`;
- `git diff --check`.

## Result

Entangle's host recovery model is now observable through both:

- durable recovery inspection reads; and
- durable typed host-event streams.

The remaining work in this area is no longer “make recovery observable”.
It is narrower:

- richer Studio and CLI inspection on top of the now-complete recovery read and
  event surfaces; and
- any future widening into broader conversation, approval, and artifact event
  classes.
