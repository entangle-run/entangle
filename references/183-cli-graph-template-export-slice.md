# CLI Graph Template Export Slice

Date: 2026-04-25.

## Purpose

Add a concrete graph template workflow for Local Workbench without introducing
a new host contract before the existing graph apply/validate path needs it.

## Implemented Surface

- Added `entangle graph templates list`.
- Added `entangle graph templates export <templateId> <file>`.
- Registered the existing canonical `examples/local-preview/graph.json` as the
  built-in `local-preview` graph template.
- Template export writes pretty JSON and resolves destination paths relative to
  the original shell directory when run through `pnpm --filter`.
- Exported templates can be validated with the existing `entangle graph
  inspect` command and applied with the existing host graph apply command.

## Boundaries

This slice does not add:

- package import/export archives;
- graph template editing in Studio;
- host-owned graph template storage;
- graph import/export bundle format;
- revision restore or rollback.

## Verification

The slice was verified with:

```bash
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli dev graph templates list
pnpm --filter @entangle/cli dev graph templates export local-preview <tmp>/graph.json
pnpm --filter @entangle/cli dev graph inspect <tmp>/graph.json
```

All listed commands passed on 2026-04-25.
