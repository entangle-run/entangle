# Engine Request Summary Slice

Date: 2026-04-26.

## Purpose

This slice advances Entangle L3 workstream B6 by persisting bounded
evidence about the engine request assembled for each executable runner turn.

The goal is not to store raw prompts. It is to make the message-to-engine path
auditable enough to debug whether graph context, peer routes, memory,
artifacts, tools, and execution limits reached the node-local coding engine
without exposing secrets, raw prompt text, runtime-local paths, or full
artifact contents through host events.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-completion-plan.md`;
- `references/210-wiki-repository-sync-slice.md`;
- `references/211-local-doctor-wiki-repository-health-slice.md`.

The implementation audit inspected:

- runner turn assembly in `services/runner/src/runtime-context.ts`;
- runner lifecycle persistence in `services/runner/src/service.ts`;
- runner state and service tests;
- host observed runner-turn synchronization;
- shared runtime-turn presentation helpers consumed by CLI and Studio;
- shared runtime session/activity and host-event schemas.

## Implemented Behavior

`RunnerTurnRecord` now carries an optional `engineRequestSummary`.

The summary records:

- system prompt part count and aggregate character count;
- interaction prompt part count and aggregate character count;
- memory reference count;
- inbound artifact reference count;
- retrieved artifact input count;
- tool definition count;
- resolved execution limits;
- whether bounded peer-route context was included;
- summary generation time.

The runner writes the summary immediately after building the
`AgentEngineTurnRequest` and before entering the `reasoning` and `acting`
phases. This gives the host a durable signal even when later engine execution,
artifact materialization, memory synthesis, or wiki repository sync fails.

The same summary now propagates through:

- persisted runner turn records;
- host observed runner-turn activity records;
- `runner.turn.updated` host events;
- shared runtime-turn detail lines used by CLI and Studio.

## Boundary Decisions

The summary is intentionally structural. It does not persist raw system prompt
text, raw interaction prompt text, memory file paths, artifact contents,
secret-bearing runtime context, or engine-specific request payloads.

Prompt assembly remains runner-owned and engine-agnostic. OpenCode-specific
adapter details stay behind the agent-engine boundary; the host event surface
sees only generic request-shape evidence.

This slice does not claim B6 complete. It closes the first safe debugging
evidence path. Deeper prompt assembly improvements for approvals, policy
context, lifecycle-specific message handling, and richer workspace-boundary
instructions remain open.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/types test
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/runner lint
pnpm --filter @entangle/runner test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host-client test
git diff --check
pnpm build
CI=1 TURBO_DAEMON=false pnpm verify
```

The initial runner test expectation assumed one extra inbound prompt part.
The focused runner test corrected that assumption to the actual assembled
request shape before the slice was documented.

The first aggregate verify attempt hung while Turborepo was running
`@entangle/package-scaffold` tests. The package test passed immediately in
isolation, no Vitest/Turbo processes remained afterward, and the repeated full
`CI=1 TURBO_DAEMON=false pnpm verify` completed successfully.
