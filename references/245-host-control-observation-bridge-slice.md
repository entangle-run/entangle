# Host Control Observation Bridge Slice

## Current Repo Truth

Before this slice, Entangle had signed control/observe event contracts and
Nostr fabric helpers, plus Host state reducers for runner hello, heartbeat,
assignment acceptance/rejection, and artifact/source/wiki refs. The missing
piece was a small Host-side bridge that connected those parts: observation
events could be reduced manually in tests, but there was no reusable service
that could subscribe to runner observations, acknowledge runner hello events,
or publish assignment control payloads.

## Target Model

Host should process runner observations through one federated intake boundary:

- signed `runner.hello` records or refreshes runner registration;
- Host replies with signed `runner.hello.ack`;
- signed `runner.heartbeat` updates liveness/projection;
- signed assignment observations update assignment state;
- signed artifact/source/wiki refs update projection records;
- Host publishes assignment offer/revoke control events through the same
  transport abstraction used by the Nostr fabric.

This still does not make the runtime fully distributed. The remaining gap is
runner-side assignment materialization and wiring this bridge into the long
running Host process with relay configuration.

## Impacted Modules/Files

- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/245-host-control-observation-bridge-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `HostFederatedControlPlane`;
- added a reusable observation handler for signed observe events;
- mapped `runner.hello` to `recordRunnerHello` plus optional
  `runner.hello.ack` control publication;
- mapped `runner.heartbeat` to Host runner heartbeat state;
- mapped assignment accepted/rejected observations to assignment state;
- mapped artifact/source/wiki refs to projection reducers;
- added assignment offer/revoke control publishing helpers;
- added tests proving signed observation intake updates Host projection and
  control payload publication signs as Host Authority.

Deferred:

- start the bridge automatically inside the Host service;
- derive relay URLs for control publishing from runner registration or active
  graph/resource context instead of caller-supplied relay URLs;
- implement the runner assignment materializer that turns an accepted
  assignment into node-local runtime execution without Host-shared filesystem
  context;
- replace old runtimeRoot-backed Host APIs with projection-backed surfaces.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/federated-control-plane.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `git diff --check`

Verification record:

- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host test -- src/federated-control-plane.test.ts`
  passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm typecheck` passed;
- `git diff --check` passed;
- no-hit search for the old product marker, old preview id/name, and local
  runtime profile values passed.

## Migration/Compatibility Notes

This slice is additive. It does not change existing same-machine Docker
execution and does not remove local context paths. It creates the Host-side
service boundary needed to make the same-machine adapter and remote runners use
the same signed control/observe protocol.

## Risks And Mitigations

- Risk: the bridge is mistaken for complete Host-runner federation.
  Mitigation: this record names the remaining startup wiring and materializer
  gaps explicitly.
- Risk: Host acknowledges untrusted runners as trusted.
  Mitigation: `runner.hello.ack` uses the trust state recorded in the Host
  runner registry.
- Risk: relay selection remains ad hoc.
  Mitigation: keep relay URLs explicit on the bridge for this slice and defer
  Host policy-based relay selection to the process wiring slice.

## Open Questions

No open question blocks this slice. The next implementation step should wire
the bridge into Host startup or implement the runner materializer, depending on
whether transport proof or execution proof is more urgent.
