# Source Change Candidates Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B5 by turning harvested source
workspace changes into durable, reviewable source-change candidate records.

The goal remains narrower than publication. Entangle now records a candidate
whenever a node turn changes its `source/` workspace, and exposes that record
through the host, CLI, and Studio. It still does not accept, commit, push, or
publish the changed files automatically.

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
- `references/196-source-workspace-change-harvesting-slice.md`.

The implementation audit inspected the touched runtime surfaces:

- runner turn execution and source-change harvesting;
- runner state-store persistence;
- runtime session-state, activity-observation, host-event, and host-runtime
  contracts;
- host state synchronization and runtime routes;
- shared host-client parsing and presentation helpers;
- CLI runtime inspection commands and summary projection;
- Studio selected-runtime refresh, runtime-turn details, and trace
  presentation.

## Implemented Behavior

`SourceChangeCandidateRecord` is now a generic Entangle runtime contract. A
candidate includes:

- `candidateId`;
- graph, node, turn, session, and optional conversation references;
- lifecycle status: `pending_review`, `accepted`, `rejected`, or `superseded`;
- the harvested `sourceChangeSummary`;
- an optional shadow-git tree snapshot reference with base and head tree ids;
- created and updated timestamps.

The source harvester now returns both the summary and, when changes exist, a
`shadow_git_tree` snapshot reference. The runner creates a pending candidate
after a successful changed-source harvest, persists it under:

```text
<runtime_root>/source-change-candidates/<candidate_id>.json
```

The runner turn record stores `sourceChangeCandidateIds`, and the same ids are
propagated into observed runner-turn activity and `runner.turn.updated` events.

Host runtime inspection exposes the latest candidate id as
`agentRuntime.lastSourceChangeCandidateId`. The host also exposes read-only
source-change candidate routes:

```text
GET /v1/runtimes/:nodeId/source-change-candidates
GET /v1/runtimes/:nodeId/source-change-candidates/:candidateId
```

The shared host client parses those routes and owns candidate sorting,
filtering, labels, status lines, and bounded detail lines. Runtime-turn and
runtime-trace presentation now include source-change candidate ids when
present.

The CLI adds:

```bash
entangle host runtimes source-candidates <nodeId> [--status ...] [--session-id ...] [--turn-id ...] [--summary]
entangle host runtimes source-candidate <nodeId> <candidateId> [--summary]
```

Studio now refreshes source-change candidates through the host boundary for the
selected runtime, lists recent candidates, and shows host-backed detail for a
selected candidate.

A later slice added a bounded read-only diff inspection route for candidates
with shadow-git tree snapshots:

```text
GET /v1/runtimes/:nodeId/source-change-candidates/:candidateId/diff
```

That route does not change candidate lifecycle state or publish files.

A later slice added a bounded read-only file preview route for paths listed in
the candidate changed-file summary. That route reads from the candidate
`headTree` and does not expose runtime-local filesystem paths.

A later slice added an audited review mutation for accepted, rejected, and
superseded candidate decisions. That mutation records review metadata and emits
`source_change_candidate.reviewed`, but does not apply, commit, push, or
publish candidate changes.

A later slice added explicit runtime-local source-history application for
accepted candidates, with host-client, CLI, and Studio apply/list/detail
surfaces. Remote publication and artifact linkage remain separate work.

## Boundary Decisions

This slice intentionally does not:

- auto-commit source workspace changes;
- auto-push source workspace changes;
- publish candidate changes as artifacts;
- publish local source-history commits remotely;
- expose raw runtime-local workspace paths as protocol locators;
- treat OpenCode private state as Entangle source-of-truth.

Candidates are durable review records. Local source-history application now
exists; policy approval, remote git publication, and artifact linkage remain
explicit future work.

## Remaining B5 Work

The remaining B5 implementation should add:

- Entangle policy checks before candidate source application or publication;
- approval records for policy-gated source application or publication;
- richer publication retry and target-selection controls tied to the node git
  principal and repository target;
- artifact restore/replay semantics only after rollback and policy behavior are
  specified;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, candidate review, source history, publication, artifact
  history/diff inspection, and downstream inspection.

## Verification

Focused verification performed for this slice:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/studio test
pnpm --filter @entangle/host test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/runner test
pnpm --filter @entangle/types lint
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/runner lint
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/cli lint
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
