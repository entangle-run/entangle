# Migration From Local Assumptions Plan

## Current Repo Truth

The repo still has local deployment assumptions in implementation:

- Host-managed `.entangle/host` and `.entangle-secrets`;
- one injected `effective-runtime-context.json`;
- `RuntimeBackend` as memory or Docker launcher;
- Docker socket mounted into Host for the current single-machine adapter;
- shared Host/runner state and secret volumes still exist for direct
  runtime-context compatibility, but Docker join mode can now deliver inline
  join config JSON and avoid mounting Host volumes into managed runner
  containers;
- Host file reads from runner `runtimeRoot`;
- Host approval and cancellation writes into runner runtime state;
- local deployment CLI backup/restore/repair/doctor;
- local smokes based on Compose service reachability and Docker runner image.

The product/state marker is now only `"entangle"`, and the graph/runtime
profile is now `"federated"`. There is no separate local product identity and
no local runtime profile.

## Target Model

Single-machine execution is one federated deployment topology. It may use local
relay and git endpoints, but Host and runners should still communicate through
the same signed control, observe, and A2A protocol paths used by remote
deployments.

Classify every local assumption as:

- valid deployment adapter/debug usage;
- invalid canonical runtime assumption;
- test fixture;
- current implementation gap.

Do not preserve old local-only semantics. Remove them or put them behind a
deployment adapter while keeping distributed semantics independent.

## Impacted Modules/Files

- `README.md`
- `references/README.md`
- current pivot references `221` through `244`
- `wiki/overview.md`
- `packages/types/src/common/topology.ts`
- `packages/types/src/host-api/status.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/runtime/runtime-context.ts`
- `packages/types/src/runtime/runtime-state.ts`
- `services/host/src/state.ts`
- `services/host/src/runtime-backend.ts`
- `services/runner/src/index.ts`
- `deploy/federated-dev/**`
- `scripts/*.mjs`
- tests and examples with `runtimeProfile: "federated"`

## Concrete Changes Required

- Keep runtime/deployment profile values federated.
- Keep state layout product marker Entangle-only.
- Split effective runtime context:
  - semantic assignment context;
  - materialized workspace layout;
  - debug-only local context path.
- Keep `contextPath` and `runtimeRoot` out of canonical Host API responses.
- Replace Host local file observation with ProjectionStore.
- Change direct Host writes for approval/cancellation to signed control/user
  events.
- Keep same-machine Docker/process launchers as deployment adapters only.
- Add distributed smoke scripts that can run with separate Host and runner
  roots even when processes are on the same workstation.
- Use portable bootstrap bundles for joined runner package/memory
  materialization instead of making runners consume Host-local workspace paths.

## Audit Search Classification

The pivot audit should search for local-only assumptions without reintroducing
old product markers:

```sh
rg "runtimeProfile.*single-machine|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker" .
```

Classified results:

- Valid deployment adapter/debug usage:
  - `deploy/federated-dev/**`;
  - `scripts/check-federated-dev-profile.mjs`;
  - `scripts/smoke-local-*.mjs`;
  - `scripts/federated-preview-demo.mjs`;
  - `apps/cli/src/local-*.ts`;
  - Docker Engine client and local launcher code while it remains an adapter.
- Invalid local-only assumptions for the target architecture:
  - Host API contracts exposing `contextPath` in public runtime inspection:
    fixed by
    [255-public-runtime-api-path-boundary-slice.md](255-public-runtime-api-path-boundary-slice.md).
  - Host-internal process state and explicit context inspection/debug routes
    still carry `contextPath`.
  - runtime state contracts exposing `runtimeContextPath`;
  - Host state code reading `context.workspace.runtimeRoot` for canonical
    projection;
  - Host approval decisions writing local approval records directly;
  - runner bootstrap requiring `effective-runtime-context.json` for canonical
    startup.
  - Docker managed runners needing Host volume access for join config delivery:
    fixed for join mode by
    [317-docker-join-config-env-slice.md](317-docker-join-config-env-slice.md).
  - runner Host API bootstrap that copies directly from Host-local context
    paths: fixed for default joined runners by
    [256-portable-runtime-bootstrap-bundle-slice.md](256-portable-runtime-bootstrap-bundle-slice.md).
- Test fixtures:
  - local relay/git endpoints;
  - Docker-backed deployment adapter fixtures;
  - same-machine smoke configuration.

## Tests Required

- Runtime profile schema tests proving `"federated"` is canonical.
- Host API tests that omit local paths in federated responses.
- Local adapter tests proving Docker/process deployment still works as an
  adapter.
- Search/audit gate for local-only terms.
- Distributed smoke with separate Host and runner roots.

## Migration Notes

This branch is pre-release. Old local-product state should be regenerated, not
preserved.

## Risks And Mitigations

- Risk: removing local paths too early breaks useful inspection.
  Mitigation: add projection parity before deleting readers.
- Risk: same-machine smoke accidentally proves only shared filesystem behavior.
  Mitigation: assert separate Host and runner roots and use signed events for
  projection.
- Risk: old tests lock in local-only names.
  Mitigation: update fixtures intentionally and keep search gates.

## Open Questions

No open question blocks the pivot. The next implementation work should make the
single-machine smoke use the federated protocol path even when services are all
on one machine.
