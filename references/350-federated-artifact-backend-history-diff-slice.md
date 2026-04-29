# Federated Artifact Backend History Diff Slice

## Current Repo Truth

Projected `artifact.ref` records already made remote artifacts visible without
Host-readable runner files. Before this slice, artifact history and diff reads
for projected refs still stopped at an explicit unavailable reason unless Host
also had a runtime-local materialized repository.

That was correct for safety, but incomplete for federated operation: a git
artifact locator with `gitServiceRef`, `namespace`, `repositoryName`, `branch`,
`commit`, and `path` is enough for Host to resolve a configured git backend
without reading the runner runtime filesystem.

## Target Model

For accepted federated runtime assignments, Host should compute artifact
history and diff from a Host-owned backend cache when:

- the projected artifact is git-backed;
- the git locator includes service, namespace, and repository metadata;
- the active semantic runtime context includes a matching git service profile;
- the remote git backend is reachable from Host.

Host must not use `runtimeRoot` or runner-local materialization as the
federated source of truth.

## Impacted Modules/Files

- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a Host artifact git resolver cache under `host/cache`.
- Resolve projected git artifact locators through the semantic
  `artifactContext` and configured git service profiles.
- Clone/fetch the remote repository into a Host-owned cache directory.
- Reuse bounded git history and diff computation against the cached backend
  repository.
- Keep non-federated local materialization as the preferred adapter path.
- Preserve unavailable reasons when a projected locator is not resolvable or
  the backend cannot be reached.
- Add a Host regression test using a file-backed git service and an accepted
  federated assignment.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`
- `pnpm verify`

## Migration/Compatibility Notes

No persisted data migration is required. The new cache is rebuildable Host
derived state and lives under `host/cache/artifact-git-repositories`.

Existing projected artifacts without repository metadata still return explicit
unavailable history/diff reasons.

## Risks And Mitigations

- Risk: remote git credentials leak into diagnostics.
  Mitigation: cache paths and remote URLs are sanitized from unavailable
  reasons.
- Risk: Host silently depends on runner-local files again.
  Mitigation: the resolver uses semantic artifact context plus git remotes, and
  the regression test runs after assignment acceptance.
- Risk: unreachable remotes make history/diff unavailable.
  Mitigation: unavailable responses remain typed and bounded; callers can still
  inspect the projected artifact ref and preview.

## Open Questions

- Should cache eviction and refresh policy become configurable before the
  three-machine proof?
- Should non-primary artifact repository provisioning be added before artifact
  restore/promotion is reintroduced?
