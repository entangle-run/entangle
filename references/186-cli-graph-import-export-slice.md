# CLI Graph Import Export Slice

Date: 2026-04-25.

## Scope

This L2 Local Workbench slice adds a safer headless graph import/export
workflow over the existing host graph API.

Implemented:

- `entangle host graph export <file>` writes the active graph JSON from the
  host to a destination file;
- `entangle host graph import <file>` validates the graph candidate through
  the host before applying it;
- `entangle host graph import <file> --dry-run` validates without applying;
- compact CLI summaries for export and import validation/application results.

Not implemented:

- graph bundle archives;
- graph revision restore or rollback;
- host-owned graph diff API;
- Studio graph import/export.

## Verification

Focused verification passed with:

```bash
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli dev host graph import --help
pnpm --filter @entangle/cli dev host graph export --help
```

The full L2 release gate is still pending and must pass before tagging
`v0.2-local-workbench`.
