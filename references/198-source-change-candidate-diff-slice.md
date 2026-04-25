# Source Change Candidate Diff Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstream B5 by adding a bounded,
read-only diff inspection path for pending source-change candidates.

The goal remains inspection, not source application or publication. Entangle can now
show the diff represented by a candidate's shadow-git tree snapshot through the
host, host client, CLI, and Studio, while leaving policy approval, git commit,
and publication for later slices.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `AGENTS.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/197-source-change-candidates-slice.md`.

The implementation audit inspected the touched runtime surfaces:

- source-change candidate contracts in `packages/types`;
- host runtime state synchronization and runtime routes;
- shared host-client parsing and presentation helpers;
- CLI source-change candidate inspection commands;
- Studio selected-runtime candidate inspection;
- host and client tests for persisted source-change candidate records.

## Implemented Behavior

The host API now includes:

```text
GET /v1/runtimes/:nodeId/source-change-candidates/:candidateId/diff
```

The response returns the candidate record plus a bounded diff payload. When the
candidate has a `shadow_git_tree` snapshot and the runtime shadow git store is
available, the host computes:

```text
git --git-dir <runtime_root>/source-snapshot.git diff --no-ext-diff --no-renames <base_tree> <head_tree> --
```

The host bounds stdout to 64 KiB, bounds stderr evidence, sanitizes local
runtime paths from failure messages, and returns either:

- `available: true`, `contentType: "text/x-diff"`,
  `contentEncoding: "utf8"`, `bytesRead`, `content`, and `truncated`; or
- `available: false` with a bounded reason.

The shared host client parses this response and owns a compact diff-status
formatter. The CLI widens:

```bash
entangle host runtimes source-candidate <nodeId> <candidateId> --diff [--summary]
```

Studio fetches the same host diff response when a source-change candidate is
selected and shows a bounded preview or the unavailable reason in the selected
runtime panel.

A later slice added a bounded read-only file preview route for paths listed in
the candidate changed-file summary:

```text
GET /v1/runtimes/:nodeId/source-change-candidates/:candidateId/file?path=<relative-source-path>
```

A later slice added an audited review mutation for accepted, rejected, and
superseded candidate decisions. That mutation records review metadata and emits
`source_change_candidate.reviewed`, but does not apply, commit, push, or
publish candidate changes.

A later slice added explicit runtime-local source-history application for
accepted candidates. Remote publication and artifact linkage remain separate
work.

## Boundary Decisions

This slice intentionally does not:

- mutate the node source workspace;
- commit or push candidate changes;
- publish candidate changes as artifacts;
- publish local source-history commits remotely;
- expose runtime-local filesystem paths through host responses;
- treat OpenCode private state as Entangle source-of-truth.

The candidate diff is an operator inspection surface over runner-owned
candidate evidence. Entangle policy and runner-owned git side effects remain
the authority for future source application and publication.

## Remaining B5 Work

The remaining B5 implementation should add:

- Entangle policy checks before candidate source application or publication;
- approval records for policy-gated source application or publication;
- richer publication retry and target-selection controls tied to the node git
  principal and repository target;
- artifact restore/replay semantics only after rollback and policy behavior are
  specified;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, diff inspection, candidate review, source history,
  publication, artifact history/diff inspection, and downstream inspection.

## Verification

Focused verification performed for this slice:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/studio test
pnpm --filter @entangle/host test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/cli typecheck
```

Closure verification for the coherent batch:

```bash
git diff --check
pnpm verify
pnpm build
```

Results:

- `git diff --check` passed;
- `pnpm verify` passed;
- `pnpm build` passed with the known Studio/Vite chunk-size warning only.
