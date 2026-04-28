# Assignment Receipt Projection Slice

## Current Repo Truth

Host now records signed `assignment.receipt` observations as typed
`runtime.assignment.receipt` Host events. Operators can inspect those through
the general `/v1/events` stream, and the process-runner smoke proves the real
lifecycle path emits received/started/stopped receipts.

The Host projection snapshot did not yet expose a compact assignment receipt
read model. Studio/CLI consumers would need to scan general Host events to
build an assignment timeline.

## Target Model

Host projection should expose bounded receipt records next to assignment,
runner, and runtime projection state. This keeps operator surfaces aligned on a
single Host projection model without requiring direct event-log scanning for
normal assignment lifecycle inspection.

## Impacted Modules/Files

- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `assignmentReceiptProjectionRecordSchema`;
- added `assignmentReceipts` to `hostProjectionSnapshotSchema`;
- derived receipt projection records from recent typed Host receipt events;
- sorted receipt projection newest-first by observed time;
- extended Host projection tests to assert receipt projection content.

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

The projection addition is backward-compatible for JSON consumers that ignore
unknown fields. The schema also defaults `assignmentReceipts` to an empty array
for older snapshots.

## Risks And Mitigations

- Risk: receipt projection currently reads the recent Host event log rather than
  a dedicated receipt store. Mitigation: the projection is bounded to recent
  events and is intended as an operator read model, not as the only durable
  event archive.
- Risk: high-churn assignments may exceed the current recent-event window.
  Mitigation: add a dedicated per-assignment receipt projection store if
  operator timelines need full history at scale.

## Open Questions

- Should Studio show assignment receipts inline under each assignment row, or
  should they live in a dedicated assignment detail panel?
