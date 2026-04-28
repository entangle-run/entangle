# Federated Lifecycle Process Smoke Slice

## Current Repo Truth

The process-runner smoke already proved runner registration, assignment offer,
runner-owned materialization, agent runtime start, User Node Human Interface
Runtime start, User Client publishing, signed User Node messages, projected
turn/source/approval/session reads, source-change review, git backend setup,
and filesystem isolation.

After the runtime lifecycle control slice, Host and runner had unit coverage
for signed start/stop/restart control commands, but the process smoke did not
yet prove that those commands travel end-to-end through the live relay to a real
joined runner and back to Host projection.

## Target Model

The smoke should prove that an accepted federated assignment can be controlled
without shared filesystem access:

- Host accepts an operator lifecycle request;
- Host publishes a signed `entangle.control.v1` lifecycle command;
- the joined runner receives the command over the relay;
- the runner stops/starts/restarts the node-local runtime handle;
- the runner emits signed receipts and `runtime.status` observations;
- Host projection reflects the new runtime state.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added a reusable smoke helper that waits for a runtime projection state for a
  specific assignment/node pair;
- extended the process-runner smoke after initial agent assignment start to
  call Host runtime `stop`, `start`, and `restart` routes;
- verified the immediate Host runtime inspection response remains
  `backendKind: "federated"`;
- waited for projected runner observations for stopped/running lifecycle state;
- checked restart generation increments before continuing to User Node and
  source-review scenarios.

## Tests Required

Verification run:

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

The smoke now prints:

- `PASS runtime-lifecycle-stop`
- `PASS runtime-lifecycle-start`
- `PASS runtime-lifecycle-restart`

## Migration/Compatibility Notes

No compatibility behavior is added. This is a proof upgrade for the federated
path. Same-machine local adapter behavior remains covered by existing local
runtime tests and Docker adapter tests.

## Risks And Mitigations

- Risk: restart projection could pass against stale pre-command `running`
  state. Mitigation: the smoke records the previous `lastSeenAt` and waits for
  a later running observation after the restart command.
- Risk: lifecycle exercise could destabilize later User Node message intake.
  Mitigation: the smoke runs lifecycle control before User Node publish and
  then continues through the existing full projected turn/source/review path.

## Open Questions

- The process smoke proves same-machine multi-process relay behavior. A future
  distributed smoke should run Host, agent runner, User Node runner, relay, and
  git backend across separate hosts or network namespaces.
