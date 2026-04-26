# Agent Runtime Node Configuration Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstream B8 by exposing the existing
graph/node `agentRuntime` contract through the two operator surfaces that
already mutate managed nodes: the CLI and Studio.

Before this slice, the contracts, validator, host materialization, runtime
inspection, and OpenCode default profile existed, but changing a node's runtime
mode or engine profile still required editing raw graph JSON. That was
inconsistent with the product goal that every node and edge should be
inspectable and configurable by the operator.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-local-completion-plan.md`;
- `references/208-operator-scoped-approval-decisions-slice.md`.

The implementation audit inspected:

- graph `agentRuntime` schemas and effective binding resolution;
- validator checks for agent engine profile references;
- host managed-node mutation routes;
- shared host-client node mutation methods;
- CLI managed-node commands and dry-run conventions;
- Studio managed-node editor state and tests.

## Implemented Behavior

The CLI now adds:

```bash
entangle host nodes agent-runtime <nodeId> \
  --mode coding_agent \
  --engine-profile-ref local-opencode \
  --default-agent build \
  --summary
```

The same command can set `--mode disabled`, clear node-level overrides with
`--inherit-mode`, `--clear-engine-profile-ref`, and `--clear-default-agent`, or
print the canonical replacement payload with `--dry-run`.

The command first reads the current node through the host API, builds a
canonical managed-node replacement request, and preserves unrelated autonomy,
resource binding, package-source, and identity fields. The host remains the
only mutation boundary.

Studio now loads the active deployment catalog during overview refresh and uses
the catalog's `agentEngineProfiles` to populate the Managed Node Editor. The
editor can now configure:

- node-level runtime mode inheritance, `coding_agent`, or `disabled`;
- node-level agent engine profile selection;
- node-level default engine agent override.

The Studio mutation still calls the existing host-client create/replace node
methods and therefore relies on the same host validation and active graph
revision flow as the CLI.

## Boundary Decisions

This slice intentionally does not introduce a new host API route for
`agentRuntime`. The durable truth is still graph node state, and the existing
managed-node replacement contract is the correct boundary for changing it.

This slice also does not add engine-specific OpenCode fields to graph or host
API contracts. Engine-specific behavior remains behind catalog engine profiles
and runner adapters. The UI exposes the generic `agentRuntime` fields only.

## Remaining B8 Work

The remaining operator surface still needs:

- richer OpenCode availability and probe evidence in graph/node configuration
  context;
- produced-artifact and recent engine-event panels that connect configuration
  to observed runtime behavior;
- approval-blocker presentation tied directly to runtime configuration and
  source mutation policy;
- graph bundle ergonomics for exporting/importing configured node runtime
  profiles.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/cli test -- node-agent-runtime-command.test.ts
pnpm --filter @entangle/studio test -- graph-node-mutation.test.ts
```

Closure verification for the coherent batch additionally ran lint, full tests,
`git diff --check`, `pnpm build`, and `CI=1 TURBO_DAEMON=false pnpm verify`.
