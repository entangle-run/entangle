# Artifact Backend Cache Clear Slice

## Current Repo Truth

Host can resolve projected git artifact history/diff through a derived
Host-owned backend cache and now reports bounded cache status metadata. Before
this slice, operators could see cache availability, repository count, and size,
but had no Host API or CLI control to clear that rebuildable state.

## Target Model

Artifact backend cache state remains derived implementation state, not protocol
truth. Operators may dry-run or clear the cache through the Host boundary when
diagnosing stale backend clones or reclaiming space. Clearing must remove only
cache repository directories under Host-owned cache state and must not mutate
artifacts, projections, runner state, git backends, or graph state.

## Impacted Modules/Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `apps/cli/src/index.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add request/response contracts for artifact backend cache clear operations.
- Add a Host state helper that dry-runs or removes cache repository directories.
- Add a Host API route under the operator-protected Host boundary.
- Add a shared host-client method and presentation helper.
- Add a CLI command for dry-run and clear workflows.
- Keep Host status and cache clear output path-free.

## Tests Required

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host-client test -- src/index.test.ts src/host-status.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm verify`

## Migration/Compatibility Notes

This is an additive pre-release Host API and CLI surface. Existing clients can
ignore it. Cache clear does not delete authoritative Host projection, artifact,
runner, or git backend state; later history/diff requests can rebuild the cache
from resolvable artifact locators.

## Risks And Mitigations

- Risk: cache clear is mistaken for artifact deletion.
  Mitigation: route, docs, and summary text describe only the artifact backend
  cache and report repository count/size, not artifact ids.
- Risk: clearing the cache removes non-cache files.
  Mitigation: the helper removes only child directories under the dedicated
  `artifact-git-repositories` cache root.
- Risk: operators need a safe preview.
  Mitigation: the request supports `dryRun` and the CLI exposes `--dry-run`.

## Open Questions

Partially resolved by `400-artifact-backend-cache-prune-policy-slice.md` and
`406-artifact-backend-cache-size-policy-slice.md`: cache clear now supports
max-age pruning through `olderThanSeconds` and max-size pruning through
`maxSizeBytes` while preserving dry-run behavior. Further resolved by
`409-artifact-backend-cache-target-policy-slice.md`: cache clear can now scope
to git service, namespace, and repository selectors. Automatic cache rebuild
diagnostics remain open.
