# Projection Empty Memory Read Model Slice

## Current Repo Truth

Most deep runtime read APIs can now fall back to Host projection when Host has
no runner-local filesystem context. Runtime memory inspection still returned a
conflict when a graph node had no realizable runtime context and had not yet
projected any wiki refs. That made an empty remote memory/wiki state look like
a local deployment error.

## Target Model

For nodes that exist in the active graph, memory inspection should be a
projection-backed read model even before any wiki refs have arrived:

- local runtime memory files remain preferred when available;
- projected wiki refs are merged when present;
- no local context and no projected refs returns an empty
  `projection://<nodeId>/wiki-refs` memory view instead of a conflict;
- unknown nodes still return `null` to the Host route and remain 404.

## Impacted Modules And Files

- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Have `getRuntimeMemoryInspection` check active graph membership separately
  from filesystem context availability.
- Return an empty projection memory inspection for active graph nodes when
  there is no local context and no projected wiki ref.
- Extend Host route coverage so a context-unavailable runtime still returns
  an empty memory read model while `/context` remains a conflict.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/host test -- --runInBand`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This changes a conflict response into a successful empty read model for active
graph nodes. Unknown runtime ids still return 404 at the route boundary.

## Risks And Mitigations

- Risk: empty memory projection hides an actual runtime materialization error.
  Mitigation: `/v1/runtimes/:nodeId/context`, runtime inspection, and Host
  status still expose context unavailability; memory inspection now only says
  there are no projected memory pages.
- Risk: clients depend on 409 for missing memory context.
  Mitigation: the project has not released, and returning an empty projection
  is aligned with federated remote runtime behavior.

## Open Questions

- Should memory page detail eventually expose a typed empty/not-yet-projected
  response instead of 404 for individual pages on remote nodes?
