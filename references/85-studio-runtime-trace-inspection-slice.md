# Studio Runtime Trace Inspection Slice

## Goal

Deepen Studio from a recovery-only runtime inspector into a broader operator
surface for selected runtime activity, without adding any new host API or
moving control logic into the client.

Before this slice, the repository already had:

- host-owned recovery policy, controller, history, and recovery events;
- host-owned session, conversation, approval, artifact, and runner-turn trace
  events;
- shared `host-client` support for event listing and live event streaming.

What Studio still lacked was a runtime-focused way to consume that wider trace
surface. The host and runner persisted more operator-visible truth than the UI
actually exposed.

## Decisions frozen in this slice

### Studio stays a host consumer

This slice does not add a Studio-owned query model, join layer, or derived
trace protocol.

Studio only consumes:

- runtime inspection already exposed by the host;
- runtime recovery inspection already exposed by the host; and
- typed host events already persisted and streamed by the host.

### The event-filtering boundary stays shared

Trace filtering logic is still shared through `packages/host-client`.

This slice adds a second typed event-prefix family there:

- runtime recovery prefixes; and
- broader runtime-trace prefixes for session, conversation, approval, artifact,
  and runner-turn activity.

That keeps Studio and future CLI parity work aligned on the same event
classification rules instead of letting each client invent its own filters.

### Runtime inspection should show reconciliation, not just liveness

The selected-runtime card in Studio now surfaces:

- reconciliation state;
- finding codes;
- backend kind and context availability; and
- restart generation.

That freezes the rule that “runtime inspection” in Studio means more than
observed liveness alone.

## Implemented changes

### Shared client-side filtering

Added `runtimeTraceEventTypePrefixes` to `packages/host-client` so shared event
inspection now distinguishes:

- recovery-specific runtime events; and
- broader runtime trace events tied to selected-node activity.

### Studio runtime trace helpers

Added a dedicated `runtime-trace-inspection` helper module in Studio for:

- collecting trace events for the selected runtime; and
- formatting concise operator-facing labels for:
  - `session.updated`
  - `conversation.trace.event`
  - `approval.trace.event`
  - `artifact.trace.event`
  - `runner.turn.updated`

### Studio UI widening

Studio now exposes:

- richer selected-runtime inspection with reconciliation and backend metadata;
- a live runtime-trace panel beside the existing live recovery panel; and
- checklist language that matches the now broader operator surface.

This is still a narrow slice: no mutation flow was added, and no host
capability was widened. The UI simply became a better consumer of already
implemented host-owned truth.

## Audit findings corrected during the slice

The implementation pass rechecked the selected-runtime refresh path and kept it
strictly aligned with the host contracts:

- runtime recovery refresh continues to fetch host status, runtime list, and
  recovery inspection through the shared host client;
- no new client-owned fallback or cache layer was introduced.

## Verification

The slice closed only after:

- targeted `@entangle/host-client` tests;
- targeted `@entangle/studio` lint;
- targeted `@entangle/studio` tests;
- full `pnpm verify`;
- `git diff --check`.

## Result

Studio now reflects the host-owned trace surface much more honestly:

- recovery inspection remains intact;
- reconciliation visibility is richer;
- live per-runtime trace is visible without reading host files by hand.

The next best Studio slice is no longer “show host-owned trace at all”. It is
narrower:

- bounded mutation flows for package admission, node and edge editing, and
  runtime lifecycle operations; and
- deeper session/artifact inspection only where the existing host surfaces give
  real operator leverage.
