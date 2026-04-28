# Direct Host Approval Review API Removal Slice

## Current Repo Truth

After the public quarantine slice, Host and `packages/host-client` still carried
internal mutation contracts for two non-canonical actions:

- `POST /v1/runtimes/:nodeId/approvals`
- `PATCH /v1/runtimes/:nodeId/source-change-candidates/:candidateId/review`

Both routes updated runner-owned runtime state from the Host control plane and
therefore contradicted the signed User Node protocol now used for approval
responses and source-candidate reviews.

## Target Model

Host exposes approval and source-candidate read models. It does not decide
approvals and does not review source candidates on behalf of a graph
participant.

The only canonical approval response path is a signed User Node
`approval.response` A2A message. The only canonical source-candidate review
path is a signed User Node `source_change.review` A2A message handled by the
owning runner, followed by runner-signed observation projection.

## Impacted Modules And Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `packages/host-client/src/event-inspection.ts`
- `packages/host-client/src/event-inspection.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/state.ts`
- `apps/cli/src/host-event-inspection.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/321-signed-source-candidate-review-slice.md`
- `references/322-public-direct-mutation-surface-quarantine-slice.md`
- `wiki/log.md`

## Concrete Changes Required

- Remove runtime approval-decision mutation DTOs from `packages/types`.
- Remove runtime source-candidate review mutation DTOs from `packages/types`.
- Remove Host approval-decision route and state mutation helper.
- Remove Host source-candidate review route and state mutation helper.
- Remove shared host-client methods for those routes.
- Remove `source_change_candidate.reviewed` Host event generation and event
  schema because review is now represented by User Node A2A messages plus
  runner-observed `source_change.ref`.
- Update tests so source apply/publish paths seed already accepted candidate
  state rather than reviewing through Host.

## Tests Required

- Type contract tests for removed mutation DTO imports.
- Host API tests proving approval and source-candidate reads still work and
  source apply still works with accepted candidate state plus approved approval
  records.
- Host-client tests proving read/apply surfaces still work without direct
  approval/review methods.
- CLI/host-client event filter tests proving runtime trace filters no longer
  include the removed Host review event.

## Migration And Compatibility Notes

This is an intentional breaking cleanup before public release. Existing local
scripts that used direct Host approval decisions or source-candidate review must
move to User Node signing commands or the running User Client.

The later cleanup slices removed the direct Host source apply/publish/replay,
artifact restore/promote, and wiki publication mutation paths as well. Their
replacement behavior must remain runner-owned protocol work, not Host
filesystem mutation.

## Risks And Mitigations

- Risk: tests or manual scripts depended on Host-created ad hoc approvals.
  Mitigation: approval requests and responses are now modeled as signed
  participant messages; tests can seed runner approval records or exercise the
  User Node path.
- Risk: losing `source_change_candidate.reviewed` hides review history.
  Mitigation: outbound User Node message history records the signed review, and
  the owning runner publishes updated `source_change.ref` projection.
- Risk: source apply still runs through Host, which is not the final model.
  Mitigation: the apply path is left explicit in the open questions and should
  be replaced only with a dedicated runner-owned command protocol.

## Open Questions

- Should source apply/publish/replay be Host-signed control commands to the
  assigned runner, or User Node messages interpreted by the agent runner under
  Host policy?
- Should historical `source_change_candidate.reviewed` events be migrated out
  of existing local state during the next state-layout migration, or simply
  ignored by current readers?
