# Session Diagnostics Observability Slice

## Purpose

Make delegated-session drift visible at every operator level where it matters:
session inspection, top-level host health, Studio overview refresh, and runtime
trace detail.

This slice follows the controlled autonomous handoff and runner-local active
conversation reconciliation work. Once runners owned the authoritative open
conversation set, the host needed to expose bounded diagnostics without taking
over session lifecycle authority.

## Problem

The previous host surfaces could show that a session existed and whether it was
active, but they could not always explain session health.

Important failure modes were easy to miss:

- a session listed an active conversation id with no matching conversation
  record;
- a conversation record was still open but missing from
  `activeConversationIds`;
- a terminal conversation still appeared in the active conversation set;
- top-level host status could remain healthy even when delegated-session state
  was internally inconsistent;
- runtime trace detail could show a `session.updated` event without enough
  bounded context to explain why host health later degraded.

## Implemented Behavior

The host now derives conversation lifecycle diagnostics from runner-owned
session and conversation records.

Session list and detail read models expose:

- aggregate conversation lifecycle status counts;
- bounded consistency findings;
- finding codes for active ids without records, terminal conversations still
  marked active, and open conversations missing active references.

`GET /v1/host/status` now exposes session diagnostics:

- inspected session count;
- total session consistency finding count;
- affected session count.

Nonzero session consistency findings degrade host status even when runtime
reconciliation is otherwise aligned.

`session.updated` host events now carry bounded diagnostics:

- `conversationStatusCounts`;
- `sessionConsistencyFindingCount`;
- `sessionConsistencyFindingCodes`.

Host observation fingerprints include those diagnostics, so drift appearing or
clearing can produce a new durable `session.updated` event even if the raw
session lifecycle state did not otherwise change.

## Presentation Behavior

Shared `packages/host-client` helpers render the same bounded session
diagnostics across operator surfaces.

The CLI summary surfaces now show session diagnostics through:

- `host status --summary`;
- `host sessions list --summary`;
- `host sessions get <sessionId> --summary`;
- host event/runtime trace summary projection.

Studio now shows session diagnostics in the Host Status panel, uses
session/conversation trace events as overview-refresh triggers, and consumes the
shared runtime-trace detail helpers for selected-runtime trace inspection.

## Boundary Decisions

- Runner-local records remain the source of session and conversation truth.
- The host owns read-model aggregation, diagnostics, persisted events, and
  health classification.
- Consistency findings are diagnostic, not automatic mutation authority.
- Automated repair remains future work and must be implemented through explicit
  runner reconciliation or host-mediated commands, not by silently rewriting
  runner state from the host read path.
- Finding payloads remain bounded so event streams stay safe for Studio, CLI,
  and future automation clients.

## Tests

Coverage now asserts:

- typed host event schemas accept the widened `session.updated` diagnostics;
- host session summaries and details include lifecycle counts and consistency
  findings;
- top-level host status degrades when session consistency findings exist;
- shared host-status and runtime-session presentation renders the diagnostics;
- Studio Host Status consumes the shared diagnostics formatter;
- Studio overview refresh reacts to session and conversation activity events;
- runtime-trace presentation renders recorded conversation counts, lifecycle
  status summaries, and bounded finding-code summaries.

## Follow-On Work

The next valuable delegated-session work is runtime behavior, not more passive
surface widening:

- cross-runtime owner-level session synthesis;
- explicit operator-visible repair workflows for diagnostic findings;
- runner-side repair actions that reconcile active conversation sets from
  durable conversation records;
- health history and audit retention for recurring session consistency drift.

## Result

Entangle can now explain delegated-session health from the top-level host view
down to a single runtime trace event while preserving the architectural
boundary that runners own session truth and the host owns diagnostics and
operator visibility.
