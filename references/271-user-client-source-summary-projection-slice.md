# User Client Source Summary Projection Slice

## Current Repo Truth

The runner-served User Client already renders approval requests, approval
resource metadata, and a `Review diff` action for `source_change_candidate`
resources. The previous slice made Host projection carry bounded
`sourceChangeSummary` metadata on observed source-change refs.

Before this slice, the User Client did not consume that projection metadata on
the main conversation page. A human User Node could see the candidate id and
open the deep diff route, but could not triage the source change from the
message card itself.

## Target Model

The User Client should render safe, bounded source-review metadata directly
from Host projection:

- file count;
- additions/deletions;
- changed-file list;
- truncation marker;
- existing deep diff link for explicit review.

This keeps the running User Node interface useful even before the full
projection-backed diff/content migration is complete.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- User Client state now fetches Host projection in addition to the User Node
  inbox;
- approval resource rendering resolves matching projected
  `source_change_candidate` refs by candidate id and source node id;
- source-change approval cards render bounded summary metadata and changed-file
  rows before the `Review diff` action;
- runner Human Interface Runtime tests cover projection-backed source summary
  rendering on the conversation page.

Deferred to later slices:

- projection-backed diff content route that does not call deep runtime detail
  endpoints;
- richer source/wiki review controls inside the User Client;
- read receipts and delivery retry history.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/runner lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- `pnpm --filter @entangle/runner typecheck` passed;
- `pnpm --filter @entangle/runner test -- index.test.ts` passed before the
  final lint/check pass;
- `pnpm --filter @entangle/runner lint` passed;
- `node --check scripts/smoke-federated-process-runner.mjs` passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

Projection fetching is additive. If Host projection is unavailable, the User
Client still renders inbox and conversation history and simply omits
source-change summaries.

## Risks And Mitigations

- Risk: projection fetch failure makes the whole User Client look broken.
  Mitigation: failures are folded into the existing non-fatal state error path;
  conversations still render from the inbox response.
- Risk: source summaries are mistaken for full review.
  Mitigation: the `Review diff` action remains the explicit detailed review
  path, and future work will move that path to projection-backed content.

## Open Questions

No open question blocks this slice. The remaining architecture gap is
projection-backed source diff and artifact content fetching.
