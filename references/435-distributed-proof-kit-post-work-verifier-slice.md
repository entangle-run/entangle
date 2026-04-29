# Distributed Proof Kit Post Work Verifier Slice

## Current Repo Truth

The distributed proof verifier supports `--require-artifact-evidence`, and the
docs tell operators to rerun the verifier with that flag after the agent has
produced work. Before this slice, generated proof kits only wrote
`operator/commands.sh`, which ran the immediate topology/conversation verifier.
The post-work artifact/source/wiki evidence check remained a manual command
that operators had to reconstruct from docs.

## Target Model

The proof kit should generate repeatable operator scripts for both proof
moments:

- immediate topology/runtime/conversation verification;
- post-work artifact/source/wiki evidence verification.

The generated scripts should use the same proof profile, Host URL override, and
optional relay/git health settings as the main operator command path.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/428-distributed-proof-artifact-evidence-verifier-slice.md`
- `references/434-distributed-proof-kit-relay-health-profile-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Generated kits now write `operator/verify-topology.sh`, which repeats the
  topology/runtime/conversation verifier command.
- Generated kits now write `operator/verify-artifacts.sh`, which runs the same
  verifier with `--require-artifact-evidence`.
- `operator/commands.sh` now delegates its final verification step to
  `operator/verify-topology.sh`.
- The generated README documents the post-work verifier step and the new files.
- Dry-run output now prints both the topology verifier command and the artifact
  verifier command.
- The distributed proof tool smoke now asserts that generated custom-profile
  dry-run output includes the artifact evidence verifier flag.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

Existing proof kit usage still works: `operator/commands.sh` remains the
entrypoint for trust, assignment, User Node task publication, projection
inspection, and immediate verification. The new verifier scripts are additive
and can be rerun independently from the operator machine.

## Risks And Mitigations

- Risk: operators run `verify-artifacts.sh` before the agent has published
  work.
  Mitigation: generated README and public docs describe it as a post-work step,
  and the verifier's failure is explicit when evidence is missing.
- Risk: generated verifier scripts drift from `commands.sh`.
  Mitigation: all generated verifier commands now come from the same
  `buildVerifierCommand` helper.

## Open Questions

- Should the kit eventually generate a polling post-work verifier that waits
  for artifact/source/wiki evidence instead of failing immediately?
