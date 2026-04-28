# Runner Observed Ref Emission Slice

## Current Repo Truth

Host already has signed-observation reducers for `artifact.ref`,
`source_change.ref`, and `wiki.ref`, and `GET /v1/projection` exposes the
resulting `artifactRefs`, `sourceChangeRefs`, and `wikiRefs` arrays. Before this
slice those reducers were only exercised directly in Host tests. Normal runner
turn execution still wrote artifact records, source-change candidates, and
wiki-repository sync outcomes to runner-local state without emitting the
corresponding observation payloads.

That meant federated Host projection could show sessions, conversations, and
turn phase updates from joined runners, but not the portable work refs that are
needed for artifact/source/wiki review surfaces.

## Target Model

Every assigned agent runner should emit bounded refs as part of normal turn
execution:

- retrieved and produced artifacts emit `artifact.ref`;
- persisted source-change candidates emit `source_change.ref`;
- successful wiki-repository syncs emit `wiki.ref`;
- updated turn observations include wiki-repository sync outcomes.

Runner-local files remain implementation detail. Host receives portable refs
through the observe protocol and folds them into projection state through the
existing control-plane reducers.

## Impacted Modules/Files

- `services/runner/src/service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- extended `RunnerServiceObservationPublisher` with optional observed-ref
  publishing methods for artifacts, source-change candidates, and wiki refs;
- added non-blocking runner helpers that emit observed refs without letting
  transport failures corrupt runner-local execution;
- emitted `artifact.ref` observations for retrieved artifacts, retrieval
  failure records, and produced report artifacts;
- emitted `source_change.ref` observations when source-change candidates are
  persisted;
- emitted `wiki.ref` observations when wiki-repository sync returns a concrete
  local wiki snapshot commit;
- published a final turn observation after wiki-repository sync so federated
  Host projection can receive memory sync outcomes;
- wired the generic joined-runner observation publisher to create
  `artifact.ref`, `source_change.ref`, and `wiki.ref` protocol payloads;
- added runner test coverage proving normal source-changing turns publish
  source, artifact, and wiki ref observations.

Deferred to later slices:

- projection-backed artifact content and source diff fetching from remote git
  or object backends;
- richer source-change observation payloads carrying bounded summaries;
- read-receipt and retry-state projection for User Client delivery UX;
- remote wiki publication as the canonical portable wiki content path.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- service.test.ts`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- `pnpm --filter @entangle/runner typecheck` passed;
- `pnpm --filter @entangle/runner test -- service.test.ts` passed;
- `pnpm --filter @entangle/runner lint` passed;
- `node --check scripts/smoke-federated-process-runner.mjs` passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

The new publisher methods are optional, so existing tests and embedded runner
uses that only care about session/conversation/turn observations continue to
work. Runners without a federated observation publisher still write the same
local records as before.

The emitted wiki ref is a bounded logical wiki ref for the node's current wiki
snapshot. It does not replace the explicit wiki-repository publication path,
which remains the portable git-backed publication workflow.

## Risks And Mitigations

- Risk: observation publishing failure could break a turn.
  Mitigation: all new observed-ref publishing helpers follow the existing
  session/turn observation pattern and swallow transport errors.
- Risk: wiki refs imply stronger portability than the current local wiki sync
  provides.
  Mitigation: the doc and implementation treat these as bounded logical refs;
  canonical remote wiki content still requires the existing publication path.
- Risk: Host projection still cannot render full artifact/source content
  without local detail endpoints.
  Mitigation: this slice feeds the projection with refs first; content preview
  migration remains a separate slice.

## Open Questions

No open question blocks this slice. The next implementation step should either
make source-change observations carry bounded summary metadata or add
projection-backed artifact/source content fetchers for git-backed refs.
