# Source History Publication Controls Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B5 by making source-history
publication retries and git target selection explicit host-contract behavior.

The previous publication path could record a failed remote push, but a later
operator call could replace that failed attempt without an explicit retry
signal and could only publish through the runtime's primary git target. This
slice keeps the host as the side-effect boundary while making those controls
visible to CLI, Studio, events, source-history records, and artifact records.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-completion-plan.md`;
- `references/202-source-history-publication-slice.md`;
- `references/203-artifact-history-diff-slice.md`.

The implementation audit inspected:

- source-history publication request, record, and event schemas;
- effective runtime artifact context and git repository target resolution;
- host source-history publication materialization and git push behavior;
- shared host-client publication and source-history presentation helpers;
- CLI source-history entry commands;
- Studio selected-runtime source-history publish flow;
- host, host-client, CLI, Studio, and shared contract tests.

## Implemented Behavior

The publish request now accepts:

```text
retry?: boolean
targetGitServiceRef?: string
targetNamespace?: string
targetRepositoryName?: string
```

When no target fields are supplied, the host keeps the previous behavior and
publishes to the runtime's resolved primary git repository target.

When any target field is supplied, the host resolves a concrete
`GitRepositoryTarget` from the runtime artifact context:

- `targetGitServiceRef` selects an available git service, defaulting to the
  runtime primary git service when omitted;
- `targetNamespace` selects the git namespace, defaulting to the runtime
  default namespace when omitted;
- `targetRepositoryName` selects the repository name, defaulting to the primary
  repository target name when available and otherwise the graph id.

The resolved target is stored on the `SourceHistoryRecord.publication`, on the
published `source_history.published` host event, and in the git artifact
locator. The artifact publication metadata still records the remote name,
remote URL, success state, or bounded failure evidence.

Failed publication attempts remain durable. A source-history entry with an
existing non-published publication attempt now rejects another publish request
unless `retry: true` is supplied. Already published source-history entries
remain immutable and still return a conflict even when retry is supplied.

## Client Surfaces

The shared host client parses and sends the widened request while keeping `{}` a
valid caller input. Shared source-history detail formatting now includes the
publication target when present.

The CLI extends the existing publish command:

```bash
entangle host runtimes source-history-entry <nodeId> <sourceHistoryId> --publish --retry
entangle host runtimes source-history-entry <nodeId> <sourceHistoryId> --publish --target-git-service gitea --target-namespace team-alpha --target-repository graph-alpha
```

`--published-by`, `--reason`, `--retry`, and target options are valid only with
`--publish`.

Studio now sends `retry: true` when the selected source-history entry has a
previous publication attempt that is not already published. It does not yet
expose manual target selection in the UI.

## Boundary Decisions

This slice intentionally does not:

- auto-provision arbitrary non-primary repositories;
- add fallback replication to multiple repositories;
- add operation-scoped approval evidence for publish target changes;
- make already published source-history entries mutable;
- add remote branch browsing beyond artifact history/diff inspection;
- change runner ownership of source-change harvesting.

The target selection behavior is a contract and local control surface. Stronger
policy, provisioning, fallback, and remote branch inspection remain separate
B5/L4 work.

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
  application, retryable target-aware publication, artifact history/diff
  inspection, and downstream inspection.

## Verification

Focused verification performed during the implementation before the final
closure pass:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/types test
pnpm --filter @entangle/host test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio test
pnpm exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts -t "lists and inspects persisted source change candidates"
```

The first full `pnpm --filter @entangle/host test` attempt was manually stopped
after the aggregate host suite produced no diagnostics for an extended period.
The source-history host test that covers this slice was then run directly and
passed, and a repeated full `pnpm --filter @entangle/host test` run passed.

Closure verification for the coherent batch:

```bash
git diff --check
CI=1 TURBO_DAEMON=false pnpm verify
pnpm --filter @entangle/studio build
pnpm build
```

All checks passed. The first aggregate `pnpm build` attempt was manually
stopped after the known intermittent local Studio/Vite idle hang. A direct
Studio build completed immediately, and the repeated aggregate `pnpm build`
completed successfully with only the existing Studio chunk-size warning.
