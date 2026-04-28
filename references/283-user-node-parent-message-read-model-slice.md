# User Node Parent Message Read Model Slice

## Current Repo Truth

User Node inbox records already persist inbound and outbound messages, relay
publish coverage, approval metadata, artifact refs, and local read state. The
read model did not preserve `parentMessageId`, even though A2A messages carry
that field for replies, approval responses, read receipts, and other threaded
conversation events.

Without the parent link, the Human Interface Runtime could display a flat
history but could not show which message a reply or approval was responding to.
That also weakens future delivery retry and conversation repair work because
the failed or retried message cannot be connected back to its source request.

## Target Model

The User Node read model should preserve A2A parent links for both inbound and
outbound messages. The User Client should render that thread evidence directly
from Host projection/read state, not by decoding relay events locally.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/283-user-node-parent-message-read-model-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `parentMessageId` to `UserNodeMessageRecord`.
- Persist outbound parent links from User Node publish requests.
- Persist inbound parent links from received A2A messages.
- Render parent links in the runner-served User Client message history.
- Add schema, Host, and User Client tests for the preserved link.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- all listed typechecks and focused tests passed;
- `pnpm --filter @entangle/host-client typecheck` and
  `pnpm --filter @entangle/host-client test` passed;
- `pnpm --filter @entangle/cli typecheck` and
  `pnpm --filter @entangle/studio typecheck` passed;
- package/Host/runner lint checks passed;
- `node --check scripts/smoke-federated-process-runner.mjs` and
  `git diff --check` passed.

## Migration/Compatibility Notes

Existing recorded User Node messages without `parentMessageId` remain valid.
New records include the field only when the original publish request or
received A2A message carried it.

## Risks And Mitigations

- Risk: showing raw event ids makes the User Client noisy.
  Mitigation: this first slice favors auditability; richer labels can resolve
  parent ids to compact message summaries later.
- Risk: future retry state needs more than parent links.
  Mitigation: parent links are the prerequisite; delivery state can build on
  this without another message-record migration.

## Open Questions

Whether the final bundled User Client should collapse parent event ids into
human-readable reply snippets or keep raw ids visible for audit mode.
