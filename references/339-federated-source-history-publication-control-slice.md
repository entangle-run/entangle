# Federated Source History Publication Control Slice

## Current Repo Truth

Runner-owned source-history publication already existed for the normal accepted
source-review path: when policy allows publication and the node has a primary
git target, the owning runner can materialize an accepted source-history commit
as a git artifact, persist publication metadata, and emit `artifact.ref` plus
updated `source_history.ref` observations.

Updated by
`379-runner-owned-source-history-target-publication-slice.md`: the same
Host-signed publication command can now carry an approval id plus explicit git
target selectors. The assigned runner resolves the target and validates
non-primary publication approval policy before pushing.

After direct Host source-history publication routes were removed, there was no
operator command path for explicitly asking a remote assigned runner to publish
or retry one existing source-history record. That left failed publication retry
as a missing federated operation.

## Target Model

Source-history publication remains runner-owned. Host may request publication
only through a Host Authority `runtime.source_history.publish` control event
for an accepted federated assignment. The assigned runner validates the command,
delivers it to the active node runtime handle, and `RunnerService` performs the
git publication from runner-owned state and emits signed projection evidence.

Retries of failed publication metadata must be explicit through
`retryFailedPublication`; the runner must not silently overwrite failed
publication evidence.

## Impacted Modules/Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `services/runner/src/source-history.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/225-host-runner-federation-spec.md`
- `references/227-nostr-event-fabric-spec.md`
- `references/228-distributed-state-projection-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`

## Concrete Changes Required

- Add `runtime.source_history.publish` to the Host-to-runner control protocol.
- Add typed Host API request/response contracts for requesting publication of a
  concrete runtime source-history record.
- Let Host publish the command only when an accepted federated assignment owns
  the runtime and federated control relay configuration is active.
- Add a host-client method and CLI command for the operator request surface.
- Let the request optionally carry `approvalId` plus git service, namespace,
  and repository selectors for non-primary publication.
- Let joined runners route the command to the active assignment runtime handle
  and emit assignment receipts for received and failed handling. Successful
  outcome is evidenced by the subsequent `artifact.ref` and `source_history.ref`
  observations.
- Add `RunnerService.requestSourceHistoryPublication` so the node runtime owns
  state lookup, policy checks, git target resolution, approval validation, git
  publication, observation emission, and explicit failed-publication retry
  semantics.

## Tests Required

- Control protocol schema test for `runtime.source_history.publish`.
- Host federated-control-plane test for signed command publication.
- Host API test proving source-history publication requests are sent over
  accepted federated assignments.
- Host-client test for request serialization and response parsing.
- Runner join-service test proving command routing to the assignment runtime
  handle.
- Runner service test proving failed publication metadata requires explicit
  retry and that explicit retry publishes through the runner-owned git path.
- Runner service test proving approved non-primary target publication pushes to
  the requested repository and records target metadata.
- Typecheck for touched packages.

## Verification Run

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/types exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/host-client exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/host exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts src/federated-control-plane.test.ts`
- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts src/service.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`
- `git diff --check`

The added-line local-assumption audit found:

- `contextPath` and `runtimeRoot` in `services/runner/src/service.test.ts`,
  valid runner-owned fixture setup for exercising local runner state and shadow
  git publication behavior;
- `runtimeRoot` in `services/runner/src/service.ts`, valid runner-owned state
  resolution inside the node runtime before publishing source history.

## Migration/Compatibility Notes

The public direct Host publication mutation had already been removed. This
slice reintroduces operator intent as a federated command, not as Host-side
filesystem mutation. Existing projected source-history list/detail read APIs
remain unchanged.

The CLI command currently lives under the existing runtime inspection command
group as `host runtimes source-history-publish`; it is an operator request
surface that still requires an accepted federated assignment.

## Risks And Mitigations

- Risk: an operator receives a successful Host response while the runner later
  fails to publish.
  Mitigation: Host response means "requested"; runner command outcome is
  exposed through assignment receipts and subsequent `artifact.ref` /
  `source_history.ref` projection.
- Risk: retry overwrites useful failure evidence.
  Mitigation: retry is explicit and the runner refuses failed publication
  records unless `retryFailedPublication` is true.
- Risk: source-history publication command is sent to a Human Interface
  Runtime.
  Mitigation: runtimes without a publication handler fail the assignment
  receipt instead of mutating state.

## Open Questions

- Should Studio show receipt/outcome correlation for source-history publication
  commands instead of only the requested command summary?
- Should source-history publication target selection later move to a signed
  User Node request for participant-initiated publication workflows?
