# User Node Delivery Retry State Slice

## Current Repo Truth

User Node outbound messages recorded relay URLs and published relays, and the
User Client rendered a derived delivery label. If relay publication failed, the
Host route returned an error and no durable outbox record existed for the human
participant to inspect or retry.

The previous parent-message read model slice preserved reply links, which makes
retry records and replacement attempts easier to relate to the original thread.

## Target Model

User Node outbox state should distinguish published, partial, and failed relay
delivery. A failed delivery should remain visible in the User Client with relay
error details and a retry action that republishes through the Host/User Node
gateway using the same conversation, session, message type, summary, parent
message, and approval context when available.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/user-node-messaging.ts`
- `services/host/src/user-node-messaging.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/284-user-node-delivery-retry-state-slice.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add User Node message delivery status and relay-error schemas.
- Make User Node relay publication collect per-relay settled results instead
  of failing the whole publish when a relay rejects.
- Persist outbound delivery status and relay errors in User Node message
  records.
- Mark inbound User Node message records as received.
- Render failed delivery state and relay errors in the User Client.
- Add a retry form for failed outbound records using the existing signed User
  Node publish path.

## Tests Required

- Type schema tests for delivery status/error records.
- Host messaging test for failed relay publication.
- Host read-model test for received inbound state.
- Runner User Client test for failed delivery display and retry control.
- Shared typechecks and focused Host/runner tests.

Verification record:

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/host test -- user-node-messaging.test.ts`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- package/Host/runner lint checks

## Migration/Compatibility Notes

Existing User Node records without `deliveryStatus` remain valid. Existing
publish response fixtures parse with a default `published` status. Failed
delivery records create a new signed A2A event when retried; v1 does not reuse
the failed event id.

## Risks And Mitigations

- Risk: returning a successful Host API response for zero relay deliveries
  could hide delivery failure from automation.
  Mitigation: the response and persisted record carry `deliveryStatus:
  "failed"` and relay errors; CLI/clients can treat that as non-delivered.
- Risk: retrying approval responses without full context could lose policy
  metadata.
  Mitigation: retry forms preserve approval id, decision, operation, reason,
  and resource fields already stored in the User Node message record.

## Open Questions

Whether CLI should exit nonzero when `deliveryStatus` is `failed`, or preserve
the current successful mutation semantics and require callers to inspect the
status field.
