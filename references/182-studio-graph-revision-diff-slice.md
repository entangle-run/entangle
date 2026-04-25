# Studio Graph Revision Diff Slice

Date: 2026-04-25.

## Purpose

Give the Local Workbench a first visual graph-diff surface while keeping CLI
and Studio on one shared graph-diff implementation.

## Implemented Surface

- Moved the graph diff engine from the CLI into `packages/host-client`.
- Kept `entangle graph diff` on the same implementation through a thin CLI
  re-export.
- Added Studio graph-diff presentation helpers for compact totals, identity
  changes, and node/edge rows.
- Added a `Diff Against Active` card under selected graph revision detail in
  Studio.
- The Studio diff compares the selected persisted revision against the current
  active graph already loaded from the host.

## Boundaries

This is a client-side graph revision comparison. It does not add:

- a host-owned graph diff endpoint;
- graph file import/export;
- graph template creation;
- a validation drawer for candidate graph JSON;
- automatic rollback or restore of historical revisions.

Those remain Local Workbench follow-up work.

## Verification

The slice was verified with:

```bash
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
pnpm verify
pnpm build
pnpm ops:check-local:strict
pnpm ops:smoke-local:disposable --skip-build --keep-running
pnpm ops:smoke-local
```

All listed commands passed on 2026-04-25.
