# Federated Source History Replay Control Slice

## Current Repo Truth

Direct Host source-history replay was removed because it wrote into runner-owned
source workspaces through Host-readable filesystem paths. The accepted
source-review path already records runner-owned source-history entries, and
explicit source-history publication now uses Host-signed control commands.

Before this slice, explicit source replay had not returned in federated form.
Operators could inspect source-history records, but could not ask a remote
assigned runner to replay one into its own source workspace.

## Target Model

Source-history replay is node-runtime behavior. Host may request replay only by
publishing `runtime.source_history.replay` to the accepted runner assignment.
The runner validates the command, checks node-local source mutation policy and
approval scope, replays only when the workspace is still at the recorded base
or head tree, persists a runner-owned replay record, and emits
`source_history.replayed` observation evidence.

Host never writes the source workspace and never reads runner replay files.

## Impacted Modules/Files

- `packages/types/src/runtime/session-state.ts`
- `packages/types/src/protocol/control.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/state.ts`
- `services/runner/src/state-store.ts`
- `services/runner/src/source-history.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
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

- Add runner-owned source-history replay record contracts.
- Add `runtime.source_history.replay` control payloads.
- Add `source_history.replayed` observation payloads.
- Add Host control-plane publishing and observation intake for replay.
- Add a Host request API, host-client method, and CLI command that request
  replay from the accepted runner assignment.
- Add runner join-service routing into the active assignment runtime handle.
- Add RunnerService replay handling with policy approval validation, source
  workspace tree safety checks, runner-local replay persistence, and replay
  observation emission.

## Tests Required

- Type contract tests for replay control and observation events.
- Host control-plane test for signed replay command publishing.
- Host API test for federated replay request publication.
- Host-client request serialization/response parsing test.
- Runner join-service test for command routing.
- Runner service test for approval-gated source-history replay, workspace tree
  replacement, replay record persistence, and observation emission.

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

## Audit Search

`git diff -U0 | rg "^\\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`
returned only runner-owned local state/storage additions:

- `fixture.contextPath` in runner tests: valid test fixture for loading an
  assigned runtime context.
- `runtimeRoot` and `source-snapshot.git` in runner replay code/tests: valid
  runner-local execution state, not Host-readable control-plane state.
- `source-history-replays` in runner state paths: valid runner-owned replay
  record storage.

No new product-level `Entangle Local`, `entangle-local`, shared-volume, or
Host-side runner filesystem assumption was introduced.

## Migration/Compatibility Notes

The old direct Host replay mutation is not restored. The HTTP path may again
accept a replay request, but its semantics are now federated: Host returns
`status: "requested"` after publishing a control command, and the runner emits
the outcome asynchronously through receipts and `source_history.replayed`.

Replay still does not merge diverged workspaces. Divergence produces an
`unavailable` replay record instead of overwriting work.

## Risks And Mitigations

- Risk: replay could overwrite user work.
  Mitigation: replay only proceeds when the current source tree equals the
  recorded base tree or already equals the head tree.
- Risk: Host request success could be confused with replay success.
  Mitigation: Host response is explicitly `requested`; runner outcome is
  separate observation/receipt evidence.
- Risk: source-application approval policy could be bypassed.
  Mitigation: RunnerService validates approved `source_application` approval
  records against graph, node, optional session, and `source_history` resource
  scope before replay when policy requires it.

## Open Questions

- Add Studio replay controls once the operator panel is redesigned around
  federated request/receipt/outcome semantics.
- Add projection-backed replay history list/detail APIs if operators need a
  first-class replay timeline beyond host events.
