# Studio Live Refresh Slice

## Summary

Completed the next bounded Studio completion slice by using the already
implemented host event stream to refresh operator-visible state without adding
polling loops or client-owned control-plane logic.

Studio now:

- coalesces live overview refresh when control-plane or runtime-lifecycle host
  events affect graph, runtime, or package-source state;
- coalesces selected-runtime refresh when node-scoped runtime, recovery,
  session, turn, conversation, approval, or artifact events affect the
  currently selected runtime;
- resynchronizes overview and selected-runtime state when the host event stream
  reconnects;
- keeps the host event subscription stable instead of reconnecting when the
  selected runtime changes.

This closes the first event-driven Studio refresh loop on top of the existing
host-owned event surface.

## Design decisions frozen in this slice

### Live refresh stays host-first

Studio still does not derive canonical runtime, graph, or package-source state
 from events alone.

The host event stream is used only to decide **when** the UI should refresh
host-owned read surfaces:

- `loadOverview()`
- `refreshSelectedRuntimeDetails(nodeId)`

The event stream is therefore a refresh trigger, not a shadow state model.

### Refresh is intentionally coalesced

The host can emit bursts of related events for one operator action. Studio now
coalesces refresh work into short timers instead of issuing one host read per
event.

That keeps the operator surface responsive without turning the host event
stream into a reload storm.

### Event subscription stability remains non-negotiable

Earlier work already established that Studio should not reconnect the host
event subscription when the selected runtime changes.

This slice preserves that constraint by keeping selection-aware refresh logic
behind `useEffectEvent` callbacks instead of moving `selectedRuntimeId` into
the WebSocket subscription effect dependencies.

## Implemented changes

### Pure host-event refresh predicates

Added a dedicated helper module that decides:

- which host events should trigger overview refresh;
- which host events should trigger selected-runtime refresh.

This keeps the event-driven policy explicit, typed, and testable.

### Coalesced overview refresh

Studio now refreshes the host-backed overview when live events indicate that
the operator-visible topology or package inventory may have changed, including:

- package-source admission;
- graph revision apply;
- managed-node and edge mutation;
- runtime desired/observed lifecycle changes;
- reconciliation completion.

### Coalesced selected-runtime refresh

Studio now refreshes the selected-runtime read surface when the currently
selected node receives runtime, recovery, session, turn, conversation,
approval, or artifact events.

This keeps the selected-runtime panel fresher without reloading unrelated
topology state on every trace event.

### Reconnect resynchronization

When the host event stream reconnects, Studio now schedules a bounded overview
refresh and, when applicable, a bounded selected-runtime refresh so the UI
converges back to current host truth after a transient connection loss.

## Verification

This slice was closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests, including the new pure host-event refresh
  helper tests;
- full `pnpm verify`;
- `git diff --check`.

## Outcome

Studio now has:

- host-backed topology and runtime inspection;
- bounded topology and package-source mutation flows;
- a first live event-driven refresh loop over the same host-owned read model.

The next best slice is now:

1. fuller CLI parity for the core host workflows;
2. only then, narrower Studio session drilldown where the existing session
   summary view still leaves real operator blind spots.
