# Artifact Backend Cache Prune Policy Slice

## Current Repo Truth

Host exposes derived artifact backend cache status and can dry-run or clear all
cached git repository clones under the Host-owned cache root. This slice added
age pruning for stale derived repositories; `406-artifact-backend-cache-size-policy-slice.md`
extends the same boundary with max-size pruning for disk-bound cache control.

## Target Model

Artifact backend cache remains rebuildable Host implementation state. Operators
should be able to clear all derived repositories, prune repositories older than
a bounded age, or combine age pruning with later size pruning:

- use the existing Host operator boundary;
- keep the cache path-free in responses and summaries;
- preserve dry-run behavior;
- report selected and retained repository counts;
- do not mutate authoritative artifact, projection, runner, git backend, or
  graph state.

## Impacted Modules And Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `apps/cli/src/index.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/353-artifact-backend-cache-clear-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the cache clear request with optional `olderThanSeconds`.
- Extend the clear response with optional `olderThanSeconds` and
  `retainedRepositoryCount`.
- Select cache repository directories by directory modification time when an
  age threshold is supplied.
- Keep `repositoryCount` as the number of selected repositories.
- Add CLI `--older-than-seconds`.
- Update shared clear-summary formatting.
- Extend Host, contract, host-client, and CLI tests.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/types build`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client test -- src/index.test.ts src/host-status.test.ts`
- `pnpm --filter @entangle/host-client exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter @entangle/cli test -- src/host-status-output.test.ts`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`;
- `git diff --check`;
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is an additive pre-release request/response widening. Existing callers
that omit `olderThanSeconds` keep the previous clear-all behavior. Existing
clients can ignore the new response fields.

## Risks And Mitigations

- Risk: operators misread pruning as artifact deletion.
  Mitigation: docs, route naming, and summaries continue to describe only the
  derived artifact backend cache.
- Risk: Host reports filesystem paths.
  Mitigation: responses expose counts, sizes, timestamps, and policy fields
  only.
- Risk: directory mtime is an imperfect recency signal.
  Mitigation: this is a conservative first pruning policy over derived cache
  directories; future cache metadata can make repository access time explicit.

## Open Questions

Max-size pruning is resolved by
`406-artifact-backend-cache-size-policy-slice.md`. Future policy may still add
per-backend selectors or automatic rebuild diagnostics.
