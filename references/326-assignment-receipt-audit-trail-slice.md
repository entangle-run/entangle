# Assignment Receipt Audit Trail Slice

## Current Repo Truth

Joined runners already emitted `assignment.receipt` observations for assignment
offer handling and runtime lifecycle commands. Host validated and reduced
assignment accepted/rejected observations, runtime status observations, and
activity observations, but it ignored assignment receipts in
`HostFederatedControlPlane.handleObservationEvent`.

That left lifecycle command delivery visible in runner logs and runtime status
projection, but not as a typed Host audit event.

## Target Model

Every signed observation that matters for runner assignment state should leave a
Host-owned audit trace. Assignment receipts are part of that trail: they show
that a runner received, materialized, started, stopped, or failed a command or
assignment step.

## Impacted Modules/Files

- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added typed Host event `runtime.assignment.receipt`;
- added Host state reduction for signed `assignment.receipt` observations;
- wired Host federated observation intake to record assignment receipts instead
  of ignoring them;
- extended Host control-plane tests to record a receipt observation and assert
  the Host audit event;
- extended the process-runner smoke to verify the real federated lifecycle path
  produces `received`, `started`, and `stopped` receipt events.

## Tests Required

Verification run:

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/host test -- src/federated-control-plane.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/types build`
- `pnpm --filter @entangle/host build`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

## Migration/Compatibility Notes

This only adds a Host event type and recording path. Existing runner receipts
remain protocol-compatible. Operators querying `/v1/events` may now see
additional `runtime.assignment.receipt` records.

## Risks And Mitigations

- Risk: Host events could grow noisier during assignment churn. Mitigation:
  receipts are bounded event records and are useful for audit/debugging of
  federated command delivery.
- Risk: forged receipt observations could pollute Host events. Mitigation:
  receipt recording uses the same registered-runner public-key validation as
  runtime status observations.

## Open Questions

- Assignment receipts are now Host events, not yet a dedicated assignment
  receipt projection table. Add a compact receipt projection if operators need
  per-assignment timelines without scanning Host events.
