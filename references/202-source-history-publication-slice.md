# Source History Publication Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstream B5 by turning an applied
runtime-local source-history record into a git-backed commit artifact.

The implementation keeps Entangle as the side-effect owner. Engines still
propose source changes; accepted candidates are applied into runtime-local
source history; publication is a separate host-mediated mutation that creates
an artifact record and attempts a git push through the runtime's resolved
primary git repository target.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/201-source-history-application-slice.md`.

The implementation audit inspected:

- source-history record schemas and host APIs;
- runtime artifact record schemas and publication metadata;
- git target and principal resolution contracts;
- host source-candidate application behavior;
- host-client, CLI, and Studio runtime source-history surfaces;
- host event trace filtering and formatting.

## Implemented Behavior

The host API now includes:

```text
POST /v1/runtimes/:nodeId/source-history/:sourceHistoryId/publish
```

The publish request accepts optional `publishedBy` and `reason`. The mutation
requires an existing source-history entry, a runtime shadow git repository, and
a resolved primary git repository target. A source-history entry that already
has `publication.state: "published"` is rejected as a conflict.

For a publishable entry, the host:

- verifies that the recorded source-history commit exists in
  `runtime/source-snapshot.git`;
- verifies that the recorded source-history commit tree still matches the
  stored `headTree`;
- materializes the source-history tree into a dedicated publication repository
  under the runtime artifact workspace;
- creates or reuses a commit on a deterministic branch
  `<nodeId>/source-history/<sourceHistoryId>`;
- writes an `ArtifactRecord` with `artifactKind: "commit"` and `backend:
  "git"`;
- attempts to push that commit to the resolved primary git target;
- persists publication success or failure metadata without deleting the local
  artifact record;
- annotates the `SourceHistoryRecord` with the produced artifact id, branch,
  publication metadata, request timestamp, and optional operator/reason;
- emits `source_history.published`.

The shared host client exposes `publishRuntimeSourceHistory`. The CLI extends
the existing source-history entry command:

```bash
entangle host runtimes source-history-entry <nodeId> <sourceHistoryId> --publish
```

Studio can publish the selected source-history entry from the runtime source
history panel and then selects the produced artifact record for inspection.

## Local Git Transport

The shared git service and git repository target contracts now also support a
`file` transport kind backed by `file://` remote bases. This is intentionally
limited to local git remotes and does not require a git principal binding.

This keeps Entangle Local testable without network access while still using a
real git push against a bare repository. SSH and HTTPS publication continue to
use the existing principal and secret-delivery paths.

## Boundary Decisions

This slice intentionally does not:

- auto-publish engine-generated source merely because a candidate was accepted;
- bypass future policy or approval gates;
- emit peer handoff messages for source publications;
- implement artifact history/diff APIs for arbitrary artifacts;
- implement non-primary target selection or fallback replication;
- treat failed remote publication as loss of local artifact truth.

The publication mutation is host-mediated for the current Entangle Local
operator surface. A later runner-side executor can take over the low-level git
operation without changing the public host contract.

## Remaining B5 Work

The remaining B5 implementation should add:

- policy checks and approval gates before source application or publication;
- richer remote publication controls, including retry semantics and target
  selection;
- artifact history/diff APIs beyond report and source commit records;
- source publication views that expose remote branch/history context, not only
  the produced artifact record;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, diff and file inspection, review, source-history
  application, publication, and downstream inspection.

## Verification

Focused verification performed for this slice:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types test
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host test
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio lint
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
