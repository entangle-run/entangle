# Node Workspace Health Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstream B4 by making the node
workspace model explicit and inspectable from the host boundary.

It does not initialize the wiki repository as a git repository yet. That
requires a separate migration and rollback design because existing runner-owned
file-backed memory is already live under `memory/wiki`.

## Source Audit

The B4 audit found that host materialization already creates the current
per-node workspace roots under `.entangle/host/workspaces/<node_id>/`:

- `package`;
- `injected`;
- `memory`;
- `workspace`;
- `runtime`;
- `retrieval`;
- `source`;
- `engine-state`;
- `wiki-repository`.

The audit also found documentation drift in older workspace references that
listed only the pre-L3 roots. Those references now describe the active L3
layout explicitly.

## Implemented Behavior

Runtime inspection now includes a generic `workspaceHealth` object:

- `layoutVersion` identifies the current Local workspace layout contract;
- `status` is `ready` or `degraded`;
- `surfaces` report logical workspace surfaces rather than protocol-facing
  filesystem locators;
- each surface reports required access, readiness, and bounded failure reason.

The host computes health for:

- root;
- package;
- injected context;
- memory;
- artifact workspace;
- runtime state;
- retrieval cache;
- source workspace;
- engine state;
- wiki repository.

When a runtime is desired as running but a required workspace surface is
degraded, host reconciliation returns a failed observed state with bounded
workspace-health evidence instead of blindly launching the backend.

Shared host-client runtime inspection helpers now summarize workspace health,
the CLI inherits the same detail lines, and Studio selected-runtime details
show the same health summary.

The root `pnpm test` script was also hardened to run Turbo test tasks with
`--concurrency=1`. During closure, package-local Studio tests passed on their
own, but the aggregate Turbo test run could leave the Studio Vitest process
open after the other package tests completed. Entangle Local's default gate now
prefers deterministic closure over parallel test speed.

## Boundary Decisions

- Workspace health is reported by logical surface name, not by raw local path.
- `package` is required to be readable, not writable, because it is
  host-managed materialized package content.
- Mutable node surfaces are required to be readable and writable by the host:
  memory, artifact workspace, runtime state, retrieval cache, source workspace,
  engine state, and wiki repository.
- `wiki-repository` remains a reserved workspace root until repository
  ownership, migration, and rollback semantics are implemented.
- Existing runner-owned `memory/wiki` remains the source of truth for memory in
  this slice.

## Remaining B4 Gaps

- Doctor command integration for workspace health.
- Initializing `wiki-repository` as a git repository with safe migration from
  file-backed memory.
- Backup and restore semantics for workspace roots.
- Workspace layout migration/version compatibility checks beyond the first
  layout version marker.

## Verification

Focused verification for this slice covered:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
```

The coherent repository gate also passed:

```bash
git diff --check
pnpm verify
pnpm build
```

`pnpm verify` now uses serialized Turbo test tasks through the root `test`
script. `pnpm build` still reports the known Studio Vite chunk-size warning,
but exits successfully.
