# Source Change Candidate File Preview Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B5 by adding bounded,
read-only file preview for files listed on a source-change candidate.

The goal remains operator inspection. Entangle can now preview one changed
source file from a candidate's shadow-git `headTree` through the host, host
client, CLI, and Studio, without applying the candidate, mutating the source
workspace, committing files, or publishing artifacts.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `AGENTS.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-completion-plan.md`;
- `references/197-source-change-candidates-slice.md`;
- `references/198-source-change-candidate-diff-slice.md`.

The implementation audit inspected the touched runtime surfaces:

- source-change candidate and host-runtime contracts in `packages/types`;
- host candidate list/detail/diff routes and runtime state helpers;
- source-change harvester path semantics in the runner;
- shared host-client parsing and presentation helpers;
- CLI source-change candidate inspection commands;
- Studio selected-runtime candidate detail and preview panels.

## Implemented Behavior

The host API now includes:

```text
GET /v1/runtimes/:nodeId/source-change-candidates/:candidateId/file?path=<relative-source-path>
```

The response returns the candidate record, requested relative path, and a
bounded preview payload. Preview is available only when:

- the candidate has a `shadow_git_tree` snapshot;
- the source snapshot store exists under runner runtime state;
- the requested path is a portable relative source path;
- the path is listed in the candidate's bounded changed-file summary;
- the file is present in the candidate `headTree`;
- the file content is text.

The host reads content from the snapshot with `git show <headTree>:<path>`,
bounds preview content to 16 KiB, rejects binary-looking content, and returns
either `available: true` with UTF-8 text metadata or `available: false` with a
bounded reason. It does not expose runtime-local filesystem paths.

The shared host client parses this response and owns compact status formatting.
The CLI widens:

```bash
entangle host runtimes source-candidate <nodeId> <candidateId> --file <path> [--summary]
```

Studio now lets the operator choose a changed file from the selected candidate
detail panel and shows the same bounded host-backed preview.

A later slice added an audited review mutation for accepted, rejected, and
superseded candidate decisions. That mutation records review metadata and emits
`source_change_candidate.reviewed`, but does not apply, commit, push, or
publish candidate changes.

## Boundary Decisions

This slice intentionally does not:

- read arbitrary files from the candidate tree;
- read paths that are not listed in the candidate changed-file summary;
- mutate the node source workspace;
- commit or push candidate changes;
- publish candidate changes as artifacts;
- publish local source-history commits remotely;
- expose runtime-local filesystem paths through host responses.

Restricting preview to listed changed files keeps the route aligned with the
candidate review surface rather than turning it into a general source-tree
reader.

## Remaining B5 Work

The remaining B5 implementation should add:

- Entangle policy checks before candidate source application or publication;
- approval records for policy-gated source application or publication;
- richer publication retry and target-selection controls tied to the node git
  principal and repository target;
- artifact restore/replay semantics only after rollback and policy behavior are
  specified;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, diff and file inspection, candidate review, source
  history, publication, artifact history/diff inspection, and downstream
  inspection.

## Verification

Focused verification performed for this slice:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/studio test
pnpm --filter @entangle/host test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/types lint
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli typecheck
```

A first host test run after fixing the fixture was terminated because the
process stopped producing output; the immediately repeated host test passed.

Closure verification for the coherent batch:

```bash
git diff --check
pnpm verify
pnpm build
```

Results:

- `git diff --check` passed.
- `pnpm verify` passed.
- `pnpm build` passed with the known Studio/Vite chunk-size warning.
