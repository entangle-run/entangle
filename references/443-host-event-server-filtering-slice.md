# Host Event Server Filtering Slice

## Current Repo Truth

Host persisted typed events and exposed `/v1/events?limit=N`. CLI and
host-client already had client-side filtering helpers for category, node id,
and type prefix, and CLI could render operator audit events in summary mode.
Because Host applied the limit before the CLI filtered locally, an operator
could miss older but relevant security/runtime events when the recent event
tail contained unrelated records.

## Target Model

Host event inspection should be a Host-owned read model, not only a client-side
post-processing convenience. The API should support bounded server-side
filters for the fields operators already use when inspecting federated runtime
state and bootstrap security audit trails, while preserving existing
unfiltered `limit` behavior.

## Impacted Modules And Files

- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `packages/host-client/src/event-inspection.ts`
- `packages/host-client/src/event-inspection.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/host-event-inspection.ts`
- `apps/cli/src/host-event-inspection.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added typed Host event list query filters:
  - `category`;
  - `nodeId`;
  - `operatorId`;
  - `statusCode`;
  - repeated `typePrefix`;
  - existing bounded `limit`.
- Host now applies those filters before slicing to the requested limit.
- host-client `listHostEvents` now accepts either the old numeric limit or the
  new query object and serializes repeated `typePrefix` values.
- CLI `entangle host events list` now sends category, node, operator, status,
  and type-prefix filters to Host, then keeps the existing client-side filter
  as a defensive presentation guard.
- CLI `entangle host events watch` now also supports `--operator-id` and
  `--status-code` for live local filtering.
- Shared host-client event filtering now understands `operatorId` and
  `statusCode`, so watch-mode and other in-memory event flows can use the same
  audit-oriented filters.

## Tests Required

Implemented and passed for this slice:

- direct targeted `packages/types/src/index.test.ts`
- direct targeted `packages/host-client/src/index.test.ts`
- direct targeted `packages/host-client/src/event-inspection.test.ts`
- direct targeted `services/host/src/index.test.ts`
- direct targeted `apps/cli/src/host-event-inspection.test.ts`
- package typechecks/lints for touched packages during implementation.

Still required before declaring the whole project complete:

- broader root verification where the environment allows it;
- long-running deployment proof with large enough event history to validate
  operator workflows against real retained traces.

## Migration And Compatibility Notes

Existing clients that call `/v1/events?limit=N` or
`client.listHostEvents(N)` continue to work. New filters are optional and
additive. The list response shape is unchanged.

## Risks And Mitigations

- Risk: server-side filter semantics drift from host-client filter semantics.
  Mitigation: both paths use the same field set and tests cover Host API,
  host-client serialization, and in-memory filtering.
- Risk: repeated `typePrefix` query values are hard to call manually.
  Mitigation: both repeated query params and host-client query-object
  serialization are covered.
- Risk: this is mistaken for durable audit retention.
  Mitigation: this slice improves queryability of the existing persisted trace;
  retention policy, rotation, export, and tamper-evidence remain later security
  hardening.

## Open Questions

- Should Host event storage gain explicit retention policy metadata and export
  checkpoints before production hardening?
- Should event filters eventually support timestamp ranges and exact event
  type in addition to type prefixes?
