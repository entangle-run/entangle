# Reconciliation And Degraded-State Slice

## Goal

Make host reconciliation semantics explicit enough to distinguish:

- healthy aligned runtimes;
- transitional runtimes that are still converging;
- degraded runtimes with real actionable findings.

Before this slice, the host mostly exposed `running`, `stopped`, and `failed`
counts. That was not strong enough for operator surfaces because:

- unrealizable runtimes were collapsed into `stopped`;
- intentionally stopped runtimes and blocked runtimes were not separated;
- host status could only degrade on observed runtime failure, not on broader
  realizability failure.

## Decisions frozen in this slice

### Runtime reconciliation is derived, not hand-authored

Reconciliation is now derived from canonical runtime inspection state rather
than maintained as a second ad hoc status model.

The minimal input is:

- `desiredState`
- `observedState`
- `contextAvailable`

### Reconciliation states

Per runtime, the host now classifies reconciliation into:

- `aligned`
- `transitioning`
- `degraded`

### Canonical reconciliation findings

The first finding-code set is intentionally narrow:

- `context_unavailable`
- `runtime_failed`
- `runtime_missing`
- `runtime_stopped`

The point is not to enumerate every operational nuance now. The point is to
make the first host-level degraded semantics explicit and machine-readable.

### Host status derivation

Host status now follows this rule:

1. `degraded` if any runtime is degraded
2. `starting` if none are degraded and at least one runtime is transitioning
3. `healthy` otherwise

That rule is now shared by the persisted reconciliation snapshot and
`GET /v1/host/status`.

## Implemented changes

### Shared contracts

Added canonical reconciliation schemas and helpers in `packages/types`:

- runtime reconciliation state
- runtime reconciliation finding codes
- runtime reconciliation summary
- runtime reconciliation classifier

Extended:

- `RuntimeInspectionResponse` with derived reconciliation metadata
- reconciliation snapshots with richer per-node summaries plus aggregate counts
- host status response with blocked, degraded, transitioning, and issue counts
- host reconciliation-completed events with richer aggregate metadata

### Host state

`entangle-host` now:

- derives reconciliation once from runtime inspection;
- persists richer reconciliation snapshots;
- emits richer `host.reconciliation.completed` events;
- reports host status from degraded/transitioning semantics instead of only
  `failedRuntimeCount`.

### Compatibility

Legacy persisted reconciliation snapshots continue to parse through backward
compatible contract transforms, so existing local `.entangle/host` state does
not become unreadable immediately after this contract widening.

## Verification

This slice was closed only after:

- targeted `@entangle/types` tests;
- targeted `@entangle/host` tests;
- full `pnpm verify`;
- `git diff --check`.

New tests cover:

- direct reconciliation classification;
- backward-compatible parsing of older reconciliation snapshots;
- richer host status payload parsing;
- healthy runtime status;
- degraded status for unrealizable runtime context;
- non-degraded status for intentionally stopped runtimes.

## Result

The host control plane now exposes a first serious notion of runtime health
instead of only surfacing raw observed states.

This is a foundation slice for:

- richer Studio runtime inspection;
- better CLI watch/status flows;
- future reconciliation restart/retry policy;
- broader host event widening into session and runner activity.
