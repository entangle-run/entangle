# Local Memory Workbench Slice

Date: 2026-04-25.

## Scope

This L2 Federated Workbench slice exposes runner-owned runtime memory for operator
inspection without changing runner memory ownership or workspace structure.

Implemented:

- host contracts for runtime memory page summaries and bounded memory-page
  preview;
- `GET /v1/runtimes/{nodeId}/memory`;
- `GET /v1/runtimes/{nodeId}/memory/page?path=...`;
- path-bounded preview reads under the existing runtime memory root;
- page classification for focused summary registers, task pages, schema, wiki
  index/log, and supporting wiki pages;
- host-client parsing and presentation helpers;
- CLI commands:
  - `entangle host runtimes memory <nodeId>`;
  - `entangle host runtimes memory-page <nodeId> <path>`;
- Studio Runtime Memory panel with focused registers, task pages, supporting
  wiki pages, and bounded preview for a selected page.

Not implemented:

- memory editing;
- memory-as-repo redesign;
- shared/global memory service;
- semantic memory search;
- new runner builtin tools;
- coding-agent workspace/runtime changes.

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
pnpm --filter @entangle/cli dev host runtimes memory --help
pnpm --filter @entangle/cli dev host runtimes memory-page --help
```

The L2 release packet records the final repository-level and Docker-backed
release gate.
