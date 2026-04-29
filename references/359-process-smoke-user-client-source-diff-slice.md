# Process Smoke User Client Source Diff Slice

## Current Repo Truth

The process-runner smoke verifies Host source-change candidate list/detail,
diff, and file preview APIs, then submits source-candidate review through the
running User Client. After the User Client source-change visibility boundary,
the smoke still did not explicitly prove the running User Client diff route
with selected-conversation context.

## Target Model

The fast product proof should show that the human-node client can inspect the
source-change diff it is about to review. The running User Client should load
diff evidence only for a source-change candidate visible through the selected
User Node conversation, either by an inbound approval request resource or by a
Host-projected same-session source-change candidate from the conversation peer.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `services/runner/src/human-interface-runtime.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/358-user-client-source-change-visibility-boundary-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Call the running User Client
  `/api/source-change-candidates/diff` route with `candidateId`, `nodeId`, and
  `conversationId` before submitting source-candidate review.
- Assert the response comes from projected evidence and contains the expected
  smoke source file.
- Permit projected same-session source-change evidence when the process smoke
  publishes a source candidate directly from the agent session before an
  explicit approval-resource card is available in the selected User Node
  conversation.
- Keep Host source-change read API checks in place as the operator/control
  read-model proof.

## Tests Required

- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
  when a relay is available
- `pnpm verify`

## Migration/Compatibility Notes

This primarily changes smoke coverage. The source-change visibility boundary is
also clarified to allow projected same-session evidence while still requiring a
selected User Node conversation.

## Risks And Mitigations

- Risk: smoke output becomes noisier.
  Mitigation: the new pass label is concise and sits next to the existing
  source-change read/review checks.
- Risk: the source diff route returns unavailable if projection changes.
  Mitigation: Host source-change projection is already asserted immediately
  before the User Client call.

## Open Questions

- The same source-diff User Client path still needs manual validation with
  live model-provider turns after API-backed provider testing is available.
