# Artifact Backend Cache Target Policy Slice

## Current Repo Truth

Host can report, dry-run, clear, age-prune, and max-size-prune the derived git
artifact backend cache. Before this slice, pruning policies applied to all
cached repositories; operators could not target one git service, namespace, or
repository when only one backend target needed refresh.

## Target Model

Artifact backend cache clear remains an operator action over rebuildable Host
implementation state. Operators should be able to scope any clear/prune policy
to a git backend target:

- `gitServiceRef` selects one git service cache prefix;
- `namespace` narrows the selector and requires `gitServiceRef`;
- `repositoryName` narrows the selector and requires both `gitServiceRef` and
  `namespace`;
- clear-all, age pruning, and max-size pruning apply only to matched cache
  repositories when a selector is present;
- responses echo the selector and report matched, selected, retained, selected
  byte, and retained byte counts without exposing filesystem paths.

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
- `references/406-artifact-backend-cache-size-policy-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add cache selector fields to clear request/response contracts.
- Validate selector dependencies in `packages/types`.
- Filter Host cache candidates by sanitized git target prefix before applying
  clear, age, or size policy.
- Return `matchedRepositoryCount`.
- Add CLI `--git-service`, `--namespace`, and `--repository` flags.
- Include target and matched counts in shared clear summaries.
- Extend contract, Host, host-client, and CLI/help coverage.

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
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/cli dev host artifact-backend-cache-clear --help`
- `pnpm typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is an additive pre-release request/response widening. Existing callers
that omit selector fields keep previous all-cache behavior. Existing clients
can ignore selector echoes and `matchedRepositoryCount`.

## Risks And Mitigations

- Risk: target matching is mistaken for authoritative artifact deletion.
  Mitigation: docs and summaries continue to name only derived artifact backend
  cache state.
- Risk: prefix matching selects unexpected cache directories.
  Mitigation: cache directories are generated from sanitized git target ids;
  selector fields follow the same sanitization path and support increasingly
  narrow service/namespace/repository scoping.
- Risk: selector response counts confuse all-cache totals.
  Mitigation: `matchedRepositoryCount` reports the scoped set; `repositoryCount`
  remains selected repositories and status still reports all-cache totals.

## Open Questions

- Future cache policy may add automatic rebuild diagnostics or access-time
  metadata, but service/namespace/repository selector control is now present.
