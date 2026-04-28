# User Client JSON Read State Slice

## Current Repo Truth

Human Interface Runtime already marked selected conversations as read in the
server-rendered User Client route and emitted signed `read.receipt` messages
when an unread inbound message was present. The dedicated `apps/user-client`
app consumed runtime-local JSON APIs for state, conversation detail, message
publishing, approval decisions, artifact preview, source diffs, and source
candidate review, but opening a thread through the dedicated app did not call a
runtime-local read API.

## Target Model

Studio remains the operator/admin surface. A running User Node owns its Human
Interface Runtime and dedicated User Client, so participant read state and read
receipt behavior must be available through the same runtime-local JSON boundary
as the rest of the User Client workflow.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/runtime-api.test.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`

## Concrete Changes Required

- Add `POST /api/conversations/:conversationId/read` to Human Interface
  Runtime.
- Have that JSON route mark the Host-projected User Node conversation read and
  publish the same best-effort signed `read.receipt` used by the
  server-rendered route when unread inbound history exists.
- Add a dedicated User Client runtime API helper for the JSON read route.
- Have `apps/user-client` mark the selected thread read when it opens a thread
  with unread messages, then refresh state so unread counts converge through
  Host projection.

## Tests Required

- User Client helper test for the new JSON read route.
- Runner Human Interface Runtime test proving the JSON route forwards to the
  Host read endpoint.
- Typecheck and lint for the runner and User Client packages.

## Migration/Compatibility Notes

This is additive. Existing server-rendered User Client behavior is retained.
The JSON route uses the existing Host User Node inbox read contract and does
not introduce a new Host API.

## Risks And Mitigations

- Risk: duplicate read receipts if a client retries while Host projection is
  stale. Mitigation: the runtime only attempts a receipt when the pre-read
  projection reports unread inbound history; Host read state remains the source
  of read-count convergence.
- Risk: a dedicated client hides unread state before Host projection catches
  up. Mitigation: the app refreshes runtime state after a successful read
  request.

## Open Questions

None for this slice.
