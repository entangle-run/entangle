# Runtime Recovery History Slice

## Summary

This slice adds a first-class, host-owned runtime recovery-history surface for
`entangle-host`.

The implemented boundary now includes:

- `GET /v1/runtimes/{nodeId}/recovery`
- shared typed DTOs in `packages/types`
- `packages/host-client` support
- CLI inspection support
- persisted recovery-history records under observed host state

This is intentionally a diagnostics and inspection slice, not yet an automatic
retry-policy slice.

## Problem

Before this slice, Entangle already had:

- deterministic runtime restart;
- richer reconciliation and degraded-state semantics;
- host-level status and event inspection;
- host-owned session and runner-activity observations.

But it still lacked a durable, runtime-specific history of recovery-relevant
state transitions.

## Implemented design

### Recovery inspection surface

The host now exposes:

- `GET /v1/runtimes/{nodeId}/recovery?limit={n}`

The response includes:

- `nodeId`
- `currentRuntime` when a current runtime inspection exists
- `entries`, ordered newest first

Each entry contains:

- `recoveryId`
- `recordedAt`
- optional `lastError`
- the full typed runtime inspection captured for that recovery-relevant state

### Persistence model

Recovery records are persisted under observed host state, per node:

- `observed/runtime-recovery/{nodeId}/{recoveryId}.json`

### Deduplication model

Recovery history must not duplicate semantically identical runtime states just
because the host re-ran reconciliation.

The implemented deduplication model is:

- compare only the latest persisted recovery record for the node;
- normalize the comparable value before hashing;
- ignore volatile fields that should not create new recovery history entries.

The most important refinement in this slice is that the fingerprint is now
computed over a canonicalized recursively sorted JSON value rather than over
raw `JSON.stringify()` object insertion order.

### Reconciliation single-flight

This slice also introduces a host-side single-flight guard around
`synchronizeCurrentGraphRuntimeState()`.

Purpose:

- prevent overlapping reconciliation passes from duplicating equivalent
  recovery observations;
- reduce unnecessary repeated runtime inspection work under rapid successive
  host reads or mutations;
- keep recovery and event observation more deterministic under tightly spaced
  control-plane requests.

## Quality notes

This slice was not closed on the first pass.

The first implementation added the recovery surface and persistence model, but
the audit loop found a real defect: semantically identical recovery states were
being written twice.

The root cause was not runtime drift but fingerprint instability caused by
object key ordering. The slice was only closed after:

- isolating the failure with a focused regression test;
- confirming the mismatch through targeted debug output;
- replacing naive hash input with canonicalized recursive key sorting;
- retaining the new regression test as a permanent guardrail.

## Acceptance reached

The slice is considered complete because it now provides:

- typed runtime recovery inspection through host, host-client, and CLI;
- durable per-node recovery-history persistence;
- deduplicated recovery records for unchanged runtime state;
- explicit retention pruning for older entries;
- host-side reconciliation serialization for this inspection path;
- regression coverage proving unchanged runtime state does not create
  duplicate recovery entries.

## Follow-on work

This slice intentionally does not yet implement:

- automatic retry policy;
- recovery backoff scheduling;
- recovery-oriented event classes beyond the current host event surface;
- Studio-specific recovery UX.
