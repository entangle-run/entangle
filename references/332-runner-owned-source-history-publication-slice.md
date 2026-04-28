# Runner-Owned Source History Publication Slice

## Current Repo Truth

The owning runner now applies accepted signed source-candidate reviews into
runner-local source history and emits `source_history.ref` observations. Before
this slice, source-history publication to a git artifact was still primarily a
Host mutation path that needed Host-readable runtime state.

## Target Model

The node runner owns source workspace mutation and default publication of its
own accepted source-history records. Host observes the resulting artifact and
source-history refs; it does not need to read the runner filesystem to see the
published commit artifact.

## Impacted Modules/Files

- `services/runner/src/source-history.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes

- Added runner-side source-history publication helpers that materialize the
  recorded source-history commit into a git artifact branch under the runner's
  artifact workspace.
- The runner pushes that artifact branch to the node's primary git repository
  target when one is configured and `publishRequiresApproval` is false.
- The runner writes the resulting artifact record and updated source-history
  publication metadata into runner-owned state.
- The runner emits both `artifact.ref` and updated `source_history.ref`
  observations after publication.
- The process-runner smoke now requires the projected source-history entry to
  include a published publication state.

## Tests Required

- Runner service coverage for accepted source review, source-history
  application, primary git publication, artifact persistence, artifact
  observation, and source-history observation.
- Federated process smoke coverage for projected published source-history
  records.

Verification run for this slice:

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner test -- src/service.test.ts`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/runner build`
- `pnpm --filter @entangle/host test -- src/index.test.ts src/federated-control-plane.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`
- `git diff --check`
- Added-line local-assumption audit:
  `git diff -U0 | rg "^\\+.*(deprecated local product name|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`

The added-line audit found one `runtimeRoot` reference. It is valid because the
runner reads its own runner-local shadow git repository before publishing its
own source-history commit. It is not a Host read of runner-owned filesystem
state and does not add a shared-volume observation path.

## Migration/Compatibility Notes

The existing Host publication mutation remains as a local compatibility/admin
path for now. The canonical default path for newly accepted source reviews is
runner-owned publication to the primary target when policy permits it.

If no primary git target exists, or publication approval is required, the runner
records source history without attempting publication.

## Risks And Mitigations

- Risk: automatic publication bypasses policy. Mitigation: the runner skips
  auto-publication when `publishRequiresApproval` is true.
- Risk: non-primary target publication needs explicit user choice. Mitigation:
  this slice publishes only to the primary target.
- Risk: repository provisioning may require Host-owned service credentials.
  Mitigation: the runner treats push failure as failed publication metadata
  instead of corrupting source-history state. Dedicated federated provisioning
  remains future work.

## Open Questions

- Replace or remove the old Host source-history publication mutation after a
  runner command/user-message path exists for explicit retry and non-primary
  publication.
- Define how runner-owned publication requests should be approved when policy
  requires approval before source publication.
