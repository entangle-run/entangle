# Runner Session Active Work Repair Slice

## Purpose

Move delegated-session work from passive host diagnostics toward bounded
runner-owned repair.

The host can now detect when `SessionRecord.activeConversationIds` drifts away
from durable `ConversationRecord` state. The next correct step is for the
runner, which owns session truth, to repair the active-work set before it
processes new transport intake.

## Problem

`activeConversationIds` is a derived open-work set, but it is persisted because
operators, host events, memory synthesis, and runtime traces need a cheap and
stable session signal.

That creates a narrow repair need:

- terminal conversations can remain listed as active after older or interrupted
  writes;
- active ids can reference conversations that no longer exist;
- open conversation records can exist without being listed in the active set;
- the host can diagnose the drift, but mutating runner-owned session state from
  a host read path would break the ownership model.

## Implemented Behavior

`services/runner` now lists persisted session records from the runner state
store and performs a startup repair pass before subscribing to transport
messages.

For each session:

- non-terminal sessions derive `activeConversationIds` from durable open
  conversation records in the same session;
- terminal sessions derive an empty active set, so stale active references are
  removed without reactivating completed or failed sessions;
- unchanged records are left untouched;
- repaired records receive a fresh `updatedAt` timestamp.

The repair pass now also completes a drained `active` session when the runner
has enough durable context to do so safely: no active conversations, no open
conversation records, no waiting approvals, and a known last message id/type.
Sessions missing that context remain diagnostic-only.

## Boundary Decisions

- Runner state remains authoritative for session and conversation truth.
- Host diagnostics remain read-only and never rewrite runner state.
- Startup repair is bounded to derived active work and safe drained-session
  completion; it does not invent messages, approvals, artifacts, or lifecycle
  history.
- The repair runs before transport subscription so new inbound work starts from
  a coherent active-work baseline.

## Tests

Coverage now asserts that runner startup:

- removes stale active ids for terminal or missing conversations;
- adds durable open conversations that were missing from the active set;
- preserves active session lifecycle status when open work remains;
- completes drained active sessions when the last message context is available.

## Follow-On Work

The next delegated-session runtime steps should be explicit, not implicit:

- operator-visible repair commands for lifecycle mismatches that require human
  confirmation or lack last-message context;
- cross-runtime owner-level synthesis that distinguishes upstream session
  ownership from downstream delegated work;
- host event emission that makes runner-owned repair activity observable
  without moving mutation authority into the host.

## Result

Entangle now has the first bounded automated repair loop for delegated-session
state. The host can diagnose active-work drift, and the runner can repair the
derived active-work set at the next safe ownership point before it accepts new
messages.
