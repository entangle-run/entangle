# Agent Runtime Inspection Status Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 by adding a generic status surface for the
agent runtime inside each node.

The goal is not to expose OpenCode internals directly. The goal is to let the
host, CLI, and Studio inspect the effective Entangle node runtime in terms that
remain valid for OpenCode, Claude Code-style adapters, future Entangle-native
engines, or disabled/non-executing nodes.

## Audit Findings

Before this slice, Entangle had:

- graph and node-level `agentRuntime` selection;
- deployment-level `agentEngineProfiles`;
- effective runtime context carrying the resolved `agentRuntimeContext`;
- OpenCode as the default Local engine profile;
- node-scoped source, engine-state, and wiki workspace roots;
- OpenCode process execution with node-scoped DB/config/XDG state;
- generic `engineSessionId` persistence on turn outcomes.

The remaining gap was that runtime inspection could show backend/container,
context, reconciliation, and trace state, but not the effective node agent
runtime itself. CLI and Studio therefore had no shared host truth for which
agentic engine a node was using or which engine session most recently ran.

## Implemented Contract

`packages/types` now defines `runtimeAgentRuntimeInspectionSchema` and exposes it
as optional `RuntimeInspectionResponse.agentRuntime`.

The status is intentionally generic:

- effective runtime mode;
- engine profile kind;
- engine profile reference and display name;
- default agent, when configured;
- engine state scope;
- last engine session id;
- last engine turn id and update timestamp;
- last engine stop reason;
- bounded last engine failure classification and message.

No OpenCode-specific DTO is added to the public host API.

## Host Behavior

`entangle-host` derives the status from:

- the effective runtime context materialized by the host;
- durable runner turn records under the node runtime root.

If a runtime context is unavailable, the agent-runtime inspection field remains
absent. If no engine turn has run yet, the host still reports the effective mode,
engine profile, default agent, and state scope while omitting last-turn fields.

## Client Behavior

`packages/host-client` now formats shared detail lines for agent-runtime status.
The CLI runtime summary and Studio selected-runtime details consume the same host
contract instead of inventing separate presentation models.

This closes the first B1/B8 observability gap for effective agent-runtime
identity and last-session visibility. It does not yet close OpenCode
availability probing, permission/approval bridging, changed-file harvesting,
artifact production, recent engine-event panels, or graph/node runtime
configuration editing.

## Verification

Focused checks for this slice:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
```

Closure checks for the coherent batch:

```bash
git diff --check
pnpm verify
pnpm build
```

All passed. `pnpm build` still emits the existing Studio chunk-size warning for
the production bundle; this warning is not introduced by this slice.
