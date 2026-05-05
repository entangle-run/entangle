# User Client Approval Turn Correlation Slice

## Current Repo Truth

The running User Client can publish signed `approval.response` messages through
the Human Interface Runtime. Those responses preserved the selected approval
id, parent message id, conversation id, session id, and target node id, but the
User Client helper did not include the inbound approval message's `turnId` in
the publish request. Host-side message construction therefore generated a new
turn id for approval responses that came from the User Client, even though CLI
from-message approval responses already preserve the original turn id.

## Target Model

Human User Node responses should keep the same conversation/session/turn
correlation as the request they answer. Approval responses are graph messages,
not detached operator mutations, so their signed A2A record should point back
to the originating turn whenever the User Client has that context.

## Impacted Modules/Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `turnId: input.message.turnId` when `publishApprovalResponse` builds the
  User Client publish request.
- Add a User Client API helper test proving approval responses preserve the
  inbound approval request's turn id.
- Extend the federated process smoke's synthetic approval path so the User
  Client JSON request and Host inbox record both preserve that turn id.
- Update canonical docs to record that User Client approval responses now keep
  turn-level correlation with the agent request.

## Tests Required

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner:fake-external-http`
- `pnpm ops:check-product-naming`
- search for old local product identity markers across the repository
- `git diff --check`

## Migration/Compatibility Notes

The change only adds a correlation field that the Host API already accepts.
Existing responses without a turn id still work through Host-side generated
turn ids, but the User Client now sends the better available context.

## Risks And Mitigations

- Risk: stale or malformed inbound messages could provide an invalid turn id.
  Mitigation: inbound messages are parsed as `UserNodeMessageRecord`, and Host
  publish validation still validates the final request.
- Risk: approval responses from different surfaces diverge.
  Mitigation: this aligns the User Client with CLI from-message behavior.

## Open Questions

None for this slice.
