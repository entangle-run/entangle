# User Client Source File Preview Slice

## Current Repo Truth

The Host already exposes source-change candidate file preview through
`GET /v1/runtimes/:nodeId/source-change-candidates/:candidateId/file?path=...`.
That read path can fall back to bounded projected file preview evidence emitted
by the runner. The Human Interface Runtime/User Client could load the candidate
diff and publish source-candidate review messages, but the running User Client
did not expose the per-file preview route directly.

## Target Model

A human User Node should be able to inspect the concrete changed file evidence
from its own running User Client before accepting or rejecting a source-change
candidate. The file preview must stay scoped to the selected User Node
conversation, just like source diff and review.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/runtime-api.test.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `deploy/federated-dev/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a runtime-local User Client JSON route for source-change file preview.
- Require `conversationId`, `nodeId`, `candidateId`, and a source file path.
- Reuse the existing User Client source-change visibility gate so the route
  only resolves candidates visible through the selected conversation.
- Prefer projected bounded `filePreviews` evidence and fall back to the Host
  runtime source file preview API when projection lacks the requested preview.
- Add a dedicated User Client helper and source-review UI buttons for changed
  files.
- Extend the process-runner smoke to prove the running User Client can load the
  modified smoke source file before review.

## Tests Required

- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- `pnpm verify`

## Migration/Compatibility Notes

This adds a participant-side read surface over existing Host source preview
capability. It does not introduce a new Host mutation or a new filesystem
dependency.

## Risks And Mitigations

- Risk: source file previews leak unrelated source files.
  Mitigation: the Human Interface Runtime requires selected-conversation
  source-change visibility before fetching preview evidence, and the Host
  source preview API still validates requested paths against candidate changed
  files.
- Risk: projected file preview is missing.
  Mitigation: the route falls back to the Host source preview API and returns a
  bounded unavailable reason if neither projection nor Host read evidence can
  satisfy the request.

## Open Questions

- Live provider-backed OpenCode runs still need manual validation against real
  model-provider credentials.
