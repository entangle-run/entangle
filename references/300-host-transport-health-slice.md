# Host Transport Health Slice

## Current Repo Truth

Host already starts the federated control/observe plane from catalog-selected
relay profiles when `startHostServer()` runs. Before this slice, `/v1/host/status`
reported authority, state layout, reconciliation, runtime counts, and session
diagnostics, but it did not expose whether the Host control/observe transport
was disabled, not started, subscribed, stopped, or degraded.

CLI and Studio therefore could show runtime and assignment state without a
direct operator hint that the Host was actually subscribed to the relay fabric
used for runner registration, assignments, observations, and User Node traffic.

## Target Model

Host status must include a bounded transport-health read model for the
Host-owned federated control/observe plane. It should be projection/status
metadata only: relay URLs, configured relay count, lifecycle status,
subscription time, and last startup failure. Studio and CLI should render that
status from Host, not by probing relays directly.

## Impacted Modules/Files

- `packages/types/src/host-api/status.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/host-status.ts`
- `packages/host-client/src/host-status.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/host-status-output.ts`
- `apps/cli/src/host-status-output.test.ts`
- `apps/cli/src/deployment-doctor-command.test.ts`
- `apps/cli/src/deployment-diagnostics-bundle-command.test.ts`
- `apps/studio/src/App.tsx`

## Concrete Changes Required

- Add `hostTransportHealthSchema` under the Host status contract.
- Track Host control/observe transport state in process: default
  `not_started` or `disabled` from the catalog, `subscribed` after startup,
  `degraded` on startup failure, and `stopped` when the running Host server
  closes the subscription.
- Mark Host status degraded when the federated control/observe transport is
  degraded.
- Add host-client formatting for `transport control/observe`.
- Include transport health in CLI host-status summaries.
- Show transport health in Studio's Host Status panel.

## Tests Required

- `packages/types` schema test for Host status transport fields.
- Host API test proving default catalog transport projection and degraded
  transport status.
- host-client formatting tests.
- CLI host status summary tests.
- Typecheck for Host, host-client, CLI, and Studio.

## Migration/Compatibility Notes

The Host status response shape is extended while the project is still
pre-release. Existing callers using the shared `host-client` parser must update
mocked Host status payloads to include the required `transport` object.

The slice does not introduce per-relay active probing. It reports the Host
control/observe subscription lifecycle owned by the Host process.

## Risks And Mitigations

- Risk: operators interpret `not_started` as a relay failure in unit-test or
  embedded Host contexts.
  Mitigation: `not_started` is separate from `degraded`; only actual startup
  failure degrades Host status.
- Risk: Studio bypasses Host by adding direct relay checks.
  Mitigation: Studio only renders the Host status read model.

## Open Questions

No open product question blocks this slice. A later diagnostics slice can add
per-relay connection details if the underlying Nostr fabric exposes reliable
per-relay state.
