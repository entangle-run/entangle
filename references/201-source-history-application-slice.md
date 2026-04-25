# Source History Application Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstream B5 by turning an operator
accepted source-change candidate into a durable local source-history entry.

The implementation deliberately remained local and explicit at the time of
this slice. The later source-history publication slice adds a separate
publication mutation for applied source-history records; candidate application
still does not auto-publish source commits, create downstream handoffs, or
bypass future policy or approval gates.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/196-source-workspace-change-harvesting-slice.md`;
- `references/197-source-change-candidates-slice.md`;
- `references/198-source-change-candidate-diff-slice.md`;
- `references/199-source-change-candidate-file-preview-slice.md`;
- `references/200-source-change-candidate-review-slice.md`.

The implementation audit inspected:

- source-change snapshot creation in `services/runner`;
- source-change candidate storage under runtime state;
- host runtime source-candidate routes and mutation behavior;
- host-client, CLI, and Studio source-candidate presentation;
- host event trace filtering.

## Implemented Behavior

The host API now includes:

```text
POST /v1/runtimes/:nodeId/source-change-candidates/:candidateId/apply
GET /v1/runtimes/:nodeId/source-history
GET /v1/runtimes/:nodeId/source-history/:sourceHistoryId
```

The apply request accepts optional `appliedBy` and `reason`. The host only
applies candidates whose lifecycle status is `accepted`, whose candidate record
has not already been applied, and whose shadow-git snapshot is still available.

Before mutating the source workspace, the host computes the current source
workspace tree through the runner-owned shadow git repository:

- if the current tree is already the candidate `headTree`, the entry is
  recorded as `already_in_workspace`;
- if the current tree is still the candidate `baseTree`, the host replaces the
  workspace contents with the candidate `headTree` and records
  `applied_to_workspace`;
- if the current tree is neither the candidate base nor head, the mutation is
  rejected as a conflict.

Successful application creates a commit in the runtime-local source history ref
`refs/heads/entangle-source-history`, writes a durable
`SourceHistoryRecord`, annotates the candidate with application metadata, and
emits `source_history.updated`.

The shared host client exposes apply, list, and inspect methods. The CLI adds:

```bash
entangle host runtimes source-candidate <nodeId> <candidateId> --apply
entangle host runtimes source-history <nodeId>
entangle host runtimes source-history-entry <nodeId> <sourceHistoryId>
```

Studio can apply an accepted candidate to source history and inspect source
history entries for the selected runtime.

## Boundary Decisions

This slice intentionally did not:

- emit `task.result` handoffs for applied source;
- create resumable approval records before apply;
- merge concurrent source changes;
- expose runtime-local filesystem paths.

Follow-up slice `references/202-source-history-publication-slice.md` added
explicit source-history publication and source commit artifact records while
preserving this slice's separation between application and publication.

The mutation is host-mediated in Entangle Local because the active product
surface already exposes local operator mutations through the host boundary.
The design still treats engines as proposers and Entangle as the validator and
side-effect owner; future remote runner control can move the low-level apply
executor behind a runner command without changing the host API contract.

## Remaining B5 Work

After the publication follow-up, the remaining B5 implementation should add:

- policy checks and approval gates before source application or publication;
- richer publication retry semantics and target selection;
- artifact history/diff APIs beyond report artifacts;
- richer CLI and Studio source publication history views;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, diff and file inspection, review, source-history
  application, remote publication, and downstream inspection.

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

All focused checks passed.

Closure verification for the coherent batch:

```bash
git diff --check
CI=1 TURBO_DAEMON=false pnpm verify
pnpm build
```

All closure checks passed. `pnpm build` still reports the existing Studio
bundle-size warning for the main production chunk; this slice did not introduce
a dedicated code-splitting pass.
