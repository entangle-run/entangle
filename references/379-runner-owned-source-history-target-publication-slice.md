# Runner-Owned Source-History Target Publication Slice

## Current Repo Truth

Before this slice, explicit source-history publication was already a
Host-signed `runtime.source_history.publish` control command sent to the
accepted runner assignment. The runner owned the git publication and emitted
`artifact.ref` plus updated `source_history.ref` observation evidence.

The remaining limitation was target selection: the control command could only
publish through the node's primary git repository target. The source mutation
policy already had `nonPrimaryPublishRequiresApproval`, and approval resources
already supported `source_history_publication`, but the control payload, Host
API, CLI, Studio helper, runner join handle, and runner publication service did
not carry an explicit publication target or publication approval id.

## Target Model

Source-history publication remains runner-owned and federated:

- Host signs a `runtime.source_history.publish` control command;
- the command may include `approvalId` and a partial git target selector;
- the runner resolves the selector against its effective artifact context;
- omitted selector fields fall back to the primary git target/default namespace;
- non-primary targets require an approved `source_publication` approval when
  `nonPrimaryPublishRequiresApproval` is true;
- full source publication approval policy can also be satisfied by an approved
  `approvalId`;
- Host observes the result through runner-signed observations, not by pushing
  or reading runner-local source files.

## Impacted Modules And Files

- `packages/types/src/runtime/session-state.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/protocol/control.ts`
- `services/host/src/index.ts`
- `services/host/src/federated-control-plane.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `services/runner/src/source-history.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-source-history-inspection.ts`
- focused tests across types, Host, runner, host-client, and Studio.

## Concrete Changes

- Added `sourceHistoryPublicationTargetSchema` with optional
  `gitServiceRef`, `namespace`, and `repositoryName` selectors.
- Extended `runtimeSourceHistoryPublishRequestSchema` and
  `runtimeSourceHistoryPublishPayloadSchema` with optional `approvalId` and
  `target`.
- Forwarded target/approval fields through Host API, federated control-plane
  publication, runner join command handling, and `RunnerService`.
- Renamed the runner publication helper to `publishSourceHistoryToGitTarget`.
- Added runner-side target resolution through the existing artifact git
  resolver, preserving sibling repository derivation from the primary target.
- Added runner-side approval validation for `source_publication` approvals
  scoped to `source_history_publication:<historyId>|<service>|<namespace>|<repo>`.
  Primary-target publication also accepts the older
  `source_history:<historyId>` approval scope for compatibility.
- Added CLI options:
  `--approval-id`, `--target-git-service`, `--target-namespace`, and
  `--target-repository`.
- Added Studio selected source-history publication request controls beside the
  replay request controls.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/runner test -- service.test.ts index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts federated-control-plane.test.ts`
- `pnpm --filter @entangle/studio test -- runtime-source-history-inspection.test.ts`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`

Key new behavioral coverage:

- control payloads preserve `approvalId` and target selectors;
- Host publish route forwards target selectors to the federated control plane;
- runner join forwards target selectors to the running assignment handle;
- runner service refuses non-primary publication without an approved approval;
- runner service publishes to an approved sibling non-primary git repository
  and records projected target metadata;
- host-client and Studio helpers serialize the new request shape.

Added-line local-assumption audit:

```bash
git diff -U0 | rg "^\\+.*(Entangle Local|entangle-local|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"
```

Findings:

- `fixture.contextPath` in the runner service test is a valid test-fixture load
  of an effective runtime context;
- `runtimeContext.workspace.runtimeRoot` in the runner service test is valid
  runner-owned state setup for shadow-git source-history publication;
- no Host-local runner filesystem read, shared volume, or Docker-specific
  product assumption was added.

## Migration And Compatibility Notes

Existing primary-target publication requests remain valid. If `target` is
omitted, the runner uses the primary git repository target exactly as before.

Primary-target publication approvals can still use the older
`source_history:<historyId>` scope. Non-primary targets require the exact
`source_history_publication` scope so approval cannot be replayed against a
different repository.

No Host-local mutation path was introduced. Host still only signs and publishes
the control command; the runner performs git work from runner-owned state.

## Risks And Mitigations

- Risk: partial target selectors could resolve unexpectedly.
  Mitigation: the runner resolves selectors through the same effective artifact
  context used by artifact retrieval and records the resolved target metadata
  in the source-history publication record.
- Risk: approval reuse across repositories.
  Mitigation: non-primary publication requires the concrete
  `history|service|namespace|repository` approval resource.
- Risk: Studio exposes a powerful publish action.
  Mitigation: the action only requests Host-signed control; runner policy and
  approval validation still gate execution.

## Open Questions

- Whether wiki publication should receive the same explicit target selector.
- Whether source-history publication should support non-git artifact backends
  once the artifact backend abstraction grows beyond git.
