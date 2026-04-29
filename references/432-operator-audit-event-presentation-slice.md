# Operator Audit Event Presentation Slice

## Current Repo Truth

`431-bootstrap-viewer-operator-authorization-slice.md` added
`operatorRole` to `host.operator_request.completed` events and made the
bootstrap `viewer` role read-only. CLI host event summaries already use the
shared host-client runtime-trace presentation helper for compact event output.
Before this slice, security audit events still rendered as generic event type
labels in summary mode.

## Target Model

Operator-facing event summaries should make denied and successful protected
mutations understandable without requiring raw JSON inspection. A viewer-denied
mutation should show the operator id, role, method, path, status code, and auth
mode in the same compact summary path used by CLI event listing.

## Impacted Modules And Files

- `packages/host-client/src/runtime-trace.ts`
- `packages/host-client/src/runtime-trace.test.ts`
- `apps/cli/src/runtime-trace-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/431-bootstrap-viewer-operator-authorization-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added a `host.operator_request.completed` case to the shared event
  presentation helper.
- The presentation label now includes operator id, method, path, and status.
- Detail lines include operator id/role, method, path, status, and auth mode.
- Added host-client unit coverage for the shared presentation.
- Added CLI summary projection coverage so `entangle host events --summary`
  benefits from the shared presentation.

## Tests Required

Implemented and passed for this slice:

- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This is additive presentation behavior. Raw host event JSON is unchanged from
the prior authorization slice, and no Host API behavior changes in this slice.

## Risks And Mitigations

- Risk: the shared helper name is runtime-trace-oriented even though the event
  is a security audit event.
  Mitigation: CLI summary mode already routes all host event summaries through
  that helper. This slice improves existing behavior without broadening the
  helper API surface during the current completion pass.

## Open Questions

- Should host-client eventually expose a more general `describeHostEvent`
  helper and leave `describeRuntimeTraceEvent` as a compatibility alias?
