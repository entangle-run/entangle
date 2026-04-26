# Engine Prompt Policy And Workspace Context Slice

Date: 2026-04-26.

## Purpose

This slice advances Entangle Local L3 workstream B6 by making the runner's
engine turn request more explicitly graph-aware and policy-aware before the
node-local coding engine starts work.

The previous slice added bounded evidence that the request was assembled. This
slice improves the request itself: every executable turn now receives generic
agent-runtime context, workspace ownership boundaries, source-mutation policy,
autonomy policy, and inbound response/constraint controls.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/212-engine-request-summary-slice.md`.

The implementation audit inspected:

- `services/runner/src/runtime-context.ts`;
- `services/runner/src/index.test.ts`;
- `services/runner/src/service.test.ts`;
- `packages/types/src/runtime/session-state.ts`;
- `packages/types/src/index.test.ts`;
- `packages/host-client/src/runtime-turn.ts`;
- `packages/host-client/src/runtime-turn.test.ts`;
- runtime context policy and workspace schemas.

## Implemented Behavior

Every executable runner turn now includes bounded prompt parts for:

- agent runtime mode, engine profile, default agent, and engine state scope;
- workspace boundaries for source edits, artifact materialization, memory wiki
  ownership, wiki repository snapshots, and outbound path discipline;
- autonomy policy and source-mutation approval policy;
- inbound message controls, including message type, response policy, approval
  requirement, max followups, and inbound artifact-ref count.

`engineRequestSummary` now also records whether agent-runtime, workspace,
policy, and inbound-control context were included. The new summary booleans
default to `false` so recently persisted summaries from the previous slice
remain parseable.

Shared runtime-turn presentation now displays those context-inclusion signals
for CLI and Studio turn inspection.

## Boundary Decisions

The new prompt parts use logical surfaces and policy booleans rather than
absolute host paths. Engines still receive local artifact and memory refs
through the existing engine request contract when that is necessary for local
execution or tool access, but the policy/workspace context itself does not add
new filesystem disclosure.

The prompt context remains engine-agnostic. OpenCode-specific permission
semantics and process details stay in the adapter. Entangle policy remains the
authoritative product model.

This does not complete B6. Remaining B6 work includes richer approval-state
summaries for executable turns, stronger lifecycle-specific prompt assembly,
and deeper consistency checks proving that CLI, Studio, and Nostr-launched
tasks produce equivalent engine requests.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/types test
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/runner lint
pnpm --filter @entangle/runner test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host-client test
```
