# Source Workspace Change Harvesting Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B5 by making source workspace
changes produced during a node turn inspectable through Entangle contracts.

The goal is deliberately narrower than publication: Entangle now detects and
summarizes source changes made inside a node's `source/` workspace, but it does
not yet trust, commit, publish, or expose those changes as protocol artifacts.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-completion-plan.md`;
- `references/45-quality-engineering-and-ci-baseline.md`;
- `wiki/decisions/repository-audit-loop.md`.

The audit also inspected the touched Entangle runtime surfaces:

- runner turn execution and artifact state;
- source, artifact, runtime, and workspace context contracts;
- host observed-state synchronization and runtime inspection;
- shared host-client presentation;
- CLI runtime-turn and runtime-inspection output;
- Studio runtime-turn and selected-runtime inspection.

For OpenCode behavior, the audit inspected the local OpenCode reference under
`resources/opencode`, especially the CLI `run` command, session code, snapshot
code, file-state code, and TUI file/sidebar plugins.

## OpenCode Findings

OpenCode's one-shot `opencode run --format json` stream is useful for text,
tool, error, and `sessionID` observation. It is not a complete source-diff API.

OpenCode keeps richer workspace state behind its session/server/TUI/snapshot
internals. The snapshot path uses a separate git directory and worktree view to
capture file differences without turning the edited directory into a normal
repository owned by OpenCode.

Entangle should therefore not treat OpenCode-specific diff internals as the
product truth for node work. The safe Local slice is runner-owned harvesting:
Entangle records source workspace changes using a node-local shadow git index
under runtime state, while the engine remains an implementation detail.

## Implemented Behavior

Runner turns now have an optional `sourceChangeSummary` contract with:

- status: `not_configured`, `unchanged`, `changed`, or `failed`;
- checked timestamp;
- changed-file count;
- bounded changed-file summaries;
- total additions and deletions;
- optional bounded unified diff excerpt;
- bounded failure reason when harvesting fails;
- truncation marker.

The runner prepares a source baseline immediately before engine execution and
harvests the source workspace immediately after the engine returns or fails.
This means partial workspace writes remain inspectable even when the engine
turn itself fails.

The harvester uses a shadow git directory at:

```text
<runtime_root>/source-snapshot.git
```

It does not create `.git` under the node `source/` workspace. This keeps the
source workspace an engine worktree and leaves artifact publication, git commit,
and remote push behavior under Entangle policy instead of implicit engine
behavior.

Host observed runner-turn activity and `runner.turn.updated` events now carry
the source change summary. Runtime inspection also exposes the latest source
change summary as `agentRuntime.lastSourceChangeSummary`.

Shared host-client helpers format the same source-change summary for:

- runtime turn status/detail output;
- runtime inspection detail output;
- event trace detail output.

The CLI and Studio consume those shared helpers. Operators can now see whether
the last inspected node turn changed source files, how many files changed, and
bounded file/addition/deletion evidence.

## Boundary Decisions

This slice intentionally does not:

- auto-commit source changes;
- auto-push source changes;
- publish source changes as artifacts;
- trust engine-generated files as accepted work products;
- add artifact history or diff host APIs;
- expose raw workspace paths in protocol-facing locators;
- rely on OpenCode private database, snapshot, or TUI state as Entangle truth.

Source changes are evidence and future source-change candidates. They are not
yet applied to source history, committed, or published artifacts. A later slice
added accepted/rejected/superseded review mutation, and a subsequent slice
added explicit runtime-local source-history application. Policy gates, remote
publication, and artifact linkage remain separate work.

## Remaining B5 Work

The remaining B5 implementation should add:

- approval/policy flow before source application or publication;
- remote publication of reviewed source-history commits;
- source commit or branch artifact records where appropriate;
- source diff artifact records where appropriate;
- artifact history/diff host APIs;
- CLI and Studio diff/history views;
- publication rules tied to the node git principal and policy;
- end-to-end OpenCode-backed smoke coverage proving workspace modification,
  source-change candidate creation, artifact publication, and downstream
  inspection.

## Verification

Focused verification performed for this slice:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/runner test
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli test
pnpm --filter @entangle/studio test
pnpm --filter @entangle/host test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/runner lint
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/host lint
```

Closure verification for the coherent batch:

```bash
git diff --check
pnpm verify
pnpm build
```

Results:

- `git diff --check` passed;
- `pnpm verify` passed;
- the first aggregate `pnpm build` run was manually terminated after the
  already-known idle Studio/Vite phase recurred;
- direct `pnpm --filter @entangle/studio build` passed with only the known Vite
  chunk-size warning;
- repeated aggregate `pnpm build` then passed with the same known Vite
  chunk-size warning.
