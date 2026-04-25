# Source Mutation Policy Gates Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstreams B3 and B5 by making source
application and source-history publication subject to node-level source
mutation policy.

The previous B5 path already required explicit review before applying a source
candidate and explicit retry before replacing a failed publication attempt, but
the source mutation requests themselves had no approval-id linkage. This slice
keeps the host as the side-effect boundary and lets each node binding declare
whether source application and source publication require an approved runtime
approval record.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/23-edge-semantics-and-policy-matrix.md`;
- `references/38-engine-adapter-and-model-execution-spec.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/201-source-history-application-slice.md`;
- `references/202-source-history-publication-slice.md`;
- `references/203-artifact-history-diff-slice.md`;
- `references/204-source-history-publication-controls-slice.md`.

The implementation audit inspected:

- graph node binding policy schemas;
- effective runtime policy context materialization;
- runtime approval record storage and host read paths;
- source-candidate apply and source-history publish host mutations;
- source-history, source-candidate, and host-event contracts;
- shared host-client, CLI, and Studio presentation surfaces;
- host, host-client, CLI, Studio, runner, and shared contract tests.

## Implemented Behavior

Node bindings now accept optional source mutation policy:

```text
policy.sourceMutation.applyRequiresApproval?: boolean
policy.sourceMutation.publishRequiresApproval?: boolean
policy.sourceMutation.nonPrimaryPublishRequiresApproval?: boolean
```

The effective runtime context always carries a resolved
`policyContext.sourceMutation`. The default is conservative for target changes:

- source application does not require approval by default because candidate
  review remains a separate explicit host mutation;
- any source publication can be configured to require approval;
- publication to a git target that differs from the runtime primary target
  requires approval by default.

Source-candidate application and source-history publication requests now accept
`approvalId`. When policy requires approval, the host rejects the mutation
unless that id resolves to a runtime approval record for the same graph with
the local runtime as requester and status `approved`. When the source candidate
or source-history record is session-scoped, the approval must also belong to
the same session.

When supplied and accepted, the approval id is persisted on:

- source-change candidate application records;
- source-history application records;
- source-history publication records;
- `source_history.updated` host events;
- `source_history.published` host events.

## Client Surfaces

The shared host client now displays application and publication approval ids in
source-candidate and source-history detail lines.

The CLI extends the existing source mutation commands:

```bash
entangle host runtimes source-candidate <nodeId> <candidateId> --apply --approval-id approval-source-application-alpha
entangle host runtimes source-history-entry <nodeId> <sourceHistoryId> --publish --approval-id approval-source-publication-alpha
```

`--approval-id` is accepted only with the matching mutation flag. CLI
source-history summaries now also expose `applicationApprovalId` and
`publicationApprovalId` when present. Studio consumes the same source-history
contract and renders publication approval evidence in the selected-runtime
inspection path.

## Boundary Decisions

This slice intentionally does not:

- generate approval records directly from OpenCode permission prompts;
- feed approval decisions back into a resumable OpenCode lifecycle;
- add operation-scoped approval record metadata;
- auto-provision non-primary git repositories;
- add fallback publication or replication;
- move source application or publication side effects into runner commands.

The source mutation gate is a host-enforced Entangle policy guard. Engine-native
permission mapping remains part of the broader B3 policy bridge because the
current one-shot OpenCode lifecycle still auto-rejects permission prompts rather
than pausing in a resumable approval state.

## Remaining B3/B5 Work

The remaining policy and source workflow implementation should add:

- durable approval records from live OpenCode permission requests where the
  engine lifecycle can be mapped safely;
- resumable approval-decision feedback into the coding-agent lifecycle;
- operation-scoped approval evidence so approvals cannot be reused outside the
  intended action;
- non-primary git repository provisioning and fallback/replication behavior;
- source publication views that expose remote branch/history context, not only
  the produced artifact record;
- artifact restore/replay semantics only after rollback and policy behavior are
  specified;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, diff and file inspection, review, source-history
  application, approval-gated retryable publication, artifact history/diff
  inspection, and downstream inspection.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/types test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio test
pnpm --filter @entangle/host test
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio lint
git diff --check
pnpm build
```

The host suite includes coverage for:

- source application blocked by node policy without `approvalId`;
- source application blocked when the supplied approval belongs to another
  session;
- source application accepted with an approved runtime approval id;
- non-primary source-history publication blocked without `approvalId`;
- non-primary source-history publication accepted with an approved runtime
  approval id and preserved failure evidence;
- approval ids persisted onto source records and source history events.

Two aggregate orchestration attempts were stopped after a no-output local hang
inside a spawned Vitest process:

```bash
CI=1 TURBO_DAEMON=false pnpm verify
pnpm -r --workspace-concurrency=1 --if-present test
```

The first hang occurred while Turbo was running `@entangle/types:test`; the
second occurred while pnpm recursive execution was running
`@entangle/validator:test`. Both package tests passed immediately when run
directly, and the focused package-level lint, typecheck, test, whitespace, and
build gates listed above passed.
