# User Client Artifact Restore Slice

## Summary

This slice lets a running User Node client request runner-owned restore for an
artifact visible in the selected conversation.

The Host, CLI, and Studio already supported artifact restore as a signed
`runtime.artifact.restore` control command. The missing participant path was
the User Client: a human node could inspect artifact preview/history/diff and
request artifact-to-source proposal, but could not ask the owning runner to
restore a visible artifact into runner-owned state.

## Current Repo Truth

- Host already exposes
  `POST /v1/runtimes/:nodeId/artifacts/:artifactId/restore`.
- Host-client, CLI, Studio, runner join-service, and runner service already
  support the federated artifact restore command.
- The Human Interface Runtime already enforced selected-conversation artifact
  visibility for preview/history/diff and artifact source-change proposal
  requests.
- The dedicated User Client already rendered artifact controls for preview,
  history, diff, and source-change proposal.

## Target Model

Human graph participants should be able to request artifact restore from their
own User Node runtime when the artifact is visible in their conversation. The
participant route must:

- require `conversationId`, `nodeId`, and `artifactId`;
- verify that the artifact is visible in the selected User Node conversation;
- forward through Host control, not direct runner access;
- set `requestedBy` to the stable User Node id;
- keep restore execution and observation runner-owned.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/runner/package.json`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `POST /api/artifacts/restore` to the Human Interface Runtime.
- The route validates request body, checks artifact visibility through the
  selected User Node conversation, and calls Host's runtime artifact restore
  endpoint with `requestedBy` set to the User Node id.
- Added `restoreArtifact` to the dedicated User Client runtime API.
- Added reason/id restore controls to User Client artifact cards.
- Added User Client API helper and Human Interface Runtime JSON route tests.
- Extended the process-runner smoke to call the running User Client artifact
  restore route for a visible source-history artifact and wait for the
  projected completed `runtime.artifact.restore` command receipt.
- While verifying the slice, the root test gate reproduced a runner package
  no-output hang under the default Vitest pool. `services/runner/package.json`
  now pins runner tests to `--pool=threads`, matching the verified stable path.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --dir services/runner exec vitest run --config ../../vitest.config.ts --environment node src/*.test.ts --pool=threads`
- `pnpm --dir services/runner exec vitest run --config ../../vitest.config.ts --environment node src/*.test.ts --pool=forks`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 90000`
- `pnpm test`
- `pnpm typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist: no
  relevant hits

## Migration And Compatibility

This is additive. Existing Host, CLI, Studio, and runner artifact restore
behavior remains unchanged. User Client restore requests use the same Host
control endpoint as operator requests, but with `requestedBy` set to the User
Node id.

No Host or User Client runner-filesystem shortcut is introduced.

## Risks And Mitigations

- Risk: a User Client could restore an artifact it should not see.
  Mitigation: the route reuses selected-conversation artifact visibility checks
  before forwarding to Host.
- Risk: UI action density grows too high on artifact cards.
  Mitigation: this keeps controls functionally complete for now; a later UI
  refinement can group artifact actions without changing protocol behavior.
- Risk: repeated restore requests are redundant when the artifact was already
  restored.
  Mitigation: restore ids are optional and the runner-owned restore history can
  preserve repeated attempts.

## Open Questions

- Should User Client restore be policy-gated separately from operator restore,
  or is conversation visibility plus graph edge policy sufficient for v1?
