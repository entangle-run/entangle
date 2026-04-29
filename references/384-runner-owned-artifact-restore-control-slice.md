# Runner-Owned Artifact Restore Control Slice

## Current Repo Truth

`336-host-artifact-restore-promotion-removal-slice.md` removed direct
Host-side artifact restore and promotion mutations because they required
Host-readable runner filesystem state. Artifact list/detail/preview/history
read paths later moved to projected refs and a Host-owned backend cache, but
there was still no replacement mutation path for asking the assigned runner to
materialize a projected artifact in its own retrieval cache.

Before this slice, Host could inspect an observed artifact ref, but an operator
could not request restore through the federated control protocol. The runner
already had inbound git artifact retrieval logic for A2A task handoffs, so the
missing piece was a Host-signed command that reused that runner-owned path.

## Target Model

Artifact restore is a runner-owned operation:

- Host resolves the visible projected `artifact.ref`;
- Host publishes a signed `runtime.artifact.restore` control event to the
  accepted assignment;
- the assigned runner retrieves the artifact through its configured artifact
  backend and writes the resulting runner-local artifact record;
- the runner emits `artifact.ref` observation evidence carrying retrieval
  state;
- Host projection stores that observation evidence without reading the
  runner's filesystem.

Promotion remains intentionally unresolved. Promotion can later return either
as a runner-owned artifact command with explicit policy, or as a source-change
proposal flow when the artifact represents code mutation.

## Impacted Modules And Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add the `runtime.artifact.restore` control event payload with artifact ref,
  assignment, command, requester, reason, and restore id fields.
- Add Host API request/response contracts for
  `POST /v1/runtimes/:nodeId/artifacts/:artifactId/restore`.
- Allow `artifact.ref` observations and Host projection rows to carry the full
  runner `ArtifactRecord` when the runner has retrieval or materialization
  state to report.
- Add a Host control-plane publisher for artifact restore commands.
- Add the Host route that requires a projected artifact ref plus an accepted
  federated assignment before publishing the command.
- Add a host-client method for requesting artifact restore through the Host
  boundary.
- Add runner join-service dispatch for `runtime.artifact.restore`.
- Add `RunnerService.requestArtifactRestore`, reusing the existing inbound git
  artifact retrieval backend and publishing observed success or failure
  records.
- Include full artifact records in runner-emitted artifact observations.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client test -- index.test.ts`
- `pnpm --filter @entangle/runner test -- service.test.ts index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts federated-control-plane.test.ts`

Additional verification passed before the slice commit:

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host lint`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- `git diff --check`

`pnpm test` was attempted but interrupted after hanging without new failure
output during the package sequence; the affected package-level tests were then
run directly where relevant to this slice.

## Migration And Compatibility Notes

This is an additive protocol and API surface. The previously removed direct
Host restore/promotion APIs are not reintroduced.

Projected artifact records now may include `artifactRecord`. Existing
projection consumers can continue using `artifactRef` and `artifactPreview`;
the full record is optional and only present when the runner observes it.

The runner may report runner-local materialization metadata inside the observed
artifact record. Host treats that as observation evidence only; it does not use
those paths to read files.

## Risks And Mitigations

- Risk: an operator requests restore for an artifact whose ref is stale or no
  longer reachable.
  Mitigation: the assigned runner records a failed retrieval artifact record
  and emits `artifact.ref` observation evidence with failure metadata.
- Risk: Host becomes the artifact mutation owner again.
  Mitigation: the Host route only publishes a signed control command; runner
  retrieval and state writes happen in `RunnerService`.
- Risk: promotion semantics are conflated with restore.
  Mitigation: this slice deliberately restores only materialization. Promotion
  remains a separate protocol design.

## Open Questions

- Should restored artifact records eventually strip runner-local
  materialization paths from projection and carry only logical retrieval state?
- Should CLI, Studio, and User Client expose an explicit restore button, or
  should restore stay a low-level Host API until promotion/source proposal
  semantics are settled?
- Should promotion be a generic artifact command or should code-like artifacts
  always become source-change proposals?
