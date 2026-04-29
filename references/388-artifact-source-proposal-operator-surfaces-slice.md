# Artifact Source Proposal Operator Surfaces Slice

## Current Repo Truth

`387-runner-owned-artifact-source-proposal-slice.md` added the federated
artifact-to-source execution path: Host publishes a signed
`runtime.artifact.propose_source_change` control command, the accepted runner
retrieves the artifact, safely copies bounded content into its source
workspace, harvests a `pending_review` source-change candidate, and emits
signed `source_change.ref` evidence.

The remaining operator gap was access. The Host API and host-client supported
the request, but CLI and Studio still had no first-class way to trigger it
from artifact inspection.

## Target Model

Operator surfaces should expose artifact source-change proposal requests
without changing ownership:

- CLI sends the same Host request as any other operator command;
- Studio shows the request form beside selected artifact detail;
- Host still publishes a signed control event;
- the assigned runner still retrieves the artifact and creates only a
  `pending_review` candidate;
- completion remains visible through projected `source_change.ref` evidence
  and existing source-change candidate read surfaces.

Studio remains an admin/operator surface. Human graph participants should
continue to interact through the User Client and signed User Node messages.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/runtime-artifact-command.ts`
- `apps/cli/src/runtime-artifact-command.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-artifact-restore.ts`
- `apps/studio/src/runtime-artifact-restore.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `entangle host runtimes artifact-source-proposal <nodeId> <artifactId>`.
- Support optional `--reason`, `--requested-by`, `--proposal-id`,
  `--target-path`, `--overwrite`, and `--summary` CLI options.
- Add CLI summary projection for proposal request acknowledgements.
- Add Studio proposal draft helpers for trimming optional request fields.
- Add a selected-artifact Studio form that calls
  `client.proposeRuntimeArtifactSourceChange`.
- Reset proposal draft/status state when the selected artifact or runtime
  changes.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/cli test -- runtime-artifact-command.test.ts`
- `pnpm --filter @entangle/studio test -- runtime-artifact-restore.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- `git diff -U0 | rg "^\\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`

The added-line local-assumption audit produced no hits.

## Migration And Compatibility Notes

This is additive. Existing artifact inspection, restore, source-history,
source-change candidate, and User Client behavior is unchanged.

No Host filesystem mutation is reintroduced. CLI and Studio call the same Host
API that publishes the runner-owned control command.

## Risks And Mitigations

- Risk: operators read a request acknowledgement as source application.
  Mitigation: CLI and Studio wording says the proposal was requested; the
  result is a later `pending_review` source-change candidate.
- Risk: proposal controls bypass User Node review.
  Mitigation: the runner creates only a pending candidate; source-history
  application still uses the existing signed review path.
- Risk: Studio grows into a participant workspace.
  Mitigation: this is an operator request; User Node artifact participation
  remains scoped to the User Client.

## Open Questions

- Should User Client later expose artifact proposal requests for artifacts
  visible in a selected User Node conversation?
- Should proposal request acknowledgements later correlate directly to the
  resulting source-change candidate id in Host projection?
