# Distributed Proof Kit JUnit Script Slice

## Current Repo Truth

The distributed proof verifier supports `--junit <file>` and the proof-tool
smoke verifies that direct verifier path. Generated proof kits already include
repeatable `operator/verify-topology.sh` and `operator/verify-artifacts.sh`
scripts, but those scripts did not expose the JUnit report path.

## Target Model

Generated proof-kit verifier scripts should be usable as CI/operator proof
commands without editing them. When `ENTANGLE_PROOF_JUNIT_DIR` is set, the
topology verifier should write `topology.xml` and the post-work verifier should
write `artifacts.xml` into that directory. When the variable is unset, generated
scripts should behave exactly as before.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add an optional `ENTANGLE_PROOF_JUNIT_DIR` shell expansion to generated
  verifier commands.
- Use `topology.xml` for `operator/verify-topology.sh`.
- Use `artifacts.xml` for `operator/verify-artifacts.sh`.
- Keep dry-run output explicit enough for the smoke to guard both generated
  report paths.
- Document the opt-in operator behavior.

## Tests Required

- Proof-kit syntax check.
- Proof-tool smoke proving generated dry-run commands include both JUnit report
  paths.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No generated proof profile changes are required. Existing generated proof-kit
commands remain compatible because the new JUnit arguments expand only when
`ENTANGLE_PROOF_JUNIT_DIR` is set.

## Risks And Mitigations

- Risk: generated shell commands become harder to read. Mitigation: keep the
  optional JUnit expansion to one standard environment variable and document it
  in the proof-kit README and root README.
- Risk: report files collide between topology and post-work verification.
  Mitigation: use separate deterministic filenames.

## Open Questions

Future infrastructure-backed orchestration can choose a default artifact
directory. This slice only makes generated proof-kit scripts CI-report capable
without imposing an output location.

## Verification

Completed in this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over proof scripts and updated docs
