# Distributed Proof CLI User Client Health Command Slice

## Current Repo Truth

The distributed proof verifier and generated proof profiles already require
User Client health checks by default. CLI also supports
`entangle user-nodes clients --check-health`. Generated
`operator/commands.sh` still listed User Client endpoints without using the
CLI-side health probe.

## Target Model

Generated proof kits should guide operators through the same Host-projected
User Client health check that the CLI now supports, before the scripted User
Node task is sent. This keeps manual proof execution aligned with the verifier
without making Host or runner state depend on the probe.

## Impacted Modules/Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Change generated `operator/commands.sh` to run
  `user-nodes clients --summary --check-health`.
- Print the health-check command in proof-kit dry-run output.
- Extend proof-tool smoke expectations so the dry-run proves the operator
  health command remains present.

## Tests Required

- Node syntax checks for the proof kit and proof-tool smoke scripts.
- `pnpm ops:smoke-distributed-proof-tools`.
- Product naming check.
- Diff whitespace check.

## Migration/Compatibility Notes

No migration is required. Existing generated kits are unchanged; newly
generated kits include the health-check flag in operator commands.

## Risks And Mitigations

- Risk: a User Client is not reachable and operators think the proof script
  failed early.
  Mitigation: CLI health checks serialize failures into `clientHealth` records
  and do not throw for dead endpoints.
- Risk: generated dry-runs overclaim full proof execution.
  Mitigation: the dry-run line is labeled as an operator command summary, not
  as proof success.

## Verification

Completed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers: no hits.

## Open Questions

No product question blocks this proof-kit usability tightening.
