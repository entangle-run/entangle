# Projected Artifact History Diff Read API Slice

## Current Repo Truth

Artifact list/detail/preview reads can use observed `artifact.ref` projection,
but artifact history and diff routes still rejected requests before lookup when
the runtime had no Host-readable context. That made projected remote artifacts
inspectable only up to preview.

Full git history/diff still requires a repository checkout or object backend
that Host can resolve. Projected artifact refs alone are not enough to compute
history or diffs.

## Target Model

Artifact history/diff APIs should remain stable for remote artifacts: they
should return the projected artifact identity and an explicit unavailable
history/diff reason when Host has no backend-resolved repository checkout,
instead of failing on local context availability.

## Impacted Modules/Files

- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Remove local context preconditions from artifact history/diff routes.
- Keep local git history/diff as the preferred high-fidelity path.
- Fall back to projected artifact records with `available:false` history/diff
  results when only projection is available.
- Add Host API tests covering projected artifact history/diff responses.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host lint`

## Migration/Compatibility Notes

No persisted data migration is required. Clients that previously saw a 409 for
remote projected artifacts can now render the artifact record plus an explicit
unavailable reason.

## Risks And Mitigations

- Risk: callers may interpret `available:false` as a successful full history
  lookup.
  Mitigation: unavailable reasons state that no backend-resolved repository
  checkout is attached to Host.
- Risk: this masks the need for real object-backend history retrieval.
  Mitigation: docs keep backend-resolved artifact history/diff as a remaining
  deeper implementation area.

## Open Questions

- Which git/object backend resolver should be canonical for computing remote
  artifact history and diffs without cloning into Host-managed local state?
