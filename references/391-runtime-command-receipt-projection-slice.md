# Runtime Command Receipt Projection Slice

## Current Repo Truth

Runtime assignment lifecycle receipts already exist as signed
`assignment.receipt` observations and projected `runtime.assignment.receipt`
Host events. They are intentionally about assignment/runtime lifecycle, not
about individual Host-signed runtime commands.

Artifact source-change proposal requests now return an effective `proposalId`
and the runner uses that id as the source-change candidate id. Before this
slice, completion still had to be inferred from a later `source_change.ref`
projection. A caller could see that a command was requested and could often
find the expected candidate, but Host had no explicit command receipt tying
`commandId` to `proposalId`, `candidateId`, and success/failure state.

## Target Model

Runtime commands need their own signed observation receipt model:

- Host sends a signed `entangle.control.v1` command with `commandId`;
- the assigned runner emits signed `runtime.command.receipt` observations;
- Host records those observations as `runtime.command.receipt` audit events;
- Host projection exposes bounded `runtimeCommandReceipts`;
- artifact proposal completion is explicitly correlated by `commandId`,
  `proposalId`, and `candidateId`.

This keeps command acknowledgement, command execution, and artifact/source
evidence distinct while preserving the federated rule that Host observes
runner-owned work through signed events.

## Impacted Modules And Files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/host/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/index.test.ts`
- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `apps/studio/src/runtime-assignment-control.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/390-artifact-proposal-correlation-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `entangleRuntimeCommandEventTypeSchema` for Host-signed runtime
  commands that can produce command receipts.
- Add `runtime.command.receipt` to `entangle.observe.v1` with command id,
  command event type, runner identity, graph/node identity, status, message,
  and optional artifact/source/wiki correlation fields.
- Add typed Host `runtime.command.receipt` events.
- Add `RuntimeCommandReceiptProjectionRecord` and
  `HostProjectionSnapshot.runtimeCommandReceipts`.
- Record command receipts in Host state through the federated observe control
  plane.
- Emit `received`, `completed`, and `failed` command receipts for
  `runtime.artifact.propose_source_change` from joined runners.
- Verify the process smoke waits for a completed command receipt after the
  projected artifact source-change proposal candidate appears.
- Add compact projection count helpers for CLI and Studio summaries.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test -- --runInBand`
- `pnpm --filter @entangle/host test -- --runInBand`
- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm --filter @entangle/cli test -- --runInBand`
- `pnpm --filter @entangle/studio test -- --runInBand`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- `git diff -U0 | rg "^\\+.*(old product identity markers|runtimeProfile.*local|contextPath|runtimeRoot|shared volume|effective-runtime-context|Docker)"`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`

The added-line local-assumption audit produced no hits.
## Migration And Compatibility Notes

This is additive. Existing observation consumers can ignore
`runtime.command.receipt`, and existing projection consumers receive an empty
`runtimeCommandReceipts` array by default when no receipt exists.

The new receipt does not replace `assignment.receipt`. Assignment receipts
remain lifecycle evidence; command receipts are command execution evidence.

## Risks And Mitigations

- Risk: command receipts are mistaken for source-change evidence.
  Mitigation: receipts only report command handling state. Source content still
  appears through `source_change.ref`.
- Risk: only artifact proposal initially emitted completed command receipts.
  Mitigation: `392-runner-owned-command-receipt-adoption-slice.md` extended
  receipt emission to artifact restore, source-history publish/replay, and
  wiki publication.
- Risk: projection grows unbounded.
  Mitigation: the current projection reads the same bounded recent Host event
  window already used by assignment receipts.

## Open Questions

- Should CLI and Studio gain first-class command receipt tables, or is compact
  count plus event stream/projection sufficient until more commands emit
  completed receipts?
- Should lifecycle start/stop/restart and session cancellation use command
  receipts, or should their existing lifecycle/session observations remain the
  canonical completion model?
