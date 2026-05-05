# Studio User Client Boundary Audit

## Current Repo Truth

The dedicated User Client is now the participant surface for running User
Nodes. It consumes the Human Interface Runtime JSON APIs for conversation
state, selected-thread message publishing, approval responses, artifact
preview/history/diff, source-change diff/file preview, source-candidate review,
wiki publication, wiki page upsert, artifact restore, artifact source-change
proposal, and source-history publication/reconcile actions.

Studio exposes operator/admin state: Host status, graph and resource editing,
runners, assignments, runtime inspection, sessions, approvals, turns,
artifacts, memory, source/source-history, wiki refs, event traces, transport
health, and User Node runtime/Client links. Studio also states in-app that user
task launch belongs to User Client or CLI signed User Node surfaces.

`references/222-current-state-codebase-audit.md` still assigned participant
chat ownership to Studio. That was stale against the current code and product
boundary.

## Target Model

Studio is the operator/admin console. It should show User Node identities,
runtime placement, projected conversation counts, pending approval counts, and
links to open the running User Client, but it should not become the primary
User Node chat client.

The User Client exposed by the Human Interface Runtime is the human
participant UI. CLI remains the headless participant and operator surface over
the same Host/user-node boundaries.

## Impacted Modules/Files

- `references/222-current-state-codebase-audit.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Remove stale wording that assigns full participant chat composition to
  Studio.
- Describe the current boundary: Studio operator/admin, User Client human
  participant, CLI headless participant/operator.
- Keep remaining work focused on richer User Client review flows, production
  key custody, and keeping CLI/User Client behavior aligned.

## Tests Required

- `pnpm ops:check-product-naming`
- `git diff --check`

No runtime code changed in this audit slice.

## Migration/Compatibility Notes

None. This is a documentation realignment with the current code and product
direction.

## Risks And Mitigations

- Risk: operators expect Studio to hold User Node keys and chat state.
  Mitigation: canonical docs now point participant interaction to the
  Human Interface Runtime/User Client and keep Studio as the operator/admin
  view.
- Risk: CLI and User Client diverge.
  Mitigation: the audit keeps CLI as the headless surface over the same Host
  and user-node contracts.

## Open Questions

None for this slice.
