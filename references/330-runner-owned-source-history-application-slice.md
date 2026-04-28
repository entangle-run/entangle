# Runner-Owned Source History Application Slice

## Current Repo Truth

User Node source-change review is already signed and delivered as
`source_change.review` A2A messages. The owning runner applies accepted or
rejected review decisions to runner-local source-change candidate records and
emits updated `source_change.ref` observations.

The next step was still Host-centric: turning an accepted source-change
candidate into source history depended on Host mutation routes reading and
writing the runner's runtime filesystem. That is wrong for the federated model
because the runner owns the workspace and source snapshot.

## Target Model

When a User Node accepts a source-change candidate, the owning runner should
perform the immediate source-history application inside the runner boundary and
then publish the updated candidate through observation. Host should learn about
the application through projected evidence, not by directly mutating
runner-owned files.

This slice does not remove older Host source mutation APIs yet. It makes the
normal signed User Node review path produce runner-owned source history first.

## Impacted Modules/Files

- `services/runner/src/source-history.ts`
- `services/runner/src/service.ts`
- `services/runner/src/state-store.ts`
- `services/runner/src/service.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added runner state-store support for source-history records;
- added runner-local source-history application helpers over the existing
  `source-snapshot.git` shadow repository;
- when `source_change.review` accepts a candidate, the runner now:
  - verifies the candidate has a shadow git snapshot;
  - verifies the runner-local source workspace is still at the candidate head or
    base tree;
  - records source history under runner-owned state;
  - adds `candidate.application`;
  - emits the updated candidate through `source_change.ref` observation;
- updated runner service coverage for signed source review to assert
  source-history application;
- updated the process-runner smoke to require projected
  `candidate.application.sourceHistoryId` after User Client source review.

## Tests Required

Verification run:

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/service.test.ts src/state-store.test.ts`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/runner build`
- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

The runner test command currently runs all runner unit tests through the package
script glob; all invoked tests passed.

## Migration/Compatibility Notes

The change is additive. Existing Host source-history apply/publish/replay APIs
remain in place for compatibility/debug paths, but the signed User Node review
path now records source history in the runner first.

The source-history record is still runner-local. Host projection currently sees
the application through the projected source-change candidate. A dedicated
source-history observation/projection can be added later if operator surfaces
need source-history timelines independent from candidate records.

## Risks And Mitigations

- Risk: automatic source-history application after review may surprise old
  workflows that expected a separate Host apply step. Mitigation: this project
  is pre-release, and the federated model requires runner ownership for normal
  source mutation.
- Risk: conflicts are only visible as absence of `candidate.application`.
  Mitigation: keep the application conservative; add explicit failed
  source-history application observations in a later slice if needed.

## Open Questions

- Should Entangle add a first-class `source_history.ref` observation so Host can
  project source-history timelines without reading runner-local history files?
