# User Client Source Candidate Review Slice

## Current Repo Truth

User Nodes can run through the runner-served Human Interface Runtime. The User
Client already exposes conversation state, signed message publishing, signed
approval responses, artifact references, bounded artifact previews, projected
wiki references, projected source-change summaries, projected diff excerpts,
and a fallback source-change diff page.

Host, CLI, and Studio already support audited source-change candidate review
mutations for `accepted`, `rejected`, and `superseded` decisions. Before this
slice, the User Client could inspect the candidate evidence but could not mark
the candidate itself as accepted or rejected from the running human-node
surface.

## Target Model

The running User Client should let the human participant review source-change
candidate evidence without using Studio as the user-node client.

For this slice, the action is intentionally Host-mediated: the Human Interface
Runtime submits the existing Host source-candidate review mutation and sets
`reviewedBy` to the running User Node id. It does not apply or publish source
history. Source application and publication remain separate, policy-gated
operations and can still be requested through signed approval flows.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/258-human-interface-runtime-realignment-plan.md`

## Concrete Changes

- Added a Human Interface Runtime helper for
  `PATCH /v1/runtimes/:nodeId/source-change-candidates/:candidateId/review`.
- Rendered source-candidate accept/reject controls on approval-resource cards
  when the request targets a `source_change_candidate`.
- Rendered the same controls on the source diff review page.
- The review form preserves runtime node id, candidate id, selected
  conversation id, optional reason, and accepted/rejected status.
- The server-side route stamps review requests with
  `reviewedBy: <running user node id>`.
- User Client state fingerprints now include source-change candidate status so
  live refresh can detect review status changes.
- Runner tests now prove the User Client renders the controls and sends the
  Host review mutation with the User Node id.

## Tests Required

- Runner typecheck.
- Runner Human Interface Runtime test covering source review form rendering and
  Host PATCH payload.
- Runner full `index.test.ts`.
- Runner lint.
- `git diff --check`.

## Migration And Compatibility Notes

No shared Host API contract changed. The User Client uses an existing Host
mutation route and existing source-change review schema.

Existing source-change review records remain valid. Existing User Clients or
tests that ignore the new form controls remain compatible.

This does not make source application automatic. A candidate marked accepted
still requires the existing policy gates before source-history application or
publication.

## Risks And Mitigations

- Risk: conflating source review with approval to apply source.
  Mitigation: the UI labels the action as candidate review only and does not
  call the apply or publish routes.
- Risk: treating a Host-mediated review as the final user-node signing model.
  Mitigation: the docs explicitly preserve this as a Host-mediated bridge. A
  future projection/object-backed source review protocol can turn this into a
  signed User Node event if needed.
- Risk: stale projection leaves the form visible after review.
  Mitigation: Host enforces single review of pending candidates, and the live
  refresh fingerprint now includes source-change status.

## Open Questions

- Should final source-candidate review be expressed as a signed User Node A2A
  event and projected into the Host review record?
- Should source review support superseding from the User Client, or remain an
  operator-only action in Studio/CLI?
- Should the eventual bundled User Client separate review, apply, and publish
  into distinct panels with policy status before any side effect can run?
