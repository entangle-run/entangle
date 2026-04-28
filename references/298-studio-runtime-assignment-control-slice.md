# Studio Runtime Assignment Control Slice

## Current Repo Truth

Host already owns runner registry and runtime assignment APIs. CLI can trust
runners and offer/revoke assignments. Studio showed federation projection,
User Node runtime summaries, and User Client links, but did not yet provide an
operator control to offer a node assignment to a runner from the Federation
panel.

## Target Model

Studio is the operator control room. It should let an admin assign graph nodes,
including User Nodes, to trusted runners through Host. The assignment remains a
Host-signed control-plane action; Studio never talks directly to a runner.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-assignment-control.ts`
- `apps/studio/src/runtime-assignment-control.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add Studio helper functions for assignment node options, trusted runner
  options, draft normalization, and assignment request validation.
- Add a Federation panel assignment form that selects a graph node, a trusted
  runner, and a lease duration.
- Submit through `host-client.offerAssignment()` and refresh the Host overview
  after success.

## Tests Required

- Studio helper tests for option projection, stale draft normalization, and
  assignment request validation.
- Studio typecheck and lint.

## Migration/Compatibility Notes

This is additive. Existing CLI assignment commands and Host assignment APIs are
unchanged.

## Risks And Mitigations

- Risk: Studio creates a runner shortcut.
  Mitigation: the form only calls Host assignment APIs over `host-client`.
- Risk: assignment controls are offered for revoked/pending runners.
  Mitigation: the runner selector only lists Host-projected trusted runners.

## Open Questions

No open product question blocks this slice. Revoke/reassign workflows can build
on the same Federation panel once the first offer path is proven.
