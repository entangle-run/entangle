# Runtime Recovery Policy Slice

## Goal

Add an explicit, host-owned recovery policy on top of the already implemented:

- deterministic runtime restart;
- degraded-state and reconciliation summaries;
- persisted runtime recovery history.

Before this slice, Entangle could show that a runtime had failed and could
record that failure durably, but it still had no explicit answer to these
questions:

- should the host retry automatically or require operator action?
- how many times may it retry before it stops?
- can an operator inspect the current recovery controller state instead of
  reverse-engineering it from raw history?

## Decisions frozen in this slice

### Recovery policy is separate from runtime desired state

Recovery policy is not merged into start/stop intent.

The separation is now explicit:

- runtime desired state remains in runtime intents;
- recovery policy is a separate desired-state record owned by the host;
- recovery controller state is a separate observed-state record owned by the
  host.

That keeps lifecycle intent, operator recovery preference, and observed
recovery progress from collapsing into one overloaded record.

### Default policy is manual

The default policy is now:

```json
{
  "mode": "manual"
}
```

Automatic recovery exists, but it is opt-in.

This is the correct default because it avoids surprising restart behavior while
still allowing the operator to enable bounded recovery explicitly.

### Automatic recovery is bounded and reconciliation-owned

The first automatic mode is:

- `restart_on_failure`

with explicit:

- `maxAttempts`
- `cooldownSeconds`

The host owns the logic. The runner does not decide whether to retry itself.

Recovery happens during reconciliation, with at most one automatic restart
attempt per reconciliation pass for a given failed runtime.

### Recovery attempt accounting is based on stable failure identity

Attempt budgets must survive restart-generation changes.

The slice therefore introduced a recovery failure fingerprint that excludes
volatile restart-driven details such as the runtime handle and restart
generation. Without that, repeated retries against the same underlying failure
would incorrectly look like unrelated failures and would never exhaust.

## Implemented changes

### Shared contracts

Added canonical schemas for:

- runtime recovery policy;
- runtime recovery policy records;
- runtime recovery controller state records;
- runtime recovery policy mutation requests.

Widened the runtime recovery inspection surface so
`GET /v1/runtimes/{nodeId}/recovery` now returns:

- current runtime inspection;
- recovery history entries;
- effective recovery policy record;
- current recovery controller record.

Added typed host events for:

- `runtime.recovery_policy.updated`
- `runtime.recovery.attempted`
- `runtime.recovery.exhausted`

### Host state and behavior

`entangle-host` now persists:

- desired recovery policies under host desired state;
- observed recovery-controller state under host observed state.

During runtime reconciliation:

- failed runtimes under `manual` policy enter `manual_required`;
- failed runtimes under `restart_on_failure` may trigger a bounded automatic
  restart;
- repeated failures consume attempt budget against the stable failure
  fingerprint;
- exhausted failure series enter `exhausted`;
- healthy runtimes reset recovery controller state back to `idle`.

### Host API, client, and CLI

Added:

- `PUT /v1/runtimes/{nodeId}/recovery-policy`

The same boundary is now available through:

- `packages/host-client`
- the CLI runtime recovery-policy command

## Testability improvement

This slice also removed a real testability weakness in the host boundary.

The runtime backend is now configurable for the process, so host integration
tests can inject deterministic failing backends without relying on a real
Docker daemon or on ad hoc failure hacks in the production runtime code.

That is a design improvement, not just a test convenience: it makes the host
control-plane boundary more explicitly testable and therefore safer to evolve.

## Verification

The slice was closed only after:

- targeted `@entangle/types` tests;
- targeted `@entangle/host-client` tests;
- targeted `@entangle/host` tests;
- full `pnpm verify`;
- `git diff --check`.

New tests cover:

- widened recovery inspection contracts;
- host-client parsing for recovery-policy mutation responses;
- policy mutation through the host boundary;
- manual-only failed-runtime behavior;
- automatic recovery exhaustion with deterministic retry accounting.

## Result

Entangle now has a real host-owned recovery model instead of only restart
buttons plus recovery history.

The remaining work in this area is no longer “add retry policy at all”.
It is narrower:

- richer recovery-oriented diagnostics and event widening;
- deeper Studio and CLI exposure of the recovery model;
- any future broadening beyond the current bounded restart-on-failure profile.
