# CLI User Client Endpoints Slice

## Current Repo Truth

User Nodes now run through assignable `human_interface` runtimes. Those
runtimes expose a User Client endpoint and report `clientUrl` through signed
runtime observations, which Host projects in the federation snapshot.

Studio already shows an operator-side open action when a projected User Client
URL exists, and the generic `host projection --summary` output includes runtime
`clientUrl` values. The CLI did not yet provide a User Node-focused command that
joins User Node identity state with the projected Human Interface Runtime URL.

## Target Model

Studio remains the graph/admin control room. The human participant opens the
User Client served by the running User Node runtime. CLI should make that
runtime endpoint discoverable without requiring manual projection filtering.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a CLI projection helper that joins active User Node identity records with
  matching Host runtime projection records.
- Add `entangle user-nodes clients` to list User Client endpoints, runtime
  assignment, runner placement, observed state, and identity status.
- Keep output projection-only: the command talks to Host and does not directly
  reach into runners.

## Tests Required

- CLI helper test for joining User Node identities and projected Human
  Interface Runtime records.
- CLI typecheck and lint.

## Migration/Compatibility Notes

This is additive. Existing `user-nodes list`, `host projection`, and `inbox`
commands remain unchanged.

## Risks And Mitigations

- Risk: users confuse Studio with the User Client.
  Mitigation: the command is explicitly under `user-nodes` and reports
  User Node runtime endpoints, not Studio routes.
- Risk: unassigned User Nodes disappear from endpoint discovery.
  Mitigation: the command lists every active User Node and marks nodes without
  a projected runtime as `unassigned`.

## Open Questions

No open product question blocks this slice.
