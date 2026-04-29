# Artifact Backend Cache Status Slice

## Current Repo Truth

Host can resolve projected git artifact history/diff through a derived
Host-owned cache under `host/cache/artifact-git-repositories`. Before this
slice, that cache was intentionally private implementation state, but operators
had no lightweight way to see whether it existed or was growing.

## Target Model

The cache should remain derived, rebuildable Host state. It should not become a
protocol source of truth, but Host status should expose bounded operational
metadata so Studio, CLI, and diagnostics can reason about it.

## Impacted Modules/Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `apps/cli/src/host-status-output.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add an optional `artifactBackendCache` section to Host status contracts.
- Report cache availability, repository count, total size in bytes, and update
  timestamp.
- Build the status by scanning only Host-owned cache directories.
- Add presentation helpers and CLI summary coverage.
- Add Host API and contract tests for the new status field.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host-client test -- src/host-status.test.ts`
- `pnpm --filter @entangle/cli test -- src/host-status-output.test.ts`
- `pnpm verify`

## Migration/Compatibility Notes

The new Host status section is optional in the shared schema so older Host
responses remain parseable by clients during development. Current Host builds
always include it.

## Risks And Mitigations

- Risk: Host status exposes filesystem paths.
  Mitigation: the status reports only availability, count, size, and timestamp.
- Risk: cache scanning becomes expensive.
  Mitigation: the scan is bounded to Host-owned artifact backend cache
  directories and does not inspect remote repositories.
- Risk: operators misread the cache as authoritative state.
  Mitigation: docs state that it is derived and rebuildable.

## Open Questions

- Should cache eviction, max size, or per-service counts become configurable
  before long-running multi-machine deployments?
