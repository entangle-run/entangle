# Federated Runtime Lifecycle Control Slice

## Current Repo Truth

Before this slice, assignment offer/revoke already moved through signed
`entangle.control.v1` events, and joined runners could start assigned node
runtimes from runner-owned materialized context. Runtime start, stop, and
restart routes on Host still primarily mutated Host-local runtime intent and
used the local `RuntimeBackend` reconciliation path. That made operator
lifecycle controls work for same-machine adapters but did not command an
accepted federated runner.

Host synchronization also still reconciled active graph runtime nodes through
the process-local backend even when a node had an accepted assignment. That
could overwrite a runner-signed federated runtime observation with a local
memory/Docker observation during a regular runtime inspection pass.

## Target Model

When a node has an accepted or active runtime assignment, Host runtime lifecycle
routes are operator requests against the Host control plane. Host records the
desired intent and publishes signed lifecycle control commands to the assigned
runner over the same federated control event fabric used for assignments.

The assigned runner owns process lifecycle for that node. It receives
`runtime.start`, `runtime.stop`, or `runtime.restart`, starts or stops its
runner-local runtime handle, and reports state back through signed
`runtime.status` observations and assignment receipts.

Host must not reconcile an assigned federated runtime through the local backend.
The local Docker/memory backend remains only the adapter path for unassigned
same-machine runtime profiles.

## Impacted Modules/Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/state.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `runtime.start` to the typed control protocol alongside existing
  `runtime.stop` and `runtime.restart`;
- added Host control-plane publishing helpers for signed runtime start, stop,
  and restart commands;
- taught Host runtime lifecycle routes to select accepted/active assignments
  and publish lifecycle commands to the assigned runner;
- taught the runner join service to handle lifecycle commands for accepted
  assignments, preserve materialized runtime context paths, restart handles,
  emit receipts, and publish `runtime.status` observations;
- changed Host runtime synchronization so nodes with accepted/offered/active
  assignments are represented as `federated` runtimes and are not reconciled
  through the local backend;
- removed stale local observed runtime records when a federated assignment takes
  ownership of the node.

## Tests Required

Covered by targeted tests:

- `packages/types/src/index.test.ts` validates typed signed lifecycle control
  commands;
- `services/host/src/federated-control-plane.test.ts` validates Host-signed
  runtime start/stop/restart payloads;
- `services/host/src/index.test.ts` validates runtime lifecycle routes publish
  commands for accepted federated assignments and return federated runtime
  inspection;
- `services/runner/src/index.test.ts` validates runner handling of stop, start,
  and restart lifecycle commands for an accepted assignment.

Verification commands run for this slice:

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/host test -- src/federated-control-plane.test.ts src/index.test.ts`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

## Migration/Compatibility Notes

This is a breaking architectural tightening, not a compatibility layer. Runtime
nodes with accepted or active assignments are now treated as federated runtime
ownership boundaries. Host will not also reconcile them through Docker or the
memory backend.

Unassigned runtime nodes still use the local backend adapter. That path remains
valid for development and for same-machine profiles that have not assigned the
node to a joined runner.

## Risks And Mitigations

- Risk: Host runtime inspection now returns `backendKind: "federated"` for
  assigned nodes even before the runner publishes its first status observation.
  Mitigation: the inspection reports `observedState: "missing"` and a bounded
  status message until the runner observation arrives.
- Risk: lifecycle command delivery depends on configured control relay URLs and
  an active control publisher. Mitigation: tests cover publish payloads and
  route selection; the local backend remains fallback only when no federated
  assignment publisher is available.
- Risk: restart after stop requires the runner to remember the materialized
  runtime context path. Mitigation: the join service now keeps per-assignment
  context paths until revoke/service shutdown.

## Open Questions

- Should lifecycle commands eventually become assignment-scoped APIs rather
  than `runtimes/:nodeId` APIs to make runner ownership explicit at the HTTP
  boundary?
- Should Host persist lifecycle command records and delivery receipts as a
  first-class command ledger beyond current event/projection traces?
