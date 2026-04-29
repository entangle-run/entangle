# Artifact Backend Cache Size Policy Slice

## Current Repo Truth

Host can report derived artifact backend cache status and can dry-run, clear,
or age-prune cached git repository clones under the Host-owned cache root. That
keeps the cache rebuildable and path-free, but longer-running operators still
need a bounded disk policy when the cache grows even if repositories are not
old enough to match an age threshold.

## Target Model

Artifact backend cache remains Host implementation state, not protocol truth.
Operators should be able to preview or enforce a maximum retained cache size
through the same Host boundary:

- age pruning runs first when `olderThanSeconds` is provided;
- size pruning then selects the oldest retained derived repositories until the
  retained cache size is at or below `maxSizeBytes`;
- clear with no policy still removes all derived cache repositories;
- responses stay path-free and report selected repository count, retained
  repository count, selected bytes, and retained bytes;
- no authoritative artifact, projection, runner, git backend, or graph state is
  mutated.

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
- `references/400-artifact-backend-cache-prune-policy-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the cache clear request with optional `maxSizeBytes`.
- Extend the clear response with optional `maxSizeBytes` and
  `retainedSizeBytes`.
- Preserve clear-all behavior when no pruning policy is supplied.
- Compute per-repository cache sizes once and use them for both selected bytes
  and retained bytes.
- Apply age pruning before max-size pruning when both policies are supplied.
- Add CLI `--max-size-bytes`.
- Update shared clear-summary formatting.
- Extend Host, contract, host-client, and CLI tests.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm test`
- `pnpm --filter @entangle/cli exec tsx src/index.ts host artifact-backend-cache-clear --help`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is an additive pre-release request/response widening. Existing callers
that omit `maxSizeBytes` keep existing behavior. Existing callers that omit both
`olderThanSeconds` and `maxSizeBytes` still clear all derived cache repositories.
Existing clients can ignore the new response fields.

## Risks And Mitigations

- Risk: operators mistake size pruning for artifact deletion.
  Mitigation: docs, route naming, and summaries continue to describe only the
  derived artifact backend cache.
- Risk: size pruning deletes repositories that are likely to be reused.
  Mitigation: this is explicit operator-controlled pruning over rebuildable
  cache state; future cache metadata can add access-time-aware ordering.
- Risk: Host reports filesystem paths.
  Mitigation: responses expose counts, byte totals, timestamps, and policy
  fields only.
- Risk: pruning policy accidentally changes clear-all compatibility.
  Mitigation: Host tests cover no-policy clear-all, age-prune dry-run, and
  max-size dry-run.

## Open Questions

- Should future cache policy add per-backend selectors, automatic rebuild
  diagnostics, or access-time metadata for better eviction ordering?

Per-backend target selectors are resolved by
`409-artifact-backend-cache-target-policy-slice.md`; automatic rebuild
diagnostics and access-time metadata remain future options.
