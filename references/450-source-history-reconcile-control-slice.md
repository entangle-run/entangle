# Source History Reconcile Control Slice

Date: 2026-04-29.

## Current Repo Truth

Source-history replay was already runner-owned and Host-signed through
`runtime.source_history.replay`, but it intentionally refused a source
workspace that had diverged from both the recorded `baseTree` and `headTree`.
That protected local work, but it left no federated path for the common case
where a runner needs to integrate an accepted source-history entry with
non-conflicting current workspace changes.

## Target Model

Entangle now has a separate `runtime.source_history.reconcile` control command.
It preserves the replay approval boundary and observation model while changing
only the runner-side workspace operation:

- if the current workspace equals `headTree`, the result remains
  `already_in_workspace`;
- if the current workspace equals `baseTree`, the result remains `replayed`;
- if the workspace diverged, the runner attempts a Git three-way tree merge
  using `baseTree`, current workspace tree, and `headTree`;
- clean diverged integrations are recorded as `merged` with `mergedTree`;
- conflicts or invalid merge output are recorded as `unavailable`.

The command still produces `source_history.replayed` observation evidence and
`runtime.command.receipt` closure. Host and operator surfaces inspect the same
projection-backed replay record family; no Host-side source workspace access is
introduced.

## Impacted Modules And Files

- `packages/types/src/runtime/session-state.ts`
- `packages/types/src/protocol/control.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/host-api/events.ts`
- `services/runner/src/source-history.ts`
- `services/runner/src/service.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/index.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/index.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/runtime-source-history-inspection.ts`
- `apps/studio/src/App.tsx`

## Concrete Changes

- Added `merged` to `SourceHistoryReplayStatus`.
- Added optional `mergedTree` to `SourceHistoryReplayRecord`, required only
  for `merged` records.
- Added `runtime.source_history.reconcile` to control and runtime command
  event contracts.
- Added Host API aliases and route:
  `POST /v1/runtimes/:nodeId/source-history/:sourceHistoryId/reconcile`.
- Added `reconcileRuntimeSourceHistory` to host-client.
- Added CLI command:
  `entangle host runtimes source-history-reconcile <nodeId> <sourceHistoryId>`.
- Added Studio operator control next to replay in selected Source History
  detail.
- Added runner join-service receipt handling for reconcile commands.
- Added runner service behavior that validates the same source-application
  approval requirement as replay and then calls Git `merge-tree --write-tree`.

## Tests Required

- Type contract parsing for the new control event and `merged` replay records.
- Runner service unit coverage for clean diverged workspace reconciliation.
- Runner join-service command receipt coverage for
  `runtime.source_history.reconcile`.
- Host control-plane publication coverage.
- Host API route coverage for accepted federated assignments.
- host-client POST route coverage.
- Studio helper coverage for reconcile request summaries.

## Verification

Passed:

```bash
pnpm --filter @entangle/types test -- --runInBand
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node --pool=forks --maxWorkers=1 --testTimeout=30000 src/service.test.ts src/index.test.ts
pnpm --filter @entangle/host exec vitest run --config ../../vitest.config.ts --environment node --pool=threads src/federated-control-plane.test.ts src/index.test.ts
pnpm --filter @entangle/host-client test -- --run src/index.test.ts
pnpm --filter @entangle/studio test -- --run src/runtime-source-history-inspection.test.ts
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio lint
pnpm --filter @entangle/host-client lint
```

The package-level runner test script still expands to `src/*.test.ts`; that
broader run passed test assertions but failed on an unrelated unhandled
rejection in the existing external cancellation test. The direct two-file
runner invocation above is the targeted verification for this slice.

Added-line local-assumption audit:

```bash
git diff -U0 | rg "^\+.*(old product identity markers|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

Findings:

- `fixture.contextPath` in the runner service test is a valid test-fixture
  context loader.
- `runtimeContext.workspace.runtimeRoot` in the runner service test is valid
  runner-owned state setup for the shadow git repository.
- `this.context.workspace.runtimeRoot` and
  `input.context.workspace.runtimeRoot` in runner service/source-history code
  are valid runner-owned local state access, not Host-readable runner
  filesystem access.

## Migration And Compatibility Notes

- Existing replay records remain valid.
- Existing `runtime.source_history.replay` behavior is unchanged.
- Consumers that display replay status strings should tolerate the new
  `merged` status.
- The observation event type stays `source_history.replayed` because the
  projection family is replay/recovery outcomes, with `status: "merged"`
  distinguishing reconcile success.

## Risks And Mitigations

- Git merge conflicts can still occur. The runner records `unavailable`
  instead of overwriting the workspace.
- `mergedTree` is a shadow-git tree hash, not a source-history commit. It is
  recorded only as evidence of the reconciled workspace tree.
- Reconcile does not publish source artifacts. Publication remains a separate
  policy-gated source-history command.

## Open Questions

- Resolved by
  [451-user-client-source-history-reconcile-slice.md](451-user-client-source-history-reconcile-slice.md):
  User Client participant surfaces may request reconcile directly, but only for
  visible plain `source_history` resources. Target-specific
  `source_history_publication` resources remain limited to publication.
