# Wiki Repository Sync Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B4 by turning the previously
reserved per-node `wiki-repository` workspace into a runner-owned local git
snapshot of the node's active `memory/wiki` tree after completed executable
turns.

This is intentionally not a full memory-as-repo migration. The active memory
write path remains runner-owned under `memory/wiki`, and the wiki repository is
the first safe versioned mirror for inspection, backup, restore planning, and
future publication workflow.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-completion-plan.md`;
- `references/209-agent-runtime-node-configuration-slice.md`.

The implementation audit inspected:

- runner turn lifecycle and memory-maintenance order;
- runner state-store writes for durable turn records;
- effective runtime workspace context;
- host runner-turn activity synchronization;
- shared runtime-turn presentation helpers used by CLI and Studio;
- existing workspace-health and wiki-memory documentation.

## Implemented Behavior

After optional memory synthesis has run, the runner now synchronizes
`memory/wiki` into the node's `wiki-repository` workspace.

The sync path:

- initializes the repository on the fixed local branch `entangle-wiki` when
  needed;
- configures the local git author from the runtime's primary git principal
  attribution when available, with a node-based fallback;
- mirrors the current wiki tree into the repository while preserving `.git`;
- commits changed snapshots with `Update wiki memory for <turnId>`;
- records `committed`, `unchanged`, `not_configured`, or `failed` outcomes on
  the runner turn record.

The same outcome is now propagated through host observed runner activity,
`runner.turn.updated` events, shared host-client presentation, CLI turn output,
and Studio turn inspection helpers.

## Boundary Decisions

The runner remains the only owner of durable wiki writes. Engines can influence
memory through the existing bounded synthesis path, but they do not write the
wiki repository directly.

The repository snapshot deliberately does not expose runtime-local filesystem
paths in protocol locators. It is runtime-local state for inspection and
future backup/restore behavior, not a new A2A artifact locator.

The snapshot is local-only. Remote publication, restore replay, migration from
older file-backed memory layouts, and rollback semantics remain separate Local
reliability work.

## Remaining B4 Work

The node workspace model still needs:

- doctor-backed wiki-repository checks;
- backup and restore integration;
- explicit migration and rollback rules if the repository later becomes the
  primary memory store;
- operator inspection of repository history beyond the current turn summary;
- optional publication or export policy for node memory repositories.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/runner lint
pnpm --filter @entangle/runner test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/types test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/studio test
```

The first aggregate Studio test invocation hung while an old `vite build`
process was still running in the repository. The stale build process and the
hung test runner were terminated, the touched Studio test was run in isolation,
and the full Studio test suite then passed.

The first full `CI=1 TURBO_DAEMON=false pnpm verify` attempt later hung while
running `@entangle/package-scaffold` tests through Turborepo. The package test
passed immediately in isolation, and the repeated full verify completed
successfully.
