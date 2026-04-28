# Runner Heartbeat Config Smoke Slice

## Current Repo Truth

Generic joined runners emit signed `runner.heartbeat` observations. The first
implementation used a thirty-second default interval plus an injected test-only
override. That proved the join service behavior, but real process smokes could
not verify heartbeat projection quickly without waiting for the default timer.

## Target Model

Runner liveness cadence should be part of the runner's join configuration, not
a Host filesystem assumption or smoke-only process flag. Operators can keep the
default interval for normal runners, while smokes and constrained deployments
can write a validated `heartbeatIntervalMs` into `runner-join.json`.

## Impacted Modules/Files

- `packages/types/src/federation/runner-join.ts`
- `packages/types/src/index.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/test-fixtures.ts`
- `services/runner/src/index.test.ts`
- `apps/cli/src/runner-join-config-command.ts`
- `apps/cli/src/runner-join-config-command.test.ts`
- `apps/cli/src/index.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/225-host-runner-federation-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `deploy/federated-dev/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `heartbeatIntervalMs` to `runnerJoinConfigSchema`.
- Teach `RunnerJoinService` to prefer an injected interval, then the join
  config interval, then the thirty-second default.
- Let `entangle runners join-config` write `--heartbeat-interval-ms`.
- Include the configured interval in compact join-config summaries.
- Update the process-runner smoke to write one-second heartbeat intervals and
  wait for Host-projected heartbeats from the agent runner and both User Node
  runners.

## Tests Required

- Type schema test proving `heartbeatIntervalMs` parses through a join config.
- CLI helper test proving generated config and summary include the interval.
- Runner join service test proving a config-sourced interval drives heartbeat
  emission.
- Process-runner smoke now covers real runner heartbeat projection when the
  relay-backed smoke is run.

## Migration/Compatibility Notes

The field is optional. Existing runner join configs continue to use the
thirty-second default and do not need migration. The generated config still
contains no secrets and no machine-local workspace paths.

## Risks And Mitigations

- Risk: operators configure an interval that is too aggressive for relay
  capacity. Mitigation: the option is explicit and omitted by default.
- Risk: heartbeat verification slows the smoke. Mitigation: the smoke writes a
  one-second interval into its own temporary join configs.

## Open Questions

- A future Host policy may want min/max runner heartbeat interval guidance, but
  no product decision blocks the current configurable join config field.
