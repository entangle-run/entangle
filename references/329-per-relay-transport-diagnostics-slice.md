# Per-Relay Transport Diagnostics Slice

## Current Repo Truth

Host status exposed one aggregated `transport.controlObserve` state with relay
URLs, counts, subscription time, and latest failure. Studio and CLI could show
whether the control/observe plane was subscribed or degraded, but they could not
render a per-relay diagnostic row.

The underlying Nostr fabric currently subscribes to all configured relays as one
plane. It does not yet report independent live connection telemetry for each
relay, so per-relay status in this slice is derived from the Host plane state.

## Target Model

Host status should carry per-relay diagnostics so operator surfaces can inspect
federated transport health without reading logs. Even when the first
implementation derives status from the aggregate plane, the contract should
already provide stable relay rows for later independent relay telemetry.

## Impacted Modules/Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/host-status-output.test.ts`
- `apps/studio/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `HostTransportRelayHealth` and relay status contracts;
- added `transport.controlObserve.relays` to Host status responses;
- derived per-relay rows from configured relay URLs and Host plane state;
- preserved subscription and failure details on relay rows where available;
- added shared host-client formatting for relay detail lines;
- added per-relay detail lines to CLI status summaries;
- rendered relay count and relay rows in Studio Host Status;
- updated Host, type, host-client, CLI, and Studio fixtures/tests.

## Tests Required

Verification run:

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/types test -- src/index.test.ts`
- `pnpm --filter @entangle/host-client test -- src/host-status.test.ts src/index.test.ts`
- `pnpm --filter @entangle/cli test -- src/host-status-output.test.ts`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/types build`
- `pnpm --filter @entangle/host-client build`
- `pnpm --filter @entangle/host build`
- `pnpm --filter @entangle/cli build`
- `pnpm --filter @entangle/studio build`

The host-client, CLI, and Host package test commands currently run the package
test globs through the package script; all invoked tests passed.

## Migration/Compatibility Notes

The status contract addition is additive. `relays` defaults to an empty array
when older status payloads omit the field, and current Host responses now
include relay rows.

## Risks And Mitigations

- Risk: per-relay status may imply independent relay probing that does not yet
  exist. Mitigation: the docs state that v1 relay rows are derived from the
  aggregate control/observe plane.
- Risk: high-cardinality relay lists could make Studio noisy. Mitigation:
  current relay profiles are expected to be small; a future Studio detail panel
  can paginate if large relay catalogs become normal.

## Open Questions

- Should the Nostr fabric expose independent `ensureRelay` and publish-result
  telemetry so Host can mark some relays subscribed and others degraded instead
  of deriving every row from the aggregate plane?
