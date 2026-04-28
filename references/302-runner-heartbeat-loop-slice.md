# Runner Heartbeat Loop Slice

## Current Repo Truth

Host already accepts and projects signed `runner.heartbeat` observations through
the federated observe protocol. Before this slice, generic joined runners
published `runner.hello`, assignment receipts, assignment decisions, and runtime
status observations, but they did not keep emitting a periodic liveness signal.

## Target Model

A generic runner that has joined a Host Authority must continue proving
liveness after startup without needing shared filesystem inspection. Heartbeats
are runner-signed observations that carry the runner id, runner pubkey, current
accepted assignment ids, and an operational state derived from runner capacity.

## Impacted Modules/Files

- `services/runner/src/join-service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/225-host-runner-federation-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a configurable periodic heartbeat timer to `RunnerJoinService`.
- Publish `runner.heartbeat` observations through the existing signed observe
  transport path.
- Include accepted assignment ids in heartbeat payloads.
- Derive `operationalState` as `ready` while capacity remains and `busy` when
  accepted assignments reach `maxAssignments`.
- Stop the timer cleanly when the join service stops.
- Thread the heartbeat interval through `createConfiguredRunnerJoinService` and
  `runGenericRunnerUntilSignal` for focused tests and future operator tuning.

## Tests Required

- Runner join service test proving no immediate heartbeat is emitted on start.
- Timer-driven heartbeat test with no assignments.
- Timer-driven heartbeat test after assignment acceptance.
- Stop test proving the timer no longer emits after shutdown.
- Existing runner bootstrap and assignment tests must remain unchanged in event
  order because the heartbeat is periodic, not an immediate extra observation.

## Migration/Compatibility Notes

The default heartbeat interval is thirty seconds. Existing join configs do not
need new fields, and the CLI-generated join config remains valid. This slice
does not change Host contracts because `runner.heartbeat` was already part of
the observe schema and Host reducer path.

## Risks And Mitigations

- Risk: heartbeat publishing failure creates unhandled promise rejections.
  Mitigation: timer callbacks isolate publish failures; Host transport health
  and missing heartbeat projection remain the observable failure path.
- Risk: tests that assert exact event order become flaky.
  Mitigation: no heartbeat is emitted synchronously on start or assignment
  acceptance; focused tests use an injected short interval with fake timers.
- Risk: local launcher assumptions hide remote runner liveness issues.
  Mitigation: heartbeat uses the same observe transport as remote status and
  assignment observations.

## Open Questions

- Resolved by `303-runner-heartbeat-config-smoke-slice.md`: the join config
  now supports optional `heartbeatIntervalMs`, and the CLI can write it through
  `--heartbeat-interval-ms`.
