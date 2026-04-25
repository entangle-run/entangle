# Operation And Resource Scoped Approvals Slice

Date: 2026-04-25.

## Purpose

This slice tightens Entangle Local L3 approval evidence so an approval cannot be
reused for a different policy operation or a different source mutation target.

The previous source mutation gate accepted an approved runtime approval id, but
the approval record did not carry canonical operation or resource scope. That
was too weak for coding-agent nodes because a broad approved approval could be
replayed against another source application or publication.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/205-source-mutation-policy-gates-slice.md`.

The implementation audit inspected:

- approval metadata contracts in Entangle A2A;
- runner approval request materialization;
- runner approval records and host approval observations;
- source-candidate application and source-history publication gates;
- host-client, CLI, and Studio approval presentation helpers;
- host, runner, shared contract, CLI, Studio, and host-client tests.

## Implemented Behavior

`packages/types` now owns a shared policy scope vocabulary:

```text
PolicyOperation
PolicyResourceKind
PolicyResourceScope
```

`PolicyOperation` is reused by engine permission observations, approval request
metadata, runner approval records, observed approval activity, and approval
trace events. Source mutation policy gates now require exact operation matches:

- source application requires `source_application`;
- source-history publication requires `source_publication`.

Approval records can also carry a `resource` scope. Source mutation gates now
require exact resource matches when an approval id is supplied:

- source application requires `source_change_candidate:<candidateId>`;
- source-history publication requires
  `source_history_publication:<sourceHistoryId>|<gitService>|<namespace>|<repository>`.

This makes source publication approval target-aware, including non-primary git
targets. An approval for one source-history publication target cannot be reused
for another target.

## Runtime And Client Surfaces

Inbound `approval.request` A2A metadata can carry optional `operation` and
`resource` fields. The runner persists both onto pending approval records.

The host propagates operation and resource scope into observed approval activity
and typed `approval.trace.event` events. Runtime approval inspection now shows
both pieces of scope through the shared host-client detail helpers, CLI summary
projection, Studio approval inspection helpers, and runtime trace presentation.

## Boundary Decisions

This slice intentionally does not create live approval records from OpenCode
permission prompts or resume an OpenCode turn after an approval decision. It
only makes the existing approval evidence precise enough for the next bridge.

The approval scope remains a product-level Entangle contract. OpenCode-native
permission names are still adapter input, not public protocol truth.

## Remaining B3/B5 Work

The remaining policy and source workflow implementation should add:

- durable approval records from live OpenCode permission requests where the
  engine lifecycle can be mapped safely;
- resumable approval-decision feedback into the coding-agent lifecycle;
- richer operator-facing approval request creation flows for source mutation
  scopes instead of test-seeded records;
- non-primary git repository provisioning and fallback/replication behavior;
- source publication views that expose remote branch/history context, not only
  the produced artifact record;
- artifact restore/replay semantics only after rollback and policy behavior are
  specified;
- end-to-end OpenCode-backed smoke coverage proving source modification,
  candidate creation, diff and file inspection, review, source-history
  application, approval-gated target-aware publication, artifact history/diff
  inspection, and downstream inspection.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/types test
pnpm --filter @entangle/host test -- --run src/index.test.ts -t "lists and inspects persisted source change candidates"
pnpm --filter @entangle/runner test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio test
git diff --check
pnpm build
CI=1 TURBO_DAEMON=false pnpm verify
```

The host suite now covers:

- source application blocked when an approval is scoped to the wrong operation;
- source application blocked when an approval is scoped to another source
  candidate;
- non-primary source-history publication blocked when an approval is scoped to
  another publication target;
- accepted approvals persisted with operation and resource evidence on runtime
  approval records, host observations, and presentation surfaces.

`pnpm build` passed with the existing Studio Vite chunk-size warning. The
aggregate `pnpm verify` gate passed in this slice.
