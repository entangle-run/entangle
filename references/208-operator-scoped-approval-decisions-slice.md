# Operator Scoped Approval Decisions Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstream B3 by making operation and
resource scoped approval records operator-creatable and operator-decidable from
the host boundary.

The previous source mutation gates could require an approved runtime approval
id, but practical use still depended on test-seeded approval records or
incoming A2A approval messages. This slice adds the first explicit operator
decision path while preserving the same approval record contract used by
runner-local approval handling.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/205-source-mutation-policy-gates-slice.md`;
- `references/206-operation-resource-scoped-approvals-slice.md`;
- `references/207-local-doctor-foundation-slice.md`.

The implementation audit inspected:

- runtime approval host API contracts;
- host runtime approval read paths and observed approval activity sync;
- source mutation approval resolution;
- shared host-client approval methods;
- CLI runtime approval commands;
- Studio selected-runtime approval inspection.

## Implemented Behavior

The host API now accepts:

```text
POST /v1/runtimes/{nodeId}/approvals
```

The mutation records an operator decision for a runtime approval. It can:

- create a new scoped approval decision when `sessionId`, `operation`, and
  `resource` are supplied;
- use a caller-supplied `approvalId` for source mutation workflows that need a
  stable id;
- decide an existing pending approval by `approvalId` without respecifying its
  scope;
- reject illegal lifecycle transitions such as `rejected -> approved`;
- reject mismatched graph, requester, session, operation, or resource scope;
- write the approval record under the runtime state root;
- synchronize observed approval activity and emit `approval.trace.event`.

New records use the path runtime node as `requestedByNodeId`. This keeps the
source mutation gate compatible with existing policy checks: an approval for a
source application or publication must still be requested by the runtime node,
scoped to the exact operation/resource, and approved.

## Client Surfaces

The shared host client exposes `recordRuntimeApprovalDecision`.

The CLI adds:

```bash
entangle host runtimes approval-decision <nodeId> \
  --approval-id approval-source-application-alpha \
  --session-id session-alpha \
  --operation source_application \
  --resource-kind source_change_candidate \
  --resource-id source-change-alpha \
  --status approved
```

For existing pending approvals, the operator can decide by id:

```bash
entangle host runtimes approval-decision <nodeId> \
  --approval-id approval-pending-alpha \
  --status rejected
```

Studio now shows Approve/Reject actions for a selected pending approval detail.
Those actions call the same host-client method and refresh the selected runtime
state.

## Boundary Decisions

This is an operator decision surface, not a full live OpenCode permission
bridge. It intentionally does not:

- make OpenCode `opencode run` resumable after a permission request;
- infer approvals from raw engine logs;
- grant broad unscoped approvals;
- bypass the source mutation gate's exact operation/resource matching;
- replace future richer policy UX for node-level configuration.

The host is already the Local operator control plane and source mutation
side-effect boundary. For this slice, host-side approval decisions are limited
to explicit operator requests and are recorded in the same durable runtime
approval files consumed by runner/session inspection.

## Remaining B3 Work

The remaining policy bridge still needs:

- durable approval records from live OpenCode permission requests when the
  engine lifecycle can be mapped safely;
- resumable approval-decision feedback into a node-local coding-agent
  lifecycle;
- richer policy configuration UX for node read/write/execute/publish
  authorities;
- negative end-to-end OpenCode-backed smoke coverage for denied operations.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/types test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts -t "records scoped runtime approval decisions"
pnpm --filter @entangle/host exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts -t "decides an existing pending runtime approval"
pnpm --filter @entangle/cli test -- --run src/runtime-approval-output.test.ts
pnpm --filter @entangle/studio test -- --run src/runtime-approval-inspection.test.ts
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/types test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host test
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio test
git diff --check
pnpm build
CI=1 TURBO_DAEMON=false pnpm verify
```

The first focused host run exposed an invalid generated approval id edge case:
truncating a long id at 100 characters could leave a trailing separator and
fail the shared identifier schema. The implementation now generates a bounded
prefix plus UUID so approval ids stay valid.

The full build passed with only the existing Studio chunk-size warning.
