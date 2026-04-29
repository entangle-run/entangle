# Lifecycle And Session Command Receipts Slice

## Current Repo Truth

After `392-runner-owned-command-receipt-adoption-slice.md`, runner-owned
artifact/source/wiki work commands emitted `runtime.command.receipt`
observations. Runtime lifecycle commands still relied on assignment/runtime
status receipts, and session cancellation relied on the session cancellation
path. Those observations were valid, but they did not close the specific
Host-signed command id.

## Target Model

All Host-signed runtime commands should have a lightweight command receipt:

- lifecycle start/stop/restart command receipts correlate command completion
  with the accepted assignment;
- session cancellation receipts correlate command completion with the
  cancellation id and session id;
- assignment lifecycle receipts and session observations remain the canonical
  domain/lifecycle evidence.

## Impacted Modules And Files

- `packages/types/src/protocol/observe.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/392-runner-owned-command-receipt-adoption-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `sessionId` and `cancellationId` fields to command receipt
  observations, Host events, and projection records.
- Emit `received/completed/failed` command receipts for `runtime.start`.
- Emit `received/completed/failed` command receipts for `runtime.stop`.
- Emit `received/completed/failed` command receipts for `runtime.restart`.
- Emit `received/completed/failed` command receipts for
  `runtime.session.cancel`.
- Preserve existing assignment receipts, runtime status observations, and
  session cancellation domain behavior.
- Extend the process-runner smoke to wait for completed lifecycle command
  receipts for stop/start/restart.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test -- --runInBand`
- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm typecheck`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- `pnpm test`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- `git diff -U0 | rg "^\\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is additive. Existing lifecycle consumers can continue to use assignment
receipts, runtime status projection, and assignment timelines. The new
`runtime.command.receipt` entries provide command-id closure for callers that
need to audit Host command delivery and completion.

## Risks And Mitigations

- Risk: lifecycle receipt and command receipt become confused.
  Mitigation: lifecycle receipts retain `assignment.receipt`; command receipts
  use `runtime.command.receipt` and carry `commandEventType`.
- Risk: command receipt completion can look like proof of domain mutation.
  Mitigation: start/stop/restart completion is tied to runtime status handling,
  while session cancellation completion only means the runner accepted and
  applied the cancellation command path.

## Open Questions

- Should Host lifecycle API responses include command ids directly, or should
  clients discover them only through event/projection streams?
