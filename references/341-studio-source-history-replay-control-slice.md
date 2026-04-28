# Studio Source History Replay Control Slice

## Current Repo Truth

Source-history replay now exists as a federated Host Authority control command:
Host publishes `runtime.source_history.replay` to the accepted runner
assignment, the runner validates source-application approval policy and source
tree safety, and Host observes receipts plus `source_history.replayed`.

CLI already exposes that request path through
`entangle host runtimes source-history-replay`. Studio could inspect
source-history entries but had no matching operator request control.

## Target Model

Studio remains the admin/operator surface. It may request source-history replay
through Host, but it must not write runner workspaces, infer runner-local paths,
or treat Host request acceptance as replay completion.

The selected-runtime source-history detail panel should let an operator submit
optional approval id, reason, replay id, and requester metadata. The response is
shown as a requested control command; outcome evidence remains in assignment
receipts, host events, and `source_history.replayed` projection.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-source-history-inspection.ts`
- `apps/studio/src/runtime-source-history-inspection.test.ts`
- `apps/studio/src/styles.css`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`

## Concrete Changes Required

- Add Studio helper functions for source-history replay request drafts and
  requested-response summaries.
- Add selected source-history replay form fields in Studio.
- Call `host-client.replayRuntimeSourceHistory` from Studio and show requested
  command feedback.
- Keep replay completion separate from request feedback.

## Tests Required

- Studio helper test for replay request building and summary formatting.
- Studio typecheck.
- Studio lint.

## Verification Run

- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio exec vitest run --config ../../vitest.config.ts --environment node src/runtime-source-history-inspection.test.ts`

## Migration/Compatibility Notes

This restores an operator-visible replay action in Studio without restoring the
old direct Host replay mutation. Existing source-history inspection remains
read-only unless the operator explicitly submits a federated replay request.

## Risks And Mitigations

- Risk: operators confuse request acceptance with replay completion.
  Mitigation: the Studio summary says the command was requested; replay outcome
  remains separate receipt/event evidence.
- Risk: Studio drifts from CLI.
  Mitigation: both surfaces use the same host-client replay request method and
  Host API contract.
- Risk: source-application approval requirements are bypassed.
  Mitigation: Studio only forwards an optional approval id; policy enforcement
  remains in RunnerService.

## Open Questions

- Add a projection-backed replay timeline panel once replay observations become
  first-class runtime read models rather than host-event-only evidence.
