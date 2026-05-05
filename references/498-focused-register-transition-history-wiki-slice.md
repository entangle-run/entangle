# Focused Register Transition History Wiki Slice

## Current Repo Truth

Model-guided memory synthesis already maintains focused registers for working
context, stable facts, open questions, decisions, next actions, and
resolutions. It also persists bounded carry-state and transition history in the
runner-local `memory-state/focused-register-state.json` file.

Before this slice, that transition history was durable but not part of the
runner-owned wiki. Future turns, User Client memory views, Studio memory views,
and projected wiki artifacts could see the active register pages, but not the
bounded lifecycle audit explaining which stale entries were closed, completed,
replaced, consolidated, or retired by exact resolution overlap.

## Target Model

Focused-register lifecycle transitions should remain runner-owned, but they
should also be visible through the node wiki because the wiki is the durable
memory substrate Entangle expects every node to maintain and publish.

The Host must not gain a new runner-filesystem read path for accepted federated
assignments. The new surface should be a wiki page that flows through the same
memory refs, wiki repository sync, and projected `wiki.ref` evidence already
used by the rest of node memory.

## Impacted Modules/Files

- `services/runner/src/memory-maintenance.ts`
- `services/runner/src/memory-synthesizer.ts`
- `services/runner/src/memory-synthesizer.test.ts`
- `services/runner/src/runtime-context.ts`
- `services/host/src/state.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a canonical focused-register transition-history wiki path:
  `wiki/summaries/focused-register-transition-history.md`.
- Write that page after successful model-guided memory synthesis from the same
  validated focused-register transition state persisted in runner runtime
  state.
- Add the page to `updatedSummaryPagePaths` so turn outcomes and Host
  projections can show that memory maintenance updated it.
- Add the page to future runner memory refs.
- Add the page to the wiki index.
- Classify the projected page as a focused register in Host memory inspection.
- Extend runner memory-synthesis tests to verify page content, indexing, and
  carry-forward through future memory refs.

## Tests Required

Passed for this slice:

- `pnpm --filter @entangle/runner test -- src/memory-synthesizer.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host test -- src/index.test.ts`

The remaining end-of-slice checks are tracked in `wiki/log.md` and the commit
audit.

## Migration/Compatibility Notes

The change is additive. Existing focused-register state files remain valid.
Older turns can still report fewer updated summary pages; new successful
model-guided synthesis writes one additional summary page.

## Risks And Mitigations

- Risk: lifecycle bookkeeping pollutes the concise working-context page.
  Mitigation: transition details live in a separate summary page linked from
  the wiki index.
- Risk: Host reintroduces federated filesystem coupling.
  Mitigation: Host only classifies projected memory paths; it does not read
  runner-local focused-register state for federated assignments.
- Risk: future turns ignore transition history.
  Mitigation: the new page is included in `collectMemoryRefs()` after it
  exists.

## Open Questions

- Should Studio and User Client eventually render a dedicated transition
  timeline instead of only exposing the markdown page?

## Result

Every successful model-guided synthesis now writes and indexes
`wiki/summaries/focused-register-transition-history.md`. The page captures the
bounded focused-register lifecycle audit in the node wiki, future turns consume
it as a memory ref, and Host memory inspection classifies it with the other
focused registers through projected wiki evidence.
