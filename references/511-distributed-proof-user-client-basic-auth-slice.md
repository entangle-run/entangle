# Distributed Proof User Client Basic Auth Slice

## Current Repo Truth

The Human Interface Runtime already supports browser-native Basic Auth through
`ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=username:password`, while leaving
`/health` public for liveness checks and keeping the Host bearer token
server-side. The distributed proof kit generated runner env/start scripts, but
did not provide an operator-friendly way to require that Basic Auth on User
Node runner machines.

## Target Model

Physical proof kits that expose User Client endpoints beyond loopback should
make participant-client protection easy to configure. The kit should not put
cleartext credentials on the command line by default, but it should be able to
generate explicit placeholders and fail fast if the operator forgets to supply
credentials before starting User Node runners.

## Impacted Modules/Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--require-user-client-basic-auth` to the distributed proof kit.
- Add `--user-client-basic-auth-env-var <envVar>` so operators can choose the
  source environment variable for generated User Client Basic Auth
  placeholders.
- Validate the supplied env var name before writing or dry-running a kit.
- When required, write
  `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=${ENV_VAR:-REPLACE_WITH_USERNAME_PASSWORD}`
  into generated User Node runner env files.
- Add a generated `start.sh` fail-fast check for User Node runners when the
  placeholder was not replaced.
- Document the generated README step for setting `username:password` on User
  Node runner machines.
- Extend proof-tool smoke coverage for the dry-run summary and invalid env var
  failure path.

## Tests Required

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

No migration is required. Existing proof kits and same-machine demos remain
unchanged unless generated with `--require-user-client-basic-auth`.

## Risks And Mitigations

- Risk: operators assume this is full production identity.
  Mitigation: the docs describe it as proof-kit Basic Auth hardening on top of
  the existing Human Interface Runtime control. Production identity/key custody
  remains separate future work.
- Risk: credentials leak into shell history.
  Mitigation: the preferred path is an env-var placeholder; the kit does not
  add a direct `username:password` flag.
- Risk: User Node runners start with a placeholder and expose a weak endpoint.
  Mitigation: generated `start.sh` exits until the placeholder is replaced.

## Verification

Completed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers: no hits.

## Open Questions

No product question blocks this operational hardening. Production User Client
identity, key custody, session management, and authorization remain separate
work beyond this proof-kit slice.
