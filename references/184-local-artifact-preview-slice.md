# Local Artifact Preview Slice

Date: 2026-04-25.

## Scope

This L2 Local Workbench slice adds bounded text preview for locally
materialized runtime artifacts.

Implemented:

- `RuntimeArtifactPreviewResponse` in `packages/types`;
- host route
  `GET /v1/runtimes/{nodeId}/artifacts/{artifactId}/preview`;
- safe host-side preview reads limited to the runtime artifact workspace and
  retrieval cache;
- shared host-client method `getRuntimeArtifactPreview(...)`;
- CLI `entangle host runtimes artifact <nodeId> <artifactId> --preview`;
- Studio selected-artifact preview panel.

Not implemented:

- artifact history or diff;
- artifact restore or rollback;
- binary preview;
- arbitrary local filesystem reads;
- object-storage artifact service;
- Cloud or Enterprise artifact workflows.

## Verification

Focused verification passed with:

```bash
pnpm --filter @entangle/types test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
```

The full L2 release gate is still pending and must pass before tagging
`v0.2-local-workbench`.
