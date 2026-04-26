# Host Startup Control Plane Wiring Slice

## Current Repo Truth

The Host had a tested `HostFederatedControlPlane` and an in-memory federated
smoke, but normal Host startup did not create that bridge. Assignment API
mutations persisted desired assignment state but did not publish the signed
`runtime.assignment.offer` or `runtime.assignment.revoke` control payloads that
runners subscribe to.

## Target Model

Host startup must attach the same federated protocol path used by tests and
smokes:

- Host loads its Host Authority key;
- Host resolves relay URLs from the deployment resource catalog defaults;
- Host subscribes to runner observation events addressed to the Host Authority;
- assignment offer and revoke API mutations publish signed control events when
  the federated bridge is active;
- shutting down Host closes the federated subscription and transport.

The same path applies when the relay and runners happen to be on the same
machine. The code does not infer behavior from process or filesystem colocation.

## Impacted Modules/Files

- `services/host/src/host-federated-runtime.ts`
- `services/host/src/index.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/247-host-startup-control-plane-wiring-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added Host federated runtime startup helper;
- resolved Host control/observe relay URLs from catalog default relay profiles;
- started observation intake from Host Authority material and catalog relays;
- attached the federated runtime lifecycle to `startHostServer`;
- injected the active control plane into Host assignment routes;
- published assignment offer and revoke control events from Host API mutations;
- added tests for startup relay resolution, observation subscription, and
  assignment route publication.

Deferred:

- transport health in Host status/projection;
- retry/backoff when relay startup fails;
- publishing trust/revoke runner control events from runner trust routes;
- live relay process smoke for Host startup rather than in-memory transport;
- runner materialization of Host-signed graph/package/resource snapshots.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/federated-control-plane.test.ts src/index.test.ts`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `git diff --check`
- stale product marker and path search for removed same-product naming markers.

Verification record:

- targeted Host typecheck passed;
- targeted Host tests passed with 76 tests across the Host suite;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm typecheck` passed;
- `pnpm lint` passed;
- `pnpm test` passed;
- `git diff --check` passed;
- stale product marker and path searches for removed same-product naming and
  runtime profile defaults returned no hits.

## Migration/Compatibility Notes

`buildHostServer` remains usable without an injected federated control plane, so
unit tests and host-only API embedding can still construct the Fastify server.
`startHostServer` now attempts to start the federated control plane from Host
state and catalog defaults. If relay subscription startup fails, the Host API
still starts, but the federated bridge is absent until a later retry mechanism is
added.

## Risks And Mitigations

- Risk: relay startup failure leaves API assignments persisted but unpublished.
  Mitigation: startup logs the failure and the next slice should add projection
  health plus retry/backoff.
- Risk: assignment route publication can fail after assignment state is
  persisted.
  Mitigation: current behavior fails the API response on publication error; a
  later outbox/retry store should make delivery durable.
- Risk: catalog default relay selection may be too coarse for multi-relay
  deployments.
  Mitigation: v1 uses catalog defaults consistently; policy-based per-runner or
  per-edge relay selection remains explicit follow-up.

## Open Questions

No product question blocks this slice. The next implementation choice is whether
to add a durable Host control outbox before or after the live relay smoke.
