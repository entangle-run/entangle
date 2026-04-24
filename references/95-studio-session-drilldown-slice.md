# Studio Session Drilldown Slice

## Summary

Completed the next bounded Studio slice by adding session-detail drilldown on
top of the already implemented host session read surface.

Studio now keeps the existing runtime-scoped session summary list, but the
operator can also select one session and inspect its host-backed per-node
session detail without widening the host API or inventing client-owned session
state.

## Design decisions frozen in this slice

### Session detail stays host-owned

Studio continues to treat `entangle-host` as the source of truth.

The client now uses:

- `GET /v1/sessions`
- `GET /v1/sessions/{sessionId}`

to move from runtime-scoped session summaries into selected-session detail.

No session detail is inferred from event streams or reconstructed from summary
records alone.

### Runtime selection still owns the refresh cycle

The selected-runtime refresh loop remains the canonical place where runtime
adjacent reads are refreshed.

That means selected-session detail now refreshes through the same runtime
detail cycle that already refreshes recovery, artifacts, and session summaries.
This preserves the existing host-event-driven model instead of creating a
second client-side polling or event interpretation path.

### Session detail remains bounded and operator-oriented

This slice does not try to turn Studio into a raw session JSON browser.

The selected-session view is intentionally bounded to:

- session identity and graph;
- session intent;
- trace ids observed across the participating node-owned session records;
- per-node session/runtime rows, with the selected runtime surfaced first.

That is enough to close the current operator blind spot without widening the
surface into generic debugging noise.

## Implemented changes

### Runtime-session helper expansion

Extended the Studio helper layer to support:

- checking whether a selected session still references the selected runtime;
- sorting session-detail rows with the selected runtime first;
- formatting per-node session-detail labels and summaries;
- collecting stable trace-id summaries for the selected session.

### Selected session detail in Studio

The runtime sessions panel now supports:

- selecting one runtime-scoped session summary;
- loading host-backed session detail through `getSession()`;
- showing per-node session/runtime detail for the selected session;
- clearing stale session selection when the runtime-scoped session inventory no
  longer contains the selected session.

### Stale selection guard

The slice also adds a minimal stale-selection guard so a delayed session-detail
read cannot overwrite Studio state after the operator has already switched to a
different runtime or a different selected session.

## Verification

This slice was closed only after:

- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` typecheck;
- targeted `@entangle/studio` tests;
- repository-wide `pnpm verify`;
- `git diff --check`.

## Outcome

The Studio session blind spot is now closed on top of the existing host
surface.

The next best slice is no longer more Studio session plumbing. It is stronger
headless automation-oriented CLI flows where the already implemented host
surfaces can deliver real operational leverage.
