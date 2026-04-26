# L2 Federated Workbench

Status: released.

Release date: 2026-04-25.

Tag: `v0.2-local-workbench`.

Product line: Entangle.

Production claim: none.

## Release Summary

L2 turns Entangle from an operator baseline into a practical local
workbench. A technical operator can inspect package state, compare and move
graph JSON through the host boundary, launch local sessions, inspect runtime
sessions, turns, approvals, artifacts, and memory, and use Studio for the same
core local operator views.

Included:

- package inspection through `entangle package inspect`;
- package validation that parses and validates `manifest.runtime.toolsPath`;
- root-relative path handling when the CLI is run through
  `pnpm --filter @entangle/cli dev`;
- offline graph diffing through `entangle graph diff`;
- graph template listing and export through `entangle graph templates list`
  and `entangle graph templates export federated-preview <file>`;
- host graph JSON import/export through
  `entangle host graph export <file>` and
  `entangle host graph import <file>`, with import validation before apply;
- headless local session launch through `POST /v1/sessions/launch` and
  `entangle host sessions launch`, using host-resolved runtime context and the
  local NIP-59 relay path;
- optional `entangle host sessions launch --wait` polling through host session
  inspection until completion, failure, cancellation, recorded session timeout,
  waiting approval, or the CLI wait deadline;
- Studio selected-runtime session launch through the same host launch API;
- shared graph diff implementation in `packages/host-client`, reused by CLI
  and Studio;
- Studio selected-revision `Diff Against Active` view for persisted graph
  revisions;
- Studio active-graph validation through the host validation API;
- artifact list filtering by `--session-id`;
- bounded local report-artifact preview through
  `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/preview`,
  `entangle host runtimes artifact <nodeId> <artifactId> --preview`, and the
  Studio selected-artifact detail panel;
- runtime memory inspection through
  `GET /v1/runtimes/{nodeId}/memory`,
  `GET /v1/runtimes/{nodeId}/memory/page?path=...`,
  `entangle host runtimes memory <nodeId>`, and
  `entangle host runtimes memory-page <nodeId> <path>`;
- Studio Runtime Memory view for focused summary registers, task pages,
  supporting wiki pages, and bounded memory-page preview.

Excluded:

- Local GA;
- Cloud or Enterprise implementation;
- production tenancy, authorization, compliance, remote federation, or managed
  service claims;
- graph bundle archives, graph rollback, revision restore, or host-owned graph
  diff API;
- report artifact history/diff workflow;
- relay-publish retry after a failed session launch request;
- package import/export archives;
- productized doctor, repair, backup, restore, or upgrade tooling;
- autonomous coding-agent runtime, PR flow, memory-as-repo redesign, or new
  coding builtin tools.

## Operator Commands

From the repository root:

```bash
pnpm --filter @entangle/cli dev package inspect examples/federated-preview/agent-package
pnpm --filter @entangle/cli dev graph diff examples/federated-preview/graph.json examples/federated-preview/graph.json
pnpm --filter @entangle/cli dev host graph import examples/federated-preview/graph.json --dry-run
pnpm --filter @entangle/cli dev host graph export /tmp/entangle-active-graph.json
pnpm --filter @entangle/cli dev host sessions launch federated-preview-planner "Prepare a federated workbench report." --wait
pnpm --filter @entangle/cli dev host runtimes artifacts federated-preview-planner --session-id <session-id> --summary
pnpm --filter @entangle/cli dev host runtimes artifact federated-preview-planner <artifact-id> --preview
pnpm --filter @entangle/cli dev host runtimes memory federated-preview-planner --summary
pnpm --filter @entangle/cli dev host runtimes memory-page federated-preview-planner wiki/summaries/working-context.md --summary
```

`host sessions launch` requires a running local host, a realizable target
runtime context, and a reachable configured relay. The CLI calls
`POST /v1/sessions/launch`; the host publishes a local `task.request`; session
completion still depends on the runner and model profile state. With `--wait`,
the CLI polls host session inspection and exits non-zero if the wait deadline
expires or the inspected session reaches `failed`, `cancelled`, or
`timed_out`.

Runtime memory inspection is read-only. It lists and previews files already
owned by the runner under the node runtime memory workspace; it does not make
memory shared, git-backed, editable, or globally searchable.

## Verification Evidence

The final L2 release batch was verified on 2026-04-25 with Docker daemon
access.

Commands and results:

```bash
pnpm install --frozen-lockfile
pnpm --filter @entangle/types test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/cli dev host runtimes memory --help
pnpm --filter @entangle/cli dev host runtimes memory-page --help
git diff --check
pnpm verify
pnpm build
pnpm ops:check-federated-dev:strict
pnpm ops:smoke-federated-dev:disposable --skip-build --keep-running
pnpm ops:smoke-federated-dev
docker compose -f deploy/federated-dev/compose/docker-compose.federated-dev.yml down --volumes
```

All listed commands passed. `pnpm verify` includes `pnpm lint`,
`pnpm typecheck`, and `pnpm test`. `pnpm build` completed with the existing
Vite chunk-size warning for Studio.

The final Docker-backed gate reused the Federated dev Compose profile and verified
host, Studio, Gitea, and `strfry` readiness plus active local smoke. The
kept-running profile was torn down with volumes after verification.

## Known Limitations

- This packet is not a Local GA release packet and must not be used as a
  production readiness claim.
- Session launch can wait by polling host session inspection, but it does not
  retry failed relay publication.
- Graph diff is available in CLI and Studio, Studio can validate the active
  graph through the host API, and the CLI has single-file host graph
  import/export. No host-owned graph diff API, graph bundle format, rollback,
  or revision restore flow exists.
- Graph templates can be exported from the CLI, but there is no graph template
  editor or host-owned template registry.
- Package inspection validates the manifest and tool catalog, but package
  import/export archives are not included.
- Artifact session filtering and bounded local text preview help navigation,
  but report artifact history/diff is not included.
- Runtime memory inspection is read-only and path-bounded to existing runner
  memory files. It is not memory-as-repo, memory editing, memory search, or a
  shared organizational memory service.
- Reset remains Compose-volume teardown; doctor, repair, backup, restore, and
  upgrade workflows are deferred.
- Autonomous coding-agent runtime work is deferred pending roadmap review.
