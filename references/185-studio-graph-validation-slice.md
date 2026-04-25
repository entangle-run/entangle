# Studio Graph Validation Slice

Date: 2026-04-25.

## Scope

This L2 Local Workbench slice adds host-backed active-graph validation to
Studio.

Implemented:

- Studio `Graph Validation` panel;
- active graph validation through the existing shared host-client
  `validateGraph(...)` method;
- validation status, error count, warning count, and bounded finding rows;
- shared Studio formatting helpers for validation finding counts and rows.

Not implemented:

- graph import/export;
- imported-candidate validation before apply;
- graph revision restore or rollback;
- host-owned graph diff API.

## Verification

Focused verification passed with:

```bash
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
```

The full L2 release gate is still pending and must pass before tagging
`v0.2-local-workbench`.
