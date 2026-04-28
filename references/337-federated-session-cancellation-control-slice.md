# Federated Session Cancellation Control Slice

## Current Repo Truth

Before this slice, Host session cancellation routes created
`SessionCancellationRequestRecord` files under the target runtime's
`runtimeRoot/session-cancellations` directory. That was usable only when Host
could write the runner filesystem. Joined runners already had a signed
Host-to-runner control fabric for assignment and runtime lifecycle commands,
but session cancellation had not moved onto that fabric.

RunnerService could observe cancellation files and abort active OpenCode turns,
but the command delivery path was still local-filesystem based.

## Target Model

Session cancellation is a Host Authority control command to the assigned
runner. Host signs and publishes `runtime.session.cancel`; the generic runner
delivers it to the running node runtime; RunnerService persists the request in
runner-owned state, aborts active turns when needed, and emits the existing
session/turn observations.

The legacy Host-write path remains only as fallback when no accepted federated
assignment/control transport is available.

## Impacted Modules/Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/state.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`

## Concrete Changes Required

- Add a signed `runtime.session.cancel` control payload carrying the concrete
  cancellation request record.
- Add Host control-plane publishing for session cancellation commands.
- Make Host cancellation routes prefer accepted federated assignments and
  publish over the control fabric before falling back to local compatibility.
- Let the generic runner forward cancellation commands into the running
  assignment runtime.
- Let `RunnerService` accept a cancellation request directly, persist it under
  runner-owned state, apply it immediately, and publish session observations
  for idle-session cancellation.
- Preserve existing CLI/Studio/host-client session cancellation surfaces while
  changing their remote delivery behavior.

## Tests Required

- Contract test for the new control payload.
- Host federated-control-plane test for signed cancellation command publishing.
- Host API test proving accepted assignments publish cancellation over control
  instead of requiring Host filesystem writes.
- Runner join-service test proving cancellation commands are delivered to the
  runtime handle.
- Runner/Host typecheck and lint.
- Federated process smoke to ensure existing session and User Node flows still
  pass.

## Verification Run

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/host test -- src/index.test.ts src/federated-control-plane.test.ts`
- `pnpm --filter @entangle/runner test -- src/index.test.ts src/service.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

The added-line local-assumption audit found:

- one `runtimeRoot` line in
  `references/220-external-session-cancellation-slice.md`, valid historical
  documentation now marked superseded;
- one `runtimeRoot` line in `services/runner/src/service.ts`, valid
  runner-owned local state usage where the runner resolves its own state root
  before persisting and applying a received cancellation command.

## Migration/Compatibility Notes

This is backward compatible at the public API level: existing session cancel
routes and client methods remain. The behavior changes only when an accepted
federated assignment and control relay are available.

The filesystem cancellation fallback should be treated as compatibility for
non-joined local/debug runtimes, not as the primary architecture.

## Risks And Mitigations

- Risk: cancellation commands could be accepted by Host but not applied by a
  stopped runner. Mitigation: the generic runner emits assignment receipts for
  received/failed command handling, and Host projection already exposes receipt
  evidence.
- Risk: aggregate session cancellation has mixed federated and fallback
  targets. Mitigation: Host resolves each target node independently and returns
  the concrete cancellation records actually requested.
- Risk: a Human Interface Runtime receives a session cancellation command.
  Mitigation: runtimes without a cancellation handler return a failed receipt;
  agent runtimes expose the handler.

## Open Questions

- Add a dedicated observation event for command-level cancellation applied /
  failed outcomes instead of relying on assignment receipts plus
  `session.updated`.
- Decide whether stopped assigned runtimes should queue cancellation commands
  for later startup or always fail them immediately.
