# Process Smoke User Client Artifact History Diff Slice

## Current Repo Truth

The process-runner smoke already proves Host backend-cache artifact
history/diff for the runner-published source-history artifact. The running
User Client routes for artifact history/diff were covered by unit and runner
integration tests, but the full process smoke did not yet prove that a visible
artifact ref can be reviewed through the live User Node client.

## Target Model

The fast product proof should exercise human-node artifact review through the
same running User Client used for message publish, conversation inspection,
source-candidate review, and approval response. Artifact history/diff should be
read through the Human Interface Runtime only after the artifact is visible in
that User Node conversation.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `deploy/federated-dev/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Reuse the real source-history git artifact published by the builder runner.
- Deliver that artifact ref to the User Node through a signed synthetic
  builder-to-user A2A message.
- Call the running User Client JSON artifact history and diff routes with
  conversation context.
- Assert both routes resolve through the runtime/Host boundary and expose git
  history/diff evidence for the visible artifact.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
  when a relay is available
- `pnpm verify`

## Migration/Compatibility Notes

This changes only the smoke proof. It does not change public API contracts.
The synthetic user-facing artifact in the smoke is now a real builder-published
source-history artifact rather than an unreachable placeholder ref.

## Risks And Mitigations

- Risk: the smoke becomes slower because User Client artifact history/diff
  repeat Host backend-cache reads.
  Mitigation: the Host path is already warmed by the earlier backend-cache
  history/diff assertion.
- Risk: the User Client artifact visibility gate rejects the smoke request.
  Mitigation: the smoke first delivers the same artifact ref to the User Node
  conversation and waits for Host conversation projection before calling the
  User Client routes.

## Open Questions

- The full three-machine proof still needs to run outside the same workstation
  process-smoke topology.
