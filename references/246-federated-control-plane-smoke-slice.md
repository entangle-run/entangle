# Federated Control Plane Smoke Slice

## Current Repo Truth

The Host control observation bridge can ingest signed runner observations and
publish signed control events, but the repository did not yet have an
operator-facing smoke that proves this path with Host and runner state in
separate filesystem roots. Existing Docker smokes still exercise the
same-machine deployment adapter and can pass while Host and runner share local
state volumes.

## Target Model

The first federated smoke should prove protocol shape, not deployment
colocation:

- Host state root and runner root are separate directories;
- runner starts from `RunnerJoinConfig`;
- runner sends signed `runner.hello`;
- Host records the registration and publishes signed `runner.hello.ack`;
- Host trusts the runner and creates an assignment;
- Host publishes signed `runtime.assignment.offer`;
- runner materializes the assignment inside runner-owned storage;
- runner sends signed `assignment.accepted`;
- Host projection records assignment state from an observation event.

This is an in-memory transport smoke. It intentionally avoids requiring a live
relay while still exercising the same control/observe payloads and service
boundaries.

## Impacted Modules/Files

- `services/host/scripts/federated-control-plane-smoke.ts`
- `scripts/smoke-federated-control-plane.mjs`
- `package.json`
- `references/221-federated-runtime-redesign-index.md`
- `references/246-federated-control-plane-smoke-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `pnpm ops:smoke-federated-control`;
- added a root wrapper script that runs the smoke in the Host package context;
- added an in-memory control/observe bus that signs control events as Host
  Authority and observation events as the runner;
- created separate Host and runner temp roots and asserted neither is nested in
  the other;
- started a generic runner join service from `runner-join.json`;
- materialized accepted assignments into runner-owned storage;
- verified Host projection source is `observation_event`.

Deferred:

- live relay smoke against `strfry` or another reachable relay;
- remote-process runner materializer that fetches Host-signed graph/resource
  snapshots;
- same-machine Docker adapter defaulting to join/control path.

## Tests Required

- `pnpm --filter @entangle/host exec tsc --noEmit --ignoreConfig --allowImportingTsExtensions --module NodeNext --moduleResolution NodeNext --target ES2022 --skipLibCheck scripts/federated-control-plane-smoke.ts`
- `node --check scripts/smoke-federated-control-plane.mjs`
- `pnpm ops:smoke-federated-control`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `git diff --check`

Verification record:

- smoke script typecheck passed;
- wrapper syntax check passed;
- `pnpm ops:smoke-federated-control` passed and reported graph, runner hello,
  accepted assignment, and filesystem isolation;
- `pnpm --filter @entangle/host typecheck` passed;
- `pnpm --filter @entangle/host test` passed;
- `pnpm --filter @entangle/host lint` passed;
- `pnpm typecheck` passed;
- `pnpm lint` passed;
- `pnpm test` passed;
- `git diff --check` passed;
- stale product marker and path searches for `entangle-local`, `Entangle
  Local`, `local-preview`, and `runtimeProfile` local defaults returned no
  hits.

## Migration/Compatibility Notes

This smoke is additive. It does not replace the Docker same-machine smoke. It
creates a faster gate for the federated control/observe semantics that the
Docker adapter must eventually use internally.

## Risks And Mitigations

- Risk: in-memory transport hides relay integration bugs.
  Mitigation: this is the first protocol smoke; a live-relay smoke remains a
  required later gate.
- Risk: materialization is too small to represent real execution.
  Mitigation: the smoke proves assignment ownership and runner-local storage
  only; full graph/package/resource materialization remains explicit follow-up.
- Risk: Host and runner still accidentally share filesystem state.
  Mitigation: the smoke asserts separate Host and runner roots.

## Open Questions

No open question blocks this slice. The next smoke should replace the in-memory
bus with a live local relay while keeping the same no-shared-filesystem
assertion.
