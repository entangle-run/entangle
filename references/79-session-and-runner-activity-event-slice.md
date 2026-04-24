# Session And Runner Activity Event Slice

## Summary

Completed the next observability widening slice by extending the host-owned
event surface with activity events derived from persisted runner state rather
than from transient runtime callbacks.

The new event classes are:

- `session.updated`
- `runner.turn.updated`

This slice intentionally lands **after** host-owned session inspection and
**before** any broader conversation, approval, artifact, or recovery-trace
widening.

That ordering is deliberate. Session and turn activity can now build on a
stable persisted read model instead of creating event-only semantics that would
drift away from host truth.

## Semantics frozen by this slice

### Activity events are host-derived, not runner-pushed

The runner continues to persist its own session and turn records under the
runtime root. The host remains the only component responsible for:

- reading those records;
- normalizing them into canonical activity observations;
- deciding whether a new event should be emitted;
- persisting the deduplication cursor for future reconciliations.

This preserves the host as the observability boundary and avoids coupling the
runner to a private event backchannel.

### Deduplication is durable

The host now persists observed activity records under observed host state for:

- session activity
- runner-turn activity

Each observation stores a fingerprint of the canonical activity payload. The
host emits a new event only when the durable observed fingerprint changes.

This is intentionally stricter than in-memory deduplication. Reconciliation,
process restarts, and repeated inspection requests should not produce duplicate
activity events when the underlying persisted runner state has not changed.

### Scope of this slice

This slice does **not** attempt to implement every possible trace class.

It only widens the first host event surface into:

- session lifecycle updates visible through `SessionRecord`
- runner turn-phase updates visible through `RunnerTurnRecord`

It does **not** yet add:

- conversation events
- approval events
- artifact lifecycle events
- recovery-history events
- separate trace APIs beyond the current host event and session inspection
  surfaces

## Implemented changes

### Shared contracts

Added canonical activity-observation records in `packages/types`:

- `ObservedSessionActivityRecord`
- `ObservedRunnerTurnActivityRecord`

Extended canonical host-event contracts with:

- `SessionUpdatedEvent`
- `RunnerTurnUpdatedEvent`

These now define the shared machine-readable boundary for host persistence,
tests, future client consumption, and later trace widening.

### Host state

`services/host` now:

- persists observed session activity under
  `.entangle/host/observed/session-activity/`
- persists observed runner-turn activity under
  `.entangle/host/observed/runner-turn-activity/`
- fingerprints canonical payloads before deciding whether to emit
- removes stale observed activity files when the corresponding runtime activity
  disappears

This makes host-side activity observation deterministic and restart-safe.

### Synchronization model

Activity observation is now folded into the existing host synchronization path.

When the host synchronizes the current runtime set, it also:

- reads runtime-local session records;
- reads runtime-local turn records;
- updates durable observed activity state;
- emits typed activity events only on durable change.

This means the event stream is still grounded in host truth rather than in a
parallel event-only subsystem.

## Testing and verification

This slice was closed only after:

- targeted `@entangle/types` tests;
- targeted `@entangle/host` tests;
- full `pnpm verify`;
- `git diff --check`.

New coverage includes:

- shared contract parsing for `session.updated` and `runner.turn.updated`
  events;
- host integration coverage proving that:
  - persisted session and turn files produce the expected typed events;
  - repeated host reads without state change do not duplicate those events.

## Outcome

The host event surface is no longer limited to control-plane and coarse runtime
lifecycle changes.

Entangle now has:

- a stable session inspection boundary;
- a stable first activity-widening layer for session and turn updates;
- durable host-side deduplication anchored in observed state;
- and a cleaner base for future widening into conversation, approval, artifact,
  and recovery-oriented trace surfaces.
