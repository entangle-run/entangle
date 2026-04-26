# Local Doctor Wiki Repository Health Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle B4/C1 by teaching `entangle deployment doctor`
to inspect node wiki repositories as real runtime state after the first
runner-owned wiki repository sync.

The doctor remains read-only. It reports wiki repository health so an operator
can see whether node memory snapshots are initialized, committed, and clean,
without mutating runtime workspaces or git repositories.

## Entry Audit

The audit read the mandatory repository state files:

- `README.md`;
- `resources/README.md`;
- `wiki/overview.md`;
- `wiki/index.md`;
- `wiki/log.md`;
- `references/180-local-ga-product-truth-audit.md`;
- `references/189-entangle-completion-plan.md`;
- `references/207-local-doctor-foundation-slice.md`;
- `references/210-wiki-repository-sync-slice.md`.

The implementation audit inspected:

- `apps/cli/src/deployment-doctor-command.ts`;
- `apps/cli/src/deployment-doctor-command.test.ts`;
- host-client runtime context access;
- runtime context workspace layout contracts;
- runtime workspace-health list behavior.

## Implemented Behavior

When a live host client is available and live checks are not skipped, the
doctor now:

- lists active host runtimes through the existing host boundary;
- requests each available runtime context through the same host boundary;
- reads each runtime's `workspace.wikiRepositoryRoot`;
- checks whether the repository has a `.git` directory;
- runs bounded git status, branch, and HEAD inspections through the existing
  command runner dependency;
- reports one `Runtime wiki repositories` check.

The check passes when all inspected wiki repositories are initialized, have a
HEAD commit, and have no uncommitted changes.

The check warns when a runtime context is unavailable, the wiki repository root
is not configured, the repository is not initialized, the repository has no
committed snapshot, git inspection fails, or the repository has uncommitted
changes.

## Boundary Decisions

The doctor does not initialize, commit, clean, repair, or publish wiki
repositories. Those remain runner, repair, backup/restore, or future
publication responsibilities.

The check uses runtime context paths only inside the local CLI process. It
does not add filesystem paths to protocol locators or browser-facing runtime
inspection DTOs.

The check is a warning, not a hard failure. A runtime can legitimately have no
wiki repository commit before its first completed executable turn.

## Verification

Focused verification performed during implementation:

```bash
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli test -- deployment-doctor-command.test.ts
```
