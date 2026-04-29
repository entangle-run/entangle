# Artifact Restore Operator Surfaces Slice

## Current Repo Truth

`384-runner-owned-artifact-restore-control-slice.md` added the Host API,
host-client, control event, runner dispatch, and runner-owned restore
execution path for `runtime.artifact.restore`.

The remaining product gap was operator access. CLI and Studio could inspect
runtime artifacts, previews, histories, and diffs, but they could not request
the new restore command without a manual Host API call.

## Target Model

Operator surfaces should expose artifact restore without changing ownership:

- CLI sends the same Host request as any other operator command;
- Studio shows the request form beside selected artifact detail;
- Host still publishes a signed control event;
- the assigned runner still performs the restore and emits observation
  evidence.

Studio remains an admin/operator surface. User Node artifact actions stay in
the User Client and should remain scoped by conversation visibility.

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

- Add `entangle host runtimes artifact-restore <nodeId> <artifactId>`.
- Support optional `--reason`, `--requested-by`, `--restore-id`, and
  `--summary` CLI options.
- Add CLI summary projection for restore request acknowledgements.
- Add Studio restore draft helpers for trimming optional request fields.
- Add a selected-artifact restore form in Studio that calls
  `client.restoreRuntimeArtifact`.
- Reset restore draft/status state when the selected runtime changes.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/cli test -- runtime-artifact-command.test.ts`
- `pnpm --filter @entangle/studio test -- runtime-artifact-restore.test.ts runtime-artifact-inspection.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`

## Migration And Compatibility Notes

This is additive. Existing artifact inspection commands and Studio panels keep
their current behavior.

No direct Host filesystem mutation is reintroduced. CLI and Studio call the
same Host API that publishes the runner-owned control command.

## Risks And Mitigations

- Risk: operators read a request acknowledgement as completion.
  Mitigation: CLI and Studio wording says the restore was requested; retrieval
  completion remains later `artifact.ref` observation evidence.
- Risk: Studio grows into a participant artifact workspace.
  Mitigation: this is an operator command only; User Node conversation-scoped
  artifact review stays in the User Client.

## Open Questions

- Should CLI and Studio later show restore completion status by correlating the
  request id to projected artifact retrieval records?
- Should User Client expose restore requests for visible artifacts, or should
  users ask agent nodes to restore artifacts through conversation messages?
