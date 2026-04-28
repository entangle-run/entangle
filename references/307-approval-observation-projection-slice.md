# Approval Observation Projection Slice

## Current Repo Truth

The observe protocol already declared `approval.updated`, but the runner did
not publish approval lifecycle observations and Host did not reduce them into
observed approval activity records. Approval trace events and approval status
counts were therefore still mostly produced by Host reading runner-local
approval files during same-workstation synchronization.

That left approval state behind session, conversation, and turn observations in
the federated projection path.

## Target Model

Runner-owned approval lifecycle changes should publish signed
`approval.updated` observations carrying the bounded full approval record.
Host should validate the observation against the registered runner, reduce it
into observed approval activity, emit the same typed approval trace event, and
let projected session summaries/details count approvals without reading runner
disk.

## Impacted Modules/Files

- `packages/types/src/protocol/observe.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/index.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Extend `approval.updated` observe payloads with an optional full
  `ApprovalRecord`.
- Add Host `recordApprovalUpdatedObservation()` reducer coverage.
- Wire `approval.updated` into the Host federated observation dispatcher.
- Add runner observation publisher support for approval records.
- Publish approval observations when engine approval request directives create
  pending approval gates.
- Publish approval observations when approval responses transition an approval.
- Extend Host and runner tests to cover approval observation projection.

## Tests Required

- `packages/types` schema tests and typecheck.
- Host observation reducer/session projection tests.
- Runner service tests for approval request and response publication.
- Host/runner/type lint.
- Federated process-runner smoke.

## Migration/Compatibility Notes

The full approval record is optional in the observe payload so older events can
still parse, but Host only records approval activity when the full record is
present. Existing filesystem-imported approval activity remains compatible and
is still marked as `runtime_filesystem`.

## Risks And Mitigations

- Risk: an inconsistent approval payload could attribute an approval to the
  wrong node.
  Mitigation: Host rejects approval observations whose full record graph id or
  requester node id does not match the outer observation payload.
- Risk: observation delivery failure could break runner-local approval state.
  Mitigation: runner approval observation publishing is best-effort and follows
  the existing "do not corrupt local state on observation failure" pattern.

## Open Questions

- Should `approval.updated` become non-optional for the full approval record
  after all runner versions emit it, or remain optional for compatibility?
