# Migration From Local Assumptions Plan

## Current Repo Truth

Local assumptions are intentional and deep:

- product/state marker `"entangle-local"`;
- `runtimeProfileSchema = z.enum(["local"])`;
- Host-managed `.entangle/host` and `.entangle-secrets`;
- one injected `effective-runtime-context.json`;
- `RuntimeBackend` as memory or Docker;
- Docker socket mounted into Host;
- shared Host/runner state and secret volumes;
- Host file reads from runner `runtimeRoot`;
- Host approval and cancellation writes into runner runtime state;
- Local CLI backup/restore/repair/doctor;
- Local smokes based on Compose service reachability and shared Docker runner
  image.

These assumptions are valid for the local adapter but invalid as canonical
architecture.

## Target Model

Migration rule:

Local remains a supported adapter. Federated protocol becomes canonical.

Classify every local assumption as:

- valid local adapter/debug usage;
- legacy docs needing update;
- invalid local-only assumption;
- test fixture;
- migration compatibility.

Do not blindly remove local functionality. Move it behind local profile
boundaries and keep distributed semantics independent.

## Impacted Modules/Files

- `README.md`
- `references/README.md`
- Local-era references `174`, `177`, `178`, `180`, `189`, `190`, `207`, and
  deploy/profile docs
- `wiki/overview.md`
- `packages/types/src/common/topology.ts`
- `packages/types/src/host-api/status.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/runtime/runtime-context.ts`
- `packages/types/src/runtime/runtime-state.ts`
- `services/host/src/state.ts`
- `services/host/src/runtime-backend.ts`
- `services/runner/src/index.ts`
- `deploy/local/**`
- `scripts/*.mjs`
- tests and examples with `runtimeProfile: "local"`

## Concrete Changes Required

- Add new runtime/deployment profile values without breaking local fixtures.
- Rename state layout product to Entangle for new state while accepting old
  `"entangle-local"` markers.
- Split effective runtime context:
  - semantic assignment context;
  - local materialized workspace layout;
  - debug/local context path.
- Move `contextPath` and `runtimeRoot` out of canonical Host API responses.
- Replace Host local file observation with ProjectionStore.
- Change direct Host writes for approval/cancellation to signed control/user
  events.
- Reframe docs from Entangle Local product to Entangle local profile.
- Keep `entangle local` commands for profile support.
- Add distributed smoke scripts instead of extending only local smokes.

## Audit Search Classification

The pivot audit searched for:

```sh
rg "Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker" .
```

Classified results:

- Valid local adapter/debug usage:
  - `deploy/local/**`;
  - `scripts/check-local-profile.mjs`;
  - `scripts/smoke-local-*.mjs`;
  - `scripts/local-preview-demo.mjs`;
  - `apps/cli/src/local-*.ts`;
  - Docker Engine client and local launcher code while it remains a local
    adapter.
- Legacy docs needing update:
  - `README.md` Local scope/product-line sections;
  - `deploy/README.md` product wording;
  - `resources/README.md` Entangle Local wording around `strfry`;
  - Local-era roadmap docs such as `174`, `177`, `178`, `180`, and `189`;
  - `wiki/overview.md` Local status sections, now partially updated by the
    pivot pack.
- Invalid local-only assumptions for the target architecture:
  - `packages/types/src/common/topology.ts` only allowing runtime profile
    `"local"`;
  - `packages/types/src/host-api/status.ts` requiring product
    `"entangle-local"`;
  - Host API contracts exposing `contextPath`;
  - runtime state contracts exposing `runtimeContextPath`;
  - Host state code reading `context.workspace.runtimeRoot` for canonical
    projection;
  - Host session launch using an ephemeral user key;
  - Host approval decisions writing local approval records directly;
  - runner bootstrap requiring `effective-runtime-context.json`.
- Test fixtures:
  - `runtimeProfile: "local"` in package, Host-client, CLI, Studio, runner, and
    smoke tests;
  - `"entangle-local"` layout/product fixtures;
  - local Gitea remote names such as `entangle-local-gitea`.
- Migration compatibility:
  - Local backup/restore bundle names;
  - old state layout markers;
  - old runtime context paths while compatibility importers exist;
  - historical slice docs that must remain accurate records of what was built.

## Tests Required

- Compatibility parse tests for old and new state layout markers.
- Runtime profile schema tests.
- Host API tests that omit local paths in federated responses.
- Local adapter tests proving Docker profile still works.
- Search/audit gate for local-only terms.
- Distributed smoke with separate Host and runner roots.

## Migration/Compatibility Notes

Recommended compatibility staging:

1. Add new contracts and new APIs.
2. Keep local APIs operational.
3. Add projection-backed APIs.
4. Change Studio/CLI to consume projection APIs.
5. Keep old local file reads only for debug/migration.
6. Rename public docs.
7. Remove or hide legacy local-only APIs before first public release.

## Risks And Mitigations

- Risk: removing local paths too early breaks useful inspection.
  Mitigation: add projection parity before deleting readers.
- Risk: old tests lock in local-only names.
  Mitigation: update fixtures intentionally and leave compatibility tests.
- Risk: distributed profile breaks local demo.
  Mitigation: local adapter smoke remains required.

## Open Questions

- How long should pre-federation local state be readable after the pivot? Since
  the project is pre-release, one migration window is likely enough.
