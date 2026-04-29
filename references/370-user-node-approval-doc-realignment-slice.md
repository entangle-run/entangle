# User Node Approval Documentation Realignment Slice

## Current Repo Truth

The public direct Host approval/review mutation paths were quarantined and then
removed by the direct API removal cleanup. User-facing approval responses and
source-change reviews now flow through signed User Node message paths. A few
active User Node and surface specs still described old operator-side approval
mutation work as if it remained current.

## Target Model

The active documentation must match the implemented actor boundary:

- Studio is the operator surface for inspection, assignment, topology, policy,
  and observability.
- User Client and CLI User Node commands are the participant surfaces for
  signed approval responses and source-change reviews.
- Remaining User Node gaps are richer review workflows and production key
  custody, not removal of already-deleted Host approval/review mutation APIs.

## Impacted Modules/Files

- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace stale descriptions of Host-mediated source review with signed
  `source_change.review` User Node messaging.
- Remove stale "Studio/Host approval mutation remains" language from active
  current-state sections.
- Reframe remaining User Node work around richer review workflows and
  production key custody.

## Tests Required

- Documentation drift search for stale approval/review mutation language in the
  active references and wiki.
- `git diff --check`.

## Migration/Compatibility Notes

This is a documentation realignment only. It does not change public APIs or
runtime behavior.

## Risks And Mitigations

- Risk: historical implementation records become rewritten.
  Mitigation: the cleanup changes only active specs and index/status files;
  historical slice records remain intact.

## Open Questions

- None.
