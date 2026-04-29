# Approval Approver Enforcement Slice

## Current Repo Truth

Runtime approval records now preserve signed-message lineage for request and
response events. Before this slice, the runner applied a matching
`approval.response` to an approval record without checking whether the response
sender was one of the approval record's configured approver nodes.

## Target Model

An approval response should only transition an approval gate when the sender is
listed in the approval record's approver set. Other matching
`approval.response` messages may still be recorded as conversation traffic, but
they must not approve, reject, close, or fail the gated session.

## Impacted Modules/Files

- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Check `approvalRecord.approverNodeIds` before applying an inbound
  `approval.response`.
- Leave the approval record pending when the sender is not in the approver set.
- Avoid publishing an approval observation for ignored unauthorized responses.
- Preserve the waiting session and awaiting-approval conversation state.

## Tests Required

- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/service.test.ts`
- `pnpm verify`

## Migration/Compatibility Notes

Existing approval records already carry `approverNodeIds`; new enforcement uses
that existing field. Records with an empty approver set now behave safely by
not allowing arbitrary approval responses to transition the gate.

## Risks And Mitigations

- Risk: old manually written approval records without approver ids no longer
  accept responses.
  Mitigation: approval request creation paths populate approver ids, and a
  missing approver set is safer as a denied transition than as implicit
  universal approval.
- Risk: unauthorized responses still update conversation last-message metadata.
  Mitigation: this slice intentionally blocks the state transition; fuller
  audit/finding emission can be added as a later policy-observability slice.

## Open Questions

- A later signer-hardening slice should compare the Nostr event signer pubkey
  against the message `fromPubkey` and configured User Node identity, not only
  the message sender node id.
