# Artifact History And Diff Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B5 by adding bounded
host-owned history and diff inspection for git-backed runtime artifacts.

The implementation keeps artifacts as the work substrate and keeps the host API
as the inspection boundary. Runners and engines can continue producing artifact
records without exposing local filesystem paths or engine-specific storage
details to CLI and Studio clients.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-completion-plan.md`;
- `references/202-source-history-publication-slice.md`.

The implementation audit inspected:

- runtime artifact record schemas and git locators;
- host artifact list/detail/preview routes;
- source-history publication materialization behavior;
- shared host-client runtime artifact helpers;
- CLI artifact inspection commands;
- Studio selected-runtime artifact inspection state and rendering.

## Implemented Behavior

The host API now includes:

```text
GET /v1/runtimes/:nodeId/artifacts/:artifactId/history?limit=20
GET /v1/runtimes/:nodeId/artifacts/:artifactId/diff?fromCommit=<commit>
```

The history endpoint returns bounded git commit history for the artifact
locator path at the artifact commit. The query limit is validated by the shared
contract and capped at 50 commits.

The diff endpoint returns a bounded UTF-8 git diff from the supplied
`fromCommit` to the artifact commit. When no base is supplied, the host uses
the artifact commit's first parent and falls back to git's empty-tree hash for
root commits. Diff content is capped at 64 KiB and marked as truncated when the
git output exceeds that limit.

Both endpoints:

- require an existing runtime context;
- return 404 when the artifact record is missing;
- only inspect git-backed artifacts with a local materialized repository;
- reject absolute or parent-traversing locator paths;
- restrict repository inspection to runtime artifact or retrieval workspaces;
- return an unavailable inspection reason instead of throwing for unsupported
  artifact backends, missing repositories, missing commits, or unavailable git
  inspection state.

The shared host client exposes `getRuntimeArtifactHistory` and
`getRuntimeArtifactDiff`. Shared presentation helpers now format artifact
history lines, history status, and diff status for CLI and Studio.

The CLI extends the existing artifact command:

```bash
entangle host runtimes artifact <nodeId> <artifactId> --history --limit 5
entangle host runtimes artifact <nodeId> <artifactId> --diff
entangle host runtimes artifact <nodeId> <artifactId> --diff --from <commit>
```

`--preview`, `--history`, and `--diff` are mutually exclusive. Summary mode
omits full preview/diff content while retaining operator-relevant metadata.

Studio now loads artifact detail, preview, history, and diff through the same
host-client boundary when a runtime artifact is selected. The selected artifact
panel shows bounded history and diff inspection next to the existing preview.

## Boundary Decisions

This slice intentionally does not:

- expose arbitrary filesystem diffing;
- mutate artifact state;
- restore or replay artifact commits into a workspace;
- diff non-git artifact backends;
- fetch remote-only repositories before inspection;
- add target provisioning or fallback replication;
- change runner ownership of artifact production.

The new inspection surface is deliberately read-only and bounded. Richer
restore/replay, remote comparison, fallback replication, and operation-scoped
source approval evidence remain later B5 or reliability work.

## Remaining B5 Work

The remaining B5 implementation should add:

- operation-scoped approval evidence for source application and publication;
- non-primary git repository provisioning and fallback/replication behavior;
- source publication views that expose remote branch/history context, not only
  the produced artifact record;
- artifact restore/replay semantics only after rollback and policy behavior are
  specified;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, diff and file inspection, review, source-history
  application, publication, artifact history/diff inspection, and downstream
  inspection.

## Verification

Focused verification performed for this slice:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/types test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/studio test
```

Closure verification for the coherent batch:

```bash
git diff --check
CI=1 TURBO_DAEMON=false pnpm verify
pnpm build
```

All checks passed. `pnpm build` still reports the existing Studio bundle-size
warning for the main production chunk; this slice did not introduce a dedicated
code-splitting pass.
