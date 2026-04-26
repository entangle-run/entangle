# Source Change Candidate Review Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B5 by adding an audited
review lifecycle mutation for source-change candidates.

Operators can now mark a pending source-change candidate as `accepted`,
`rejected`, or `superseded` through the host boundary. This records review
state and emits a host event, but deliberately does not apply files to a source
history, create commits, push remotes, publish artifacts, or bypass future
policy and approval gates.

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
- `references/198-source-change-candidate-diff-slice.md`;
- `references/199-source-change-candidate-file-preview-slice.md`.

The implementation audit inspected the touched runtime surfaces:

- source-change candidate status and record contracts in `packages/types`;
- host event contracts and host runtime state helpers;
- source-change candidate host routes;
- shared host-client parsing and presentation helpers;
- CLI source-change candidate inspection commands;
- Studio selected-runtime candidate detail panels.

## Implemented Behavior

The host API now includes:

```text
PATCH /v1/runtimes/:nodeId/source-change-candidates/:candidateId/review
```

The request accepts:

- `status: "accepted" | "rejected" | "superseded"`;
- optional `reason`;
- optional `reviewedBy`;
- required `supersededByCandidateId` when `status` is `superseded`.

The mutation is allowed only for `pending_review` candidates. The host rejects
repeat review attempts as conflicts and validates that a superseding candidate
exists for the same runtime. Successful review writes the candidate record with
a structured `review` object, updates `updatedAt`, and emits
`source_change_candidate.reviewed`.

The shared host client parses the mutation response and source-candidate detail
formatters now include review evidence. The CLI widens:

```bash
entangle host runtimes source-candidate <nodeId> <candidateId> \
  --review <accepted|rejected|superseded> \
  [--reason <reason>] [--reviewed-by <operatorId>] [--superseded-by <candidateId>]
```

Studio now exposes candidate review actions in the selected candidate detail
panel. It can accept, reject, or supersede a pending candidate by another
visible candidate through the same host-client mutation.

## Boundary Decisions

This slice intentionally does not:

- apply accepted candidate files into a source history;
- create source commits or branches;
- publish candidate changes as git artifacts;
- create policy approval records for publication;
- push to the node git remote;
- mutate OpenCode state or engine sessions;
- expose runtime-local filesystem paths.

The term `accepted` currently means "operator-reviewed as accepted" inside the
candidate lifecycle. A later B5 slice added explicit runtime-local
source-history application for accepted candidates. Policy/approval checks,
remote publication, and artifact linkage are still required before accepted
source changes become published shared work.

## Remaining B5 Work

The remaining B5 implementation should add:

- Entangle policy checks before source application or publication;
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
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/studio test
```

All focused checks passed after correcting one host test helper drift during
the audit loop.

Closure verification for the coherent batch:

```bash
git diff --check
pnpm verify
pnpm build
```

Closure result:

- `git diff --check` passed.
- `pnpm verify` passed.
- `pnpm build` passed. The existing Studio/Vite chunk-size warning remains
  present and is not introduced by this slice.
