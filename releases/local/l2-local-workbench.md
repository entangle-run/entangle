# L2 Local Workbench

Status: active implementation.

Target tag: `v0.2-local-workbench`.

Product line: Entangle Local.

Production claim: none.

## Scope Freeze

L2 is the Local Workbench milestone. Its release bar is that a technical
operator can create or import package state, inspect and change graph state,
launch a local task session, inspect the resulting work, and export or compare
graph/package state without requiring production tenancy.

Included in the current implementation slice:

- package inspection through `entangle package inspect`;
- package validation now parses and validates `manifest.runtime.toolsPath`;
- root-relative path handling when the CLI is run through
  `pnpm --filter @entangle/cli dev`;
- offline graph diffing through `entangle graph diff`;
- headless local session launch through `POST /v1/sessions/launch` and
  `entangle host sessions launch`, using host-resolved runtime context and the
  local NIP-59 relay path;
- Studio selected-runtime session launch through the same host launch API,
  with host-owned runtime context and relay publication;
- artifact list filtering by `--session-id`.

Still required before the L2 release tag:

- Studio workbench affordances for graph validation or diff;
- graph template or import/export workflow beyond direct graph JSON apply/get;
- artifact preview/history for report artifacts;
- memory workbench inspection for focused registers and task pages;
- full local verification gate, including Docker-backed smokes, on the final
  L2 release candidate.

Excluded:

- Local GA;
- Cloud or Enterprise implementation;
- production tenancy, authorization, compliance, remote federation, or managed
  service claims.

## Current Operator Commands

From the repository root:

```bash
pnpm --filter @entangle/cli dev package inspect examples/local-preview/agent-package
pnpm --filter @entangle/cli dev graph diff examples/local-preview/graph.json examples/local-preview/graph.json
pnpm --filter @entangle/cli dev host sessions launch local-preview-planner "Prepare a local workbench report."
pnpm --filter @entangle/cli dev host runtimes artifacts local-preview-planner --session-id <session-id> --summary
```

`host sessions launch` requires a running local host, a realizable target
runtime context, and a reachable configured relay. The CLI calls
`POST /v1/sessions/launch`; the host publishes a local `task.request`; session
completion still depends on the runner and model profile state.

## Verification Evidence

The current implementation slice was verified on 2026-04-25 with:

```bash
pnpm install
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/validator test
pnpm --filter @entangle/validator lint
pnpm --filter @entangle/validator typecheck
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/cli dev package inspect examples/local-preview/agent-package
pnpm --filter @entangle/cli dev graph diff examples/local-preview/graph.json examples/local-preview/graph.json
pnpm --filter @entangle/cli dev validate package examples/local-preview/agent-package
pnpm --filter @entangle/cli dev host sessions launch --help
pnpm verify
pnpm build
pnpm ops:check-local:strict
pnpm ops:smoke-local:disposable --skip-build
pnpm ops:smoke-local:disposable --skip-build --keep-running
pnpm ops:smoke-local
docker compose -f deploy/local/compose/docker-compose.local.yml down --volumes
```

All listed commands passed after the CLI path resolver was corrected to honor
the original shell working directory exposed by `pnpm`. `pnpm build` completed
with the existing Vite chunk-size warning for Studio. The disposable smoke
covered strict preflight, host and Studio image builds, Local Compose startup,
host, Studio, Gitea, and `strfry` readiness, active smoke, and teardown. An
earlier disposable-smoke attempt was interrupted when an unrelated background
Docker maintenance loop restarted Docker Desktop mid-build; after stopping that
loop, the disposable and active smoke commands passed.

This is not the L2 release verification packet. The final L2 candidate still
must pass the repository-level and Docker-backed gates before tagging.

## Known Limitations

- Session launch is now available from CLI and Studio through the host launch
  API, but it does not wait for completion or retry failed relay publication.
- Graph diff is offline JSON diffing; host revision diff and Studio diff views
  are still pending.
- Package inspection validates the manifest and tool catalog, but package
  import/export archives are still pending.
- Artifact session filtering helps navigation, but report preview and history
  are still pending.
