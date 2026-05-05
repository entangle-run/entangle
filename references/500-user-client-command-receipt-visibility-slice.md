# User Client Command Receipt Visibility Slice

## Current Repo Truth

User Client participant actions already route through the Human Interface
Runtime and Host control boundary for artifact restore, artifact source-change
proposal, source-history publication/reconcile, wiki publication, and wiki page
upsert. Those Host-signed commands include User Node attribution through
`requestedBy` or, for replay-style source-history commands, `replayedBy`.

Before this slice, runner `runtime.command.receipt` observations and Host
projection records did not carry a participant attribution field. Studio and
CLI could inspect all projected runtime command receipts as operator surfaces,
but the running User Client could not safely show completion/failure state for
only the commands initiated by its own User Node.

## Target Model

Runtime command receipts preserve the originator node id when the originating
control command carries one. Host stores and projects that attribution, and
the running User Client exposes only command receipts where
`requestedBy === userNodeId`.

This keeps the operator projection complete while avoiding a participant-client
leak of other users' or operators' command receipts.

## Impacted Modules And Files

- `packages/types/src/protocol/observe.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `apps/cli/src/index.ts`
- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`

## Concrete Changes Required

- Add optional `requestedBy` to runtime command receipt observation payloads,
  Host event records, and Host projection records.
- Have the joined runner copy participant attribution from runtime command
  control payloads into every matching received/completed/failed command
  receipt.
- Treat source-history replay/reconcile `replayedBy` and session cancellation
  record `requestedBy` as receipt attribution when those command kinds are
  received.
- Preserve `requestedBy` when Host records and reprojects
  `runtime.command.receipt` events.
- Add a `--requested-by` filter and compact summary field to CLI command
  receipt inspection.
- Render the attribution in Studio command receipt detail text.
- Add `runtimeCommandReceipts` to the running User Client state and filter it
  to receipts requested by the current User Node.
- Render a compact command-receipt list in both the server-rendered Human
  Interface Runtime page and the React User Client shell.

## Tests Required

- Type/schema tests for receipt observation, Host event, and projection
  parsing with `requestedBy`.
- Host tests proving receipt observations persist and project `requestedBy`.
- Runner join-service tests proving received/completed command receipts carry
  attribution from the command payload.
- User Client/Human Interface Runtime state tests proving only receipts
  requested by the current User Node are returned.
- CLI projection-output tests for summaries and `requestedBy` filtering.
- Studio presentation tests for receipt detail output.
- User Client typecheck/lint to verify the new state field and UI component.

## Migration And Compatibility Notes

The field is optional. Existing Host event traces and existing runner
observations remain valid and simply do not appear in participant-filtered User
Client command-receipt lists until new attributed receipts arrive.

Operator surfaces still show unattributed receipts, because they are part of
the full Host projection. Participant surfaces intentionally hide unattributed
receipts.

## Risks And Mitigations

- Risk: participants see other users' command receipts.
  Mitigation: the User Client filters strictly on `requestedBy === userNodeId`.
- Risk: replay/reconcile commands use `replayedBy` rather than `requestedBy`.
  Mitigation: runner receipt attribution normalizes `replayedBy` into the
  receipt-level `requestedBy` projection field.
- Risk: old traces create confusing empty participant receipt lists.
  Mitigation: the field is optional and the UI has an explicit empty state.

## Open Questions

- Whether v2 should expose a dedicated participant command-history API from
  Host instead of letting the Human Interface Runtime fetch the full Host
  projection and filter locally.
- Whether operator-originated commands should support an explicit
  `requestedBy` value that names an operator principal instead of a graph node.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/cli test -- src/projection-output.test.ts`
- `pnpm --filter @entangle/studio test -- src/federation-inspection.test.ts`
- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client lint`
